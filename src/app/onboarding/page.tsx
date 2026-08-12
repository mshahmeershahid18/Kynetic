import { redirect } from 'next/navigation'

import { OnboardingForm } from '@/components/onboarding/onboarding-form'
import type { FitnessProfile } from '@/lib/profiles/types'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { ConfigNotice } from '@/components/layout/config-notice'

export const metadata = {
  title: 'Set up your profile · Kynetic',
}

export const dynamic = 'force-dynamic'

export default async function OnboardingPage() {
  const supabase = createServerSupabaseClient()
  if (!supabase) return <ConfigNotice />

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login?message=Please%20sign%20in%20to%20continue')

  // Prefill from the existing profile so this doubles as the edit screen.
  const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  const profile = (data ?? null) as FitnessProfile | null

  return (
    <main className="min-h-screen bg-muted/20 px-4 py-12">
      <div className="mx-auto max-w-2xl">
        <header className="mb-8 text-center">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            {profile?.onboarding_completed ? 'Your profile' : 'Set up your profile'}
          </h1>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
            {profile?.onboarding_completed
              ? 'Changes here reshape your avatar and every workout generated from now on.'
              : 'This takes about a minute. Everything you enter shapes the workouts your AI coach builds for you.'}
          </p>
        </header>

        <OnboardingForm profile={profile} email={user.email ?? null} />
      </div>
    </main>
  )
}
