'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { sendAuthEmail } from '@/lib/email/sender'
import { calculateBmi, resolveAvatarState } from '@/lib/profiles/avatar'
import {
  activityLevels,
  experienceLevels,
  fitnessGoals,
  type ActivityLevel,
  type ExperienceLevel,
  type FitnessProfile,
} from '@/lib/profiles/types'
import { boundedNumber, multi, oneOf, text, type FieldErrors } from '@/lib/profiles/validate'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export type SettingsState = {
  ok?: string
  error?: string
  fieldErrors?: FieldErrors
}

function getOrigin() {
  return process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
}

/**
 * Every action edits the signed-in user's own row, so they all start the same
 * way: resolve the client, resolve the user, bail out with a message rather
 * than a thrown error so the panel can render it inline.
 */
async function requireUser() {
  const supabase = createServerSupabaseClient()
  if (!supabase) {
    return { error: 'Supabase is not configured.' as const }
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login?message=Please%20sign%20in%20to%20continue')
  }

  return { supabase, user }
}

/**
 * The avatar and BMI are derived values. Recomputing them from the stored row
 * after every edit means a change to weight or experience on one panel can
 * never leave the figure showing stale proportions.
 */
async function syncDerivedFields(
  supabase: NonNullable<ReturnType<typeof createServerSupabaseClient>>,
  userId: string,
  patch: Partial<FitnessProfile>,
  { snapshot }: { snapshot?: string } = {}
): Promise<SettingsState> {
  const { data: current } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()

  const merged = { ...(current ?? {}), ...patch } as FitnessProfile
  const bmi = calculateBmi(Number(merged.height_cm), Number(merged.weight_kg))
  const avatarState = resolveAvatarState(bmi, merged.experience_level)

  const { error } = await supabase
    .from('profiles')
    .update({
      ...patch,
      bmi,
      avatar_state: avatarState,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId)

  if (error) return { error: error.message }

  if (snapshot) {
    // Body-metric history drives the progress chart; only record a point when
    // the numbers behind it actually moved.
    await supabase.from('progress').insert({
      user_id: userId,
      weight_kg: merged.weight_kg,
      bmi,
      experience_level: merged.experience_level,
      avatar_state: avatarState,
      note: snapshot,
    })
  }

  revalidatePath('/settings')
  revalidatePath('/dashboard')
  return {}
}

// ---------------------------------------------------------------------------
// Personal details
// ---------------------------------------------------------------------------
export async function updatePersonalDetails(
  _previous: SettingsState,
  formData: FormData
): Promise<SettingsState> {
  const session = await requireUser()
  if ('error' in session) return session
  const { supabase, user } = session

  const fieldErrors: FieldErrors = {}
  const fullName = text(formData, 'full_name')
  if (!fullName) fieldErrors.full_name = 'Your name is required.'
  const age = boundedNumber(formData, 'age', fieldErrors)

  if (Object.keys(fieldErrors).length) {
    return { error: 'Please fix the highlighted fields.', fieldErrors }
  }

  const result = await syncDerivedFields(supabase, user.id, {
    full_name: fullName,
    age,
    gender: text(formData, 'gender') || null,
  })

  return result.error ? result : { ok: 'Personal details saved.' }
}

// ---------------------------------------------------------------------------
// Body metrics
// ---------------------------------------------------------------------------
export async function updateBodyMetrics(
  _previous: SettingsState,
  formData: FormData
): Promise<SettingsState> {
  const session = await requireUser()
  if ('error' in session) return session
  const { supabase, user } = session

  const fieldErrors: FieldErrors = {}
  const heightCm = boundedNumber(formData, 'height_cm', fieldErrors)
  const weightKg = boundedNumber(formData, 'weight_kg', fieldErrors)

  if (Object.keys(fieldErrors).length) {
    return { error: 'Please fix the highlighted fields.', fieldErrors }
  }

  const result = await syncDerivedFields(
    supabase,
    user.id,
    { height_cm: heightCm, weight_kg: weightKg },
    { snapshot: 'Metrics updated from settings' }
  )

  return result.error ? result : { ok: 'Body metrics saved. Your avatar has been reshaped.' }
}

// ---------------------------------------------------------------------------
// Training setup
// ---------------------------------------------------------------------------
export async function updateTrainingSetup(
  _previous: SettingsState,
  formData: FormData
): Promise<SettingsState> {
  const session = await requireUser()
  if ('error' in session) return session
  const { supabase, user } = session

  const fieldErrors: FieldErrors = {}
  const goal = oneOf(formData, 'goal', fitnessGoals, 'Goal', fieldErrors)
  const fitnessLevel = oneOf(formData, 'fitness_level', activityLevels, 'Activity level', fieldErrors)
  const experienceLevel = oneOf(formData, 'experience_level', experienceLevels, 'Experience', fieldErrors)
  const days = boundedNumber(formData, 'available_days_per_week', fieldErrors)
  const minutes = boundedNumber(formData, 'preferred_session_minutes', fieldErrors)

  if (Object.keys(fieldErrors).length) {
    return { error: 'Please fix the highlighted fields.', fieldErrors }
  }

  const result = await syncDerivedFields(supabase, user.id, {
    goal,
    fitness_level: fitnessLevel as ActivityLevel,
    experience_level: experienceLevel as ExperienceLevel,
    available_days_per_week: days,
    preferred_session_minutes: minutes,
    equipment: multi(formData, 'equipment'),
    workout_preferences: multi(formData, 'workout_preferences'),
    limitations: text(formData, 'limitations') || null,
  })

  return result.error
    ? result
    : { ok: 'Training setup saved. Your next generated plan will use it.' }
}

// ---------------------------------------------------------------------------
// Profile photo
// ---------------------------------------------------------------------------

/**
 * Records a photo that the browser has already uploaded to the `avatars`
 * bucket. The upload itself runs client-side so the image bytes never pass
 * through the server; storage RLS confines each user to their own folder.
 */
export async function saveProfilePhoto(url: string): Promise<SettingsState> {
  const session = await requireUser()
  if ('error' in session) return session
  const { supabase, user } = session

  const trimmed = url.trim()
  if (!trimmed) return { error: 'No photo was uploaded.' }

  // Only accept a URL inside this project's avatars bucket, under this user's
  // own folder. A client could otherwise post any URL it liked.
  const expectedPrefix = `${process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''}/storage/v1/object/public/avatars/${user.id}/`
  if (!trimmed.startsWith(expectedPrefix)) {
    return { error: 'That photo location is not valid.' }
  }

  const { error } = await supabase
    .from('profiles')
    .update({ avatar_url: trimmed, updated_at: new Date().toISOString() })
    .eq('id', user.id)

  if (error) return { error: error.message }

  revalidatePath('/settings')
  revalidatePath('/dashboard')
  return { ok: 'Profile photo updated.' }
}

export async function removeProfilePhoto(): Promise<SettingsState> {
  const session = await requireUser()
  if ('error' in session) return session
  const { supabase, user } = session

  const { error } = await supabase
    .from('profiles')
    .update({ avatar_url: null, updated_at: new Date().toISOString() })
    .eq('id', user.id)

  if (error) return { error: error.message }

  revalidatePath('/settings')
  revalidatePath('/dashboard')
  return { ok: 'Profile photo removed.' }
}

// ---------------------------------------------------------------------------
// Email address
// ---------------------------------------------------------------------------
export async function updateEmailAddress(
  _previous: SettingsState,
  formData: FormData
): Promise<SettingsState> {
  const session = await requireUser()
  if ('error' in session) return session
  const { user } = session

  const email = text(formData, 'email').toLowerCase()
  if (!email) return { fieldErrors: { email: 'Enter an email address.' }, error: 'Enter an email address.' }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return { fieldErrors: { email: 'That does not look like an email address.' }, error: 'Please fix the highlighted field.' }
  }
  if (email === (user.email ?? '').toLowerCase()) {
    return { fieldErrors: { email: 'That is already your email address.' }, error: 'Nothing to change.' }
  }

  const admin = getSupabaseAdmin()
  if (!admin) return { error: 'Email changes need SUPABASE_SERVICE_ROLE_KEY configured.' }

  // Kynetic sends its own auth mail, so generate the confirmation link here
  // rather than relying on Supabase's built-in mailer.
  const { data, error } = await admin.auth.admin.generateLink({
    type: 'email_change_new',
    email: user.email ?? '',
    newEmail: email,
    options: { redirectTo: `${getOrigin()}/auth/callback?next=/settings` },
  })

  if (error || !data.properties?.action_link) {
    return { error: error?.message ?? 'Could not start the email change.' }
  }

  await sendAuthEmail(email, 'email_change', data.properties.action_link)

  return { ok: `Confirmation sent to ${email}. Your address changes once you click that link.` }
}

