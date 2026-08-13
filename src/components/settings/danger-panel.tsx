'use client'

import { useState } from 'react'
import { useFormState } from 'react-dom'
import { AlertTriangle } from 'lucide-react'

import { deleteAccount, type SettingsState } from '@/app/settings/actions'
import { Field, FormStatus, SubmitButton, inputClass } from '@/components/forms/fields'
import { SectionCard } from '@/components/settings/section-card'

export function DangerPanel() {
  const [state, action] = useFormState<SettingsState, FormData>(deleteAccount, {})
  const [confirm, setConfirm] = useState('')

  return (
    <SectionCard
      tone="danger"
      title="Delete account"
      description="Removes your profile, workout plans, sessions, coach feedback, and progress history. This cannot be undone."
    >
      <form action={action} noValidate className="space-y-5">
        <p className="flex items-start gap-2.5 rounded-lg border border-destructive/30 bg-destructive/10 px-3.5 py-3 text-sm leading-relaxed text-destructive">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          Everything is deleted immediately. There is no export and no recovery window.
        </p>

        <Field
          label="Type DELETE to confirm"
          error={state.fieldErrors?.confirm}
        >
          <input
            name="confirm"
            value={confirm}
            onChange={(event) => setConfirm(event.target.value)}
            autoComplete="off"
            placeholder="DELETE"
            className={inputClass(state.fieldErrors?.confirm)}
          />
        </Field>

        <FormStatus ok={state.ok} error={state.error} />

        <div className="flex justify-end">
          {/* Kept inert until the confirmation matches, so the destructive
              button cannot be hit by a stray click. The server re-checks it. */}
          <SubmitButton
            label="Delete my account"
            pendingLabel="Deleting"
            variant="destructive"
            disabled={confirm !== 'DELETE'}
          />
        </div>
      </form>
    </SectionCard>
  )
}
