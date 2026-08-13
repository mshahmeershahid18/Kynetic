'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertCircle, Loader2, ShieldCheck } from 'lucide-react'

import { createBrowserSupabaseClient } from '@/lib/supabase/client'

/**
 * Second-factor step at sign-in.
 *
 * Verifying raises the session's assurance level to aal2. The middleware holds
 * every protected route at this screen until that happens, so the password
 * alone never reaches the app.
 */
export function MfaChallenge({ next }: { next: string }) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement | null>(null)

  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()

    const supabase = createBrowserSupabaseClient()
    if (!supabase) {
      setError('Supabase is not configured.')
      return
    }

    setBusy(true)
    setError(null)

    const { data, error: listError } = await supabase.auth.mfa.listFactors()
    const factor = data?.totp?.find((item) => item.status === 'verified')

    if (listError || !factor) {
      setBusy(false)
      setError(listError?.message ?? 'No authenticator is registered on this account.')
      return
    }

    const { error: verifyError } = await supabase.auth.mfa.challengeAndVerify({
      factorId: factor.id,
      code: code.replace(/\s/g, ''),
    })

    if (verifyError) {
      setBusy(false)
      setCode('')
      setError('That code was not accepted. Codes expire every 30 seconds — try the current one.')
      inputRef.current?.focus()
      return
    }

    // Full reload rather than a client transition: the session cookie changed,
    // and the server components need to be rendered against the new one.
    router.replace(next)
    router.refresh()
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="flex items-start gap-2.5 rounded-lg border border-border bg-muted/40 px-3.5 py-3">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
        <p className="text-sm leading-relaxed text-muted-foreground">
          Open your authenticator app and enter the current six-digit code for Kynetic.
        </p>
      </div>

      <label className="block">
        <span className="text-sm font-medium">Verification code</span>
        <input
          ref={inputRef}
          value={code}
          onChange={(event) => setCode(event.target.value.replace(/[^\d]/g, '').slice(0, 6))}
          inputMode="numeric"
          autoComplete="one-time-code"
          placeholder="123456"
          className="mt-1.5 w-full rounded-lg border border-border bg-background px-3.5 py-3 text-center font-mono text-xl tracking-[0.4em] outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/30"
        />
      </label>

      {error ? (
        <p className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3.5 py-2.5 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={busy || code.length !== 6}
        className="focus-ring inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:pointer-events-none disabled:opacity-50"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        Verify and continue
      </button>
    </form>
  )
}