// ---------------------------------------------------------------------------
// Password
// ---------------------------------------------------------------------------
export async function changePassword(
  _previous: SettingsState,
  formData: FormData
): Promise<SettingsState> {
  const session = await requireUser()
  if ('error' in session) return session
  const { supabase, user } = session

  const current = text(formData, 'current_password')
  const next = text(formData, 'new_password')
  const confirm = text(formData, 'confirm_password')

  const fieldErrors: FieldErrors = {}
  if (!current) fieldErrors.current_password = 'Enter your current password.'
  if (next.length < 8) fieldErrors.new_password = 'Use at least 8 characters.'
  if (next !== confirm) fieldErrors.confirm_password = 'The two passwords do not match.'
  if (current && next && current === next) {
    fieldErrors.new_password = 'Choose a password you have not used here before.'
  }

  if (Object.keys(fieldErrors).length) {
    return { error: 'Please fix the highlighted fields.', fieldErrors }
  }

  // Re-authenticate before changing the password. Without this, anyone who
  // reaches an unattended signed-in browser could take the account over.
  const { error: reauthError } = await supabase.auth.signInWithPassword({
    email: user.email ?? '',
    password: current,
  })

  if (reauthError) {
    return {
      error: 'That current password is not right.',
      fieldErrors: { current_password: 'Incorrect password.' },
    }
  }

  const { error } = await supabase.auth.updateUser({ password: next })
  if (error) return { error: error.message }

  return { ok: 'Password updated.' }
}

