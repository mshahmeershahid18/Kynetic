import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'

import { ConfigNotice } from '@/components/layout/config-notice'
import { Reveal } from '@/components/motion/reveal'
import { SettingsView } from '@/components/settings/settings-view'
import { resolveProfilePhoto } from '@/lib/profiles/photo'
import type { FitnessProfile } from '@/lib/profiles/types'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export const metadata = { title: 'Settings · Kynetic' }

// Account data is per-user and changes as you edit it. Never cache it.
export const dynamic = 'force-dynamic'

export default async function SettingsPage() {
  const supabase = createServerSupabaseClient()
  if (!supabase) return <ConfigNotice />

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login?message=Please%20sign%20in%20to%20continue')

  // A user who has never finished onboarding has nothing to edit yet.
  const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  const profile = (data ?? null) as FitnessProfile | null
  if (!profile?.onboarding_completed) redirect('/onboarding')

  const providers = (user.identities ?? []).map((identity) => identity.provider)
  const photoUrl = resolveProfilePhoto(profile.avatar_url, user)

  return (
    <main className="min-h-screen bg-muted/20 px-4 py-10">
      <Reveal className="container-shell max-w-5xl">
        <header className="mb-8" data-animate>
          <Link
            href="/dashboard"
            className="focus-ring inline-flex items-center gap-2 rounded-md text-sm text-muted-foreground transition hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to dashboard
          </Link>
          <h1 className="mt-4 font-display text-2xl font-semibold tracking-tight sm:text-3xl">Settings</h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
            Everything on your account, editable in place. Changes to your body and training
            reshape your avatar and every workout generated from now on.
          </p>
        </header>

        <div data-animate>
          <SettingsView
            profile={profile}
            email={user.email ?? null}
            hasPassword={providers.includes('email')}
            providers={providers}
            userId={user.id}
            photoUrl={photoUrl}
            photoFromProvider={!profile.avatar_url && Boolean(photoUrl)}
          />
        </div>
      </Reveal>
    </main>
  )
}
