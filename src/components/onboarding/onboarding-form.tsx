'use client'

import { useEffect, useMemo, useState } from 'react'
import { useFormState, useFormStatus } from 'react-dom'
import { AlertCircle, ArrowLeft, ArrowRight, Check, Loader2 } from 'lucide-react'

import { saveOnboardingProfile, type OnboardingState } from '@/app/onboarding/actions'
import { calculateBmi, getBmiBucket } from '@/lib/profiles/avatar'
import {
  activityLevels,
  experienceLevels,
  fitnessGoals,
  type FitnessProfile,
} from '@/lib/profiles/types'

const EQUIPMENT = [
  'Dumbbells',
  'Barbell',
  'Kettlebells',
  'Resistance bands',
  'Pull-up bar',
  'Bench',
  'Machines',
  'Cardio machine',
]

const PREFERENCES = [
  'Strength',
  'Hypertrophy',
  'HIIT',
  'Low impact',
  'Mobility',
  'Home workouts',
  'Gym workouts',
]

const ACTIVITY_HELP: Record<string, string> = {
  sedentary: 'Mostly sitting, little deliberate movement',
  light: 'Light activity or walking most days',
  moderate: 'Regular exercise a few times a week',
  high: 'Training hard most days of the week',
  athlete: 'Structured training, competing or close to it',
}

const EXPERIENCE_HELP: Record<string, string> = {
  none: 'Never trained with weights',
  beginner: 'Under a year of consistent training',
  intermediate: 'One to three years of training',
  experienced: 'Three or more years of consistent training',
}

const STEPS = ['About you', 'Body metrics', 'Goal & experience', 'Training setup', 'Health & review']

/** Which step owns each field, so a server error can send the user back to it. */
const FIELD_STEP: Record<string, number> = {
  full_name: 0,
  age: 0,
  gender: 0,
  height_cm: 1,
  weight_kg: 1,
  goal: 2,
  fitness_level: 2,
  experience_level: 2,
  available_days_per_week: 3,
  preferred_session_minutes: 3,
  limitations: 4,
}

type Props = {
  profile: Partial<FitnessProfile> | null
  email: string | null
}

