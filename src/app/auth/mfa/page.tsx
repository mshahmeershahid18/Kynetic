import Link from 'next/link'
import { redirect } from 'next/navigation'

import { signOut } from '@/app/auth/actions'
import { MfaChallenge } from '@/components/auth/mfa-challenge'
import { AuthShell } from '@/components/auth/auth-shell'
import { ConfigNotice } from '@/components/layout/config-notice'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export const metadata = { title: 'Two-factor verification · Kynetic' }

export const dynamic = 'force-dynamic'

export default async function MfaPage({
  searchParams,
}: {
  searchParams?: { next?: string }
}) {
  const supabase = createServerSupabaseClient()
  if (!supabase) return <ConfigNotice />

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  // Nothing to verify: either no factor is enrolled, or this session already
  // cleared it. Either way the challenge screen would be a dead end.
  const { data: assurance } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
  if (assurance?.nextLevel !== 'aal2' || assurance.currentLevel === 'aal2') {
    redirect('/dashboard')
  }

  // Only ever send the user to a path inside this app.
  const requested = searchParams?.next ?? '/dashboard'
  const next = requested.startsWith('/') && !requested.startsWith('//') ? requested : '/dashboard'

  return (
    <AuthShell
      eyebrow="Two-factor authentication"
      title="Confirm it is you"
      description="Your account is protected by an authenticator app. Enter the current code to finish signing in."
      footer={
        <form action={signOut}>
          <button type="submit" className="font-medium text-primary hover:underline">
            Sign in as someone else
          </button>
        </form>
      }
    >
      <MfaChallenge next={next} />
    </AuthShell>
  )
}
