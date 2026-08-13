'use client'

import { useCallback, useEffect, useState } from 'react'
import { Check, Loader2, ShieldCheck, Smartphone, Trash2 } from 'lucide-react'

import { Field, FormStatus, inputClass } from '@/components/forms/fields'
import { SectionCard } from '@/components/settings/section-card'
import { createBrowserSupabaseClient } from '@/lib/supabase/client'

type Factor = {
  id: string
  friendlyName?: string
  status: string
  createdAt?: string
}

type Enrolment = {
  factorId: string
  qrCode: string
  secret: string
}

/**
 * Time-based one-time password (TOTP) enrolment.
 *
 * Runs entirely in the browser against Supabase's MFA API: enrolling returns a
 * QR code and a secret, and the factor stays unverified — and therefore
 * unusable — until a code from the authenticator app is accepted. That
 * verification step is what proves the user actually stored the secret before
 * it starts being demanded at sign-in.
 */
export function MfaPanel() {
  const [factors, setFactors] = useState<Factor[]>([])
  const [enrolment, setEnrolment] = useState<Enrolment | null>(null)
  const [code, setCode] = useState('')
  const [label, setLabel] = useState('')
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState<{ ok?: string; error?: string }>({})

  const refresh = useCallback(async () => {
    const supabase = createBrowserSupabaseClient()
    if (!supabase) {
      setStatus({ error: 'Supabase is not configured.' })
      setLoading(false)
      return
    }

    const { data, error } = await supabase.auth.mfa.listFactors()
    if (error) setStatus({ error: error.message })
    // Only verified factors count: an abandoned enrolment must not look like
    // protection the account does not actually have.
    setFactors((data?.totp ?? []).filter((factor) => factor.status === 'verified'))
    setLoading(false)
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const startEnrolment = async () => {
    const supabase = createBrowserSupabaseClient()
    if (!supabase) return

    setBusy(true)
    setStatus({})

    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: 'totp',
      // Without an issuer the entry lands in the user's app under the Supabase
      // project ref, which is meaningless to them.
      issuer: 'Kynetic',
      friendlyName: label.trim() || `Authenticator ${new Date().toLocaleDateString()}`,
    })

    setBusy(false)
    if (error || !data) {
      setStatus({ error: error?.message ?? 'Could not start enrolment.' })
      return
    }

    setEnrolment({ factorId: data.id, qrCode: data.totp.qr_code, secret: data.totp.secret })
  }

  const confirmEnrolment = async () => {
    const supabase = createBrowserSupabaseClient()
    if (!supabase || !enrolment) return

    setBusy(true)
    setStatus({})

    const { error } = await supabase.auth.mfa.challengeAndVerify({
      factorId: enrolment.factorId,
      code: code.replace(/\s/g, ''),
    })

    setBusy(false)
    if (error) {
      setStatus({ error: 'That code was not accepted. Check the clock on your phone and try again.' })
      return
    }

    setEnrolment(null)
    setCode('')
    setLabel('')
    setStatus({ ok: 'Two-factor authentication is on. You will be asked for a code at sign-in.' })
    await refresh()
  }

  const cancelEnrolment = async () => {
    const supabase = createBrowserSupabaseClient()
    if (!supabase || !enrolment) return

    setBusy(true)
    // Drop the half-finished factor rather than leaving it on the account.
    await supabase.auth.mfa.unenroll({ factorId: enrolment.factorId })
    setEnrolment(null)
    setCode('')
    setBusy(false)
    await refresh()
  }

  const remove = async (factorId: string) => {
    const supabase = createBrowserSupabaseClient()
    if (!supabase) return

    setBusy(true)
    setStatus({})
    const { error } = await supabase.auth.mfa.unenroll({ factorId })
    setBusy(false)

    setStatus(
      error
        ? { error: error.message }
        : { ok: 'Authenticator removed. Your account is no longer protected by a second factor.' }
    )
    await refresh()
  }

  return (
    <SectionCard
      title="Two-factor authentication"
      description="Adds a six-digit code from an authenticator app to every sign-in, so a stolen password is not enough on its own."
    >
      <div className="space-y-5">
        {loading ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Checking your security settings
          </p>
        ) : null}

        {/* Enrolled factors ------------------------------------------------ */}
        {!loading && factors.length ? (
          <ul className="space-y-2">
            {factors.map((factor) => (
              <li
                key={factor.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-background px-4 py-3"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-500" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {factor.friendlyName || 'Authenticator app'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Active
                      {factor.createdAt
                        ? ` · added ${new Date(factor.createdAt).toLocaleDateString()}`
                        : ''}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => remove(factor.id)}
                  disabled={busy}
                  className="focus-ring inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium transition hover:bg-muted disabled:opacity-60"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Remove
                </button>
              </li>
            ))}
          </ul>
        ) : null}

        {/* Enrolment in progress ------------------------------------------- */}
        {enrolment ? (
          <div className="space-y-4 rounded-xl border border-border bg-muted/30 p-5">
            <div>
              <p className="text-sm font-medium">1. Scan this with your authenticator app</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Google Authenticator, 1Password, Authy, or any other TOTP app.
              </p>
            </div>

            <div className="flex flex-wrap items-start gap-5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={enrolment.qrCode}
                alt="QR code for authenticator app enrolment"
                className="h-44 w-44 shrink-0 rounded-lg border border-border bg-white p-2"
              />

              <div className="min-w-0 flex-1 space-y-2">
                <p className="text-xs font-medium text-muted-foreground">
                  Cannot scan? Enter this key by hand:
                </p>
                <code className="block break-all rounded-lg border border-border bg-background px-3 py-2 font-mono text-xs">
                  {enrolment.secret}
                </code>
              </div>
            </div>

            <div className="space-y-3 border-t border-border pt-4">
              <p className="text-sm font-medium">2. Enter the six-digit code it shows</p>
              <Field label="Verification code">
                <input
                  value={code}
                  onChange={(event) => setCode(event.target.value.replace(/[^\d]/g, '').slice(0, 6))}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="123456"
                  className={`${inputClass()} max-w-[10rem] text-center font-mono text-lg tracking-[0.3em]`}
                />
              </Field>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={confirmEnrolment}
                  disabled={busy || code.length !== 6}
                  className="focus-ring inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:pointer-events-none disabled:opacity-50"
                >
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  Turn on two-factor
                </button>
                <button
                  type="button"
                  onClick={cancelEnrolment}
                  disabled={busy}
                  className="focus-ring inline-flex items-center rounded-lg border border-border px-4 py-2.5 text-sm font-medium transition hover:bg-muted disabled:opacity-60"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {/* Start enrolment -------------------------------------------------- */}
        {!loading && !enrolment ? (
          <div className="space-y-4">
            {!factors.length ? (
              <p className="flex items-start gap-2.5 rounded-lg border border-border bg-muted/40 px-3.5 py-3 text-sm leading-relaxed text-muted-foreground">
                <Smartphone className="mt-0.5 h-4 w-4 shrink-0" />
                Your account is protected by your password alone. Adding an authenticator app takes
                about a minute.
              </p>
            ) : null}

            <Field label="Device name" hint="Optional">
              <input
                value={label}
                onChange={(event) => setLabel(event.target.value.slice(0, 40))}
                placeholder="My phone"
                className={`${inputClass()} max-w-sm`}
              />
            </Field>

            <button
              type="button"
              onClick={startEnrolment}
              disabled={busy}
              className="focus-ring inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-60"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
              {factors.length ? 'Add another authenticator' : 'Set up authenticator app'}
            </button>
          </div>
        ) : null}

        <FormStatus ok={status.ok} error={status.error} />
      </div>
    </SectionCard>
  )
}