export function OnboardingForm({ profile, email }: Props) {
  const [state, formAction] = useFormState<OnboardingState, FormData>(saveOnboardingProfile, {})
  const [step, setStep] = useState(0)

  // Local mirrors of the two metric fields so BMI can update as you type.
  const [height, setHeight] = useState(profile?.height_cm ? String(profile.height_cm) : '')
  const [weight, setWeight] = useState(profile?.weight_kg ? String(profile.weight_kg) : '')

  const bmi = useMemo(() => calculateBmi(Number(height), Number(weight)), [height, weight])
  const isEditing = Boolean(profile?.onboarding_completed)

  // Validation runs on the server, so an error can belong to a step the user
  // has already moved past. Jump back to the first one that failed, otherwise
  // the message points at fields they cannot see.
  useEffect(() => {
    const failed = Object.keys(state.fieldErrors ?? {})
    if (!failed.length) return

    const earliest = Math.min(...failed.map((field) => FIELD_STEP[field] ?? 0))
    setStep(earliest)
  }, [state.fieldErrors])

  const fieldError = (name: string) => state.fieldErrors?.[name]

  return (
    <div className="mx-auto w-full max-w-2xl">
      {/* Progress ---------------------------------------------------------- */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium">{STEPS[step]}</p>
          <p className="text-sm text-muted-foreground tabular-nums">
            {step + 1} / {STEPS.length}
          </p>
        </div>
        <div className="mt-3 flex gap-1.5">
          {STEPS.map((label, index) => (
            <div
              key={label}
              className={`h-1 flex-1 rounded-full transition-colors duration-300 ${
                index <= step ? 'bg-primary' : 'bg-muted'
              }`}
            />
          ))}
        </div>
      </div>

      {/*
        noValidate is required, not cosmetic. Steps that are not on screen are
        hidden with CSS but remain in the DOM, and the browser still validates
        them on submit. An out-of-range value on a hidden step would make the
        browser try to focus an unfocusable element, silently blocking the
        submit with no visible error. All validation is done server side in
        saveOnboardingProfile, which reports errors per field instead.
      */}
      <form action={formAction} noValidate className="rounded-2xl border border-border bg-card">
        {/*
          Every step stays mounted and is hidden with CSS rather than
          conditionally rendered. A native form only submits fields that are in
          the DOM, so unmounting earlier steps would silently drop their values.
        */}
        <div className="px-6 py-7 sm:px-8">
          <Step active={step === 0}>
            <Heading
              title={isEditing ? 'Update your details' : 'Tell us about you'}
              description="We use this to size your training and keep it appropriate for you."
            />
            <Field label="Full name" error={fieldError('full_name')}>
              <input
                name="full_name"
                defaultValue={profile?.full_name ?? ''}
                autoComplete="name"
                className={inputClass(fieldError('full_name'))}
                placeholder="Your name"
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Age" error={fieldError('age')}>
                <input
                  name="age"
                  type="number"
                  min={13}
                  max={100}
                  defaultValue={profile?.age ?? ''}
                  className={inputClass(fieldError('age'))}
                  placeholder="25"
                />
              </Field>
              <Field label="Gender" hint="Optional">
                <select
                  name="gender"
                  defaultValue={profile?.gender ?? 'prefer-not-to-say'}
                  className={inputClass()}
                >
                  <option value="female">Female</option>
                  <option value="male">Male</option>
                  <option value="non-binary">Non-binary</option>
                  <option value="prefer-not-to-say">Prefer not to say</option>
                </select>
              </Field>
            </div>
            {email ? (
              <p className="text-sm text-muted-foreground">
                Signed in as <span className="font-medium text-foreground">{email}</span>
              </p>
            ) : null}
          </Step>

          <Step active={step === 1}>
            <Heading
              title="Your body metrics"
              description="These set your BMI and drive the proportions of your 3D avatar."
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Height (cm)" error={fieldError('height_cm')}>
                <input
                  name="height_cm"
                  type="number"
                  min={90}
                  max={250}
                  value={height}
                  onChange={(event) => setHeight(event.target.value)}
                  className={inputClass(fieldError('height_cm'))}
                  placeholder="175"
                />
              </Field>
              <Field label="Weight (kg)" error={fieldError('weight_kg')}>
                <input
                  name="weight_kg"
                  type="number"
                  min={25}
                  max={350}
                  step="0.1"
                  value={weight}
                  onChange={(event) => setWeight(event.target.value)}
                  className={inputClass(fieldError('weight_kg'))}
                  placeholder="70"
                />
              </Field>
            </div>

            {bmi ? (
              <div className="rounded-xl border border-border bg-muted/40 px-5 py-4">
                <div className="flex items-baseline justify-between gap-4">
                  <p className="text-sm text-muted-foreground">Your BMI</p>
                  <p className="text-2xl font-semibold tabular-nums">{bmi}</p>
                </div>
                <p className="mt-1 text-sm capitalize text-muted-foreground">
                  {getBmiBucket(bmi).replace('-', ' ')}
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Enter both values to preview your BMI.
              </p>
            )}
          </Step>

          <Step active={step === 2}>
            <Heading
              title="Goal and experience"
              description="Your AI coach programs differently for each of these."
            />
            <Field label="Primary goal" error={fieldError('goal')}>
              <select
                name="goal"
                defaultValue={profile?.goal ?? 'Build muscle'}
                className={inputClass(fieldError('goal'))}
              >
                {fitnessGoals.map((goal) => (
                  <option key={goal} value={goal}>
                    {goal}
                  </option>
                ))}
              </select>
            </Field>

            <RadioGroup
              name="fitness_level"
              label="Current activity level"
              error={fieldError('fitness_level')}
              options={activityLevels.map((level) => ({
                value: level,
                label: level,
                help: ACTIVITY_HELP[level],
              }))}
              defaultValue={profile?.fitness_level ?? 'light'}
            />

            <RadioGroup
              name="experience_level"
              label="Training experience"
              error={fieldError('experience_level')}
              options={experienceLevels.map((level) => ({
                value: level,
                label: level,
                help: EXPERIENCE_HELP[level],
              }))}
              defaultValue={profile?.experience_level ?? 'none'}
            />
          </Step>

          <Step active={step === 3}>
            <Heading
              title="Your training setup"
              description="Kynetic only prescribes exercises you can actually do with what you have."
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Days per week" error={fieldError('available_days_per_week')}>
                <input
                  name="available_days_per_week"
                  type="number"
                  min={1}
                  max={7}
                  defaultValue={profile?.available_days_per_week ?? 3}
                  className={inputClass(fieldError('available_days_per_week'))}
                />
              </Field>
              <Field label="Session length (min)" error={fieldError('preferred_session_minutes')}>
                <input
                  name="preferred_session_minutes"
                  type="number"
                  min={10}
                  max={180}
                  defaultValue={profile?.preferred_session_minutes ?? 45}
                  className={inputClass(fieldError('preferred_session_minutes'))}
                />
              </Field>
            </div>

            <CheckboxGroup
              name="equipment"
              label="Equipment you have"
              hint="Leave all unchecked for bodyweight only"
              options={EQUIPMENT}
              selected={profile?.equipment ?? []}
            />

            <CheckboxGroup
              name="workout_preferences"
              label="Training styles you enjoy"
              hint="Optional"
              options={PREFERENCES}
              selected={profile?.workout_preferences ?? []}
            />
          </Step>

          <Step active={step === 4}>
            <Heading
              title="Anything we should work around?"
              description="Injuries and limitations are respected by every workout we generate."
            />
            <Field
              label="Injuries or limitations"
              hint="Optional, but worth filling in"
              error={fieldError('limitations')}
            >
              <textarea
                name="limitations"
                rows={4}
                defaultValue={profile?.limitations ?? ''}
                className={`${inputClass()} resize-none`}
                placeholder="e.g. Left knee pain when squatting deep, recovering shoulder impingement"
              />
            </Field>
            <p className="rounded-xl border border-border bg-muted/40 px-5 py-4 text-sm leading-relaxed text-muted-foreground">
              Your plan will avoid movements that load anything you mention here, and your
              coach will reference it in feedback.
            </p>
          </Step>
        </div>

        {/* Errors ---------------------------------------------------------- */}
        {state.error ? (
          <p className="flex items-start gap-2 border-t border-border bg-destructive/10 px-6 py-3.5 text-sm text-destructive sm:px-8">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            {state.error}
          </p>
        ) : null}

        {/* Navigation ------------------------------------------------------ */}
        <div className="flex items-center justify-between gap-3 border-t border-border px-6 py-5 sm:px-8">
          <button
            type="button"
            onClick={() => setStep((value) => Math.max(0, value - 1))}
            disabled={step === 0}
            className="focus-ring inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm font-medium transition hover:bg-muted disabled:pointer-events-none disabled:opacity-40"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>

          {step < STEPS.length - 1 ? (
            <button
              type="button"
              onClick={() => setStep((value) => Math.min(STEPS.length - 1, value + 1))}
              className="focus-ring inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition hover:opacity-90"
            >
              Continue
              <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <SubmitButton editing={isEditing} />
          )}
        </div>
      </form>

      {step < STEPS.length - 1 ? (
        <p className="mt-4 text-center text-sm text-muted-foreground">
          You can change any of this later from your dashboard.
        </p>
      ) : null}
    </div>
  )
}

function SubmitButton({ editing }: { editing: boolean }) {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="focus-ring inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-60"
    >
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
      {editing ? 'Save changes' : 'Complete setup'}
    </button>
  )
}

