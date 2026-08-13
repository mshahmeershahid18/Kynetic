'use client'

import { useFormState } from 'react-dom'
import { Mail, ShieldCheck } from 'lucide-react'

import {
  changePassword,
  sendPasswordResetLink,
  signOutEverywhere,
  updateEmailAddress,
  type SettingsState,
} from '@/app/settings/actions'
import { Field, FormStatus, SubmitButton, inputClass } from '@/components/forms/fields'
import { MfaPanel } from '@/components/settings/mfa-panel'
import { SectionCard } from '@/components/settings/section-card'

type Props = {
  email: string | null
  /** False for Google-only accounts, which have no password to confirm against. */
  hasPassword: boolean
  providers: string[]
}

export function AccountPanel({ email, hasPassword, providers }: Props) {
  return (
    <div className="space-y-6">
      <SectionCard
        title="Email address"
        description="Used for sign in and every message Kynetic sends you."
      >
        <EmailForm email={email} />
      </SectionCard>

      <SectionCard
        title="Password"
        description={
          hasPassword
            ? 'Changing your password requires your current one.'
            : 'This account signs in through a connected provider. Set a password by email if you want to sign in directly as well.'
        }
      >
        {hasPassword ? <PasswordForm /> : <ResetLinkForm email={email} />}
      </SectionCard>

      <MfaPanel />

      <SectionCard
        title="Sign-in methods"
        description="How this account can currently get in."
      >
        <div className="flex flex-wrap gap-2">
          {providers.length ? (
            providers.map((provider) => (
              <span
                key={provider}
                className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-3.5 py-2 text-sm capitalize"
              >
                {provider === 'email' ? (
                  <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                ) : (
                  <ShieldCheck className="h-3.5 w-3.5 text-muted-foreground" />
                )}
                {provider === 'email' ? 'Email and password' : provider}
              </span>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">No sign-in methods on file.</p>
          )}
        </div>
      </SectionCard>

      <SectionCard
        title="Active sessions"
        description="Signs you out of Kynetic in every browser and on every device, including this one."
      >
        <form action={signOutEverywhere}>
          <SubmitButton label="Sign out everywhere" pendingLabel="Signing out" variant="outline" />
        </form>
      </SectionCard>
    </div>
  )
}

function EmailForm({ email }: { email: string | null }) {
  const [state, action] = useFormState<SettingsState, FormData>(updateEmailAddress, {})

  return (
    <form action={action} noValidate className="space-y-5">
      <Field
        label="Email address"
        hint="Confirmation required"
        error={state.fieldErrors?.email}
      >
        <input
          name="email"
          type="email"
          autoComplete="email"
          defaultValue={email ?? ''}
          className={inputClass(state.fieldErrors?.email)}
          placeholder="you@example.com"
        />
      </Field>

      <p className="text-xs leading-relaxed text-muted-foreground">
        We send a confirmation link to the new address. Your current address keeps working until
        that link is opened.
      </p>

      <FormStatus ok={state.ok} error={state.error} />

      <div className="flex justify-end">
        <SubmitButton label="Change email" pendingLabel="Sending" />
      </div>
    </form>
  )
}

function PasswordForm() {
  const [state, action] = useFormState<SettingsState, FormData>(changePassword, {})
  const error = (name: string) => state.fieldErrors?.[name]

  return (
    <form action={action} noValidate className="space-y-5">
      <Field label="Current password" error={error('current_password')}>
        <input
          name="current_password"
          type="password"
          autoComplete="current-password"
          className={inputClass(error('current_password'))}
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="New password" hint="8+ characters" error={error('new_password')}>
          <input
            name="new_password"
            type="password"
            autoComplete="new-password"
            className={inputClass(error('new_password'))}
          />
        </Field>
        <Field label="Confirm new password" error={error('confirm_password')}>
          <input
            name="confirm_password"
            type="password"
            autoComplete="new-password"
            className={inputClass(error('confirm_password'))}
          />
        </Field>
      </div>

      <FormStatus ok={state.ok} error={state.error} />

      <div className="flex justify-end">
        <SubmitButton label="Update password" pendingLabel="Updating" />
      </div>
    </form>
  )
}

function ResetLinkForm({ email }: { email: string | null }) {
  const [state, action] = useFormState<SettingsState, FormData>(sendPasswordResetLink, {})

  return (
    <form action={action} className="space-y-5">
      <p className="text-sm leading-relaxed text-muted-foreground">
        We will email {email ?? 'your address'} a secure link to set a password.
      </p>

      <FormStatus ok={state.ok} error={state.error} />

      <div className="flex justify-end">
        <SubmitButton label="Email me a password link" pendingLabel="Sending" variant="outline" />
      </div>
    </form>
  )
}