/** For accounts created through Google, which have no password to confirm. */
export async function sendPasswordResetLink(
  _previous: SettingsState,
  _formData: FormData
): Promise<SettingsState> {
  const session = await requireUser()
  if ('error' in session) return session
  const { user } = session

  const admin = getSupabaseAdmin()
  if (!admin) return { error: 'Password links need SUPABASE_SERVICE_ROLE_KEY configured.' }
  if (!user.email) return { error: 'Your account has no email address on file.' }

  const { data, error } = await admin.auth.admin.generateLink({
    type: 'recovery',
    email: user.email,
    options: { redirectTo: `${getOrigin()}/auth/callback?next=/settings` },
  })

  if (error || !data.properties?.action_link) {
    return { error: error?.message ?? 'Could not create a reset link.' }
  }

  await sendAuthEmail(user.email, 'recovery', data.properties.action_link)
  return { ok: `Reset link sent to ${user.email}.` }
}

// ---------------------------------------------------------------------------
// Sessions and account removal
// ---------------------------------------------------------------------------
export async function signOutEverywhere() {
  const supabase = createServerSupabaseClient()
  if (supabase) {
    await supabase.auth.signOut({ scope: 'global' })
  }
  redirect('/auth/login?message=Signed%20out%20on%20all%20devices.')
}

export async function deleteAccount(
  _previous: SettingsState,
  formData: FormData
): Promise<SettingsState> {
  const session = await requireUser()
  if ('error' in session) return session
  const { supabase, user } = session

  if (text(formData, 'confirm') !== 'DELETE') {
    return {
      error: 'Type DELETE to confirm.',
      fieldErrors: { confirm: 'Type DELETE exactly, in capitals.' },
    }
  }

  const admin = getSupabaseAdmin()
  if (!admin) return { error: 'Account deletion needs SUPABASE_SERVICE_ROLE_KEY configured.' }

  // Profiles, plans, sessions, feedback and progress all cascade from
  // auth.users, so removing the auth row removes everything with it.
  const { error } = await admin.auth.admin.deleteUser(user.id)
  if (error) return { error: error.message }

  await supabase.auth.signOut()
  redirect('/?message=Your%20account%20and%20all%20its%20data%20have%20been%20deleted.')
}