function Step({ active, children }: { active: boolean; children: React.ReactNode }) {
  return (
    <div className={active ? 'space-y-5' : 'hidden'} aria-hidden={!active}>
      {children}
    </div>
  )
}

function Heading({ title, description }: { title: string; description: string }) {
  return (
    <div>
      <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
      <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{description}</p>
    </div>
  )
}

function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string
  hint?: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <label className="block">
      <span className="flex items-baseline justify-between gap-2">
        <span className="text-sm font-medium">{label}</span>
        {hint ? <span className="text-xs text-muted-foreground">{hint}</span> : null}
      </span>
      <span className="mt-1.5 block">{children}</span>
      {error ? <span className="mt-1.5 block text-xs text-destructive">{error}</span> : null}
    </label>
  )
}

function inputClass(error?: string) {
  return `w-full rounded-lg border bg-background px-3.5 py-2.5 text-sm outline-none transition focus:ring-2 focus:ring-primary/30 ${
    error ? 'border-destructive' : 'border-border focus:border-primary'
  }`
}

function RadioGroup({
  name,
  label,
  options,
  defaultValue,
  error,
}: {
  name: string
  label: string
  options: Array<{ value: string; label: string; help?: string }>
  defaultValue: string
  error?: string
}) {
  return (
    <fieldset>
      <legend className="text-sm font-medium">{label}</legend>
      <div className="mt-2 space-y-2">
        {options.map((option) => (
          <label
            key={option.value}
            className="flex cursor-pointer items-start gap-3 rounded-lg border border-border bg-background px-4 py-3 transition hover:border-primary/50 has-[:checked]:border-primary has-[:checked]:bg-primary/5"
          >
            <input
              type="radio"
              name={name}
              value={option.value}
              defaultChecked={option.value === defaultValue}
              className="mt-0.5 h-4 w-4 shrink-0 accent-primary"
            />
            <span className="min-w-0">
              <span className="block text-sm font-medium capitalize">{option.label}</span>
              {option.help ? (
                <span className="mt-0.5 block text-xs text-muted-foreground">{option.help}</span>
              ) : null}
            </span>
          </label>
        ))}
      </div>
      {error ? <p className="mt-1.5 text-xs text-destructive">{error}</p> : null}
    </fieldset>
  )
}

function CheckboxGroup({
  name,
  label,
  hint,
  options,
  selected,
}: {
  name: string
  label: string
  hint?: string
  options: string[]
  selected: string[]
}) {
  const chosen = new Set(selected)
  return (
    <fieldset>
      <legend className="flex w-full items-baseline justify-between gap-2">
        <span className="text-sm font-medium">{label}</span>
        {hint ? <span className="text-xs text-muted-foreground">{hint}</span> : null}
      </legend>
      <div className="mt-2 flex flex-wrap gap-2">
        {options.map((option) => (
          <label
            key={option}
            className="cursor-pointer rounded-lg border border-border bg-background px-3.5 py-2 text-sm transition hover:border-primary/50 has-[:checked]:border-primary has-[:checked]:bg-primary has-[:checked]:text-primary-foreground"
          >
            <input
              type="checkbox"
              name={name}
              value={option}
              defaultChecked={chosen.has(option)}
              className="sr-only"
            />
            {option}
          </label>
        ))}
      </div>
    </fieldset>
  )
}
