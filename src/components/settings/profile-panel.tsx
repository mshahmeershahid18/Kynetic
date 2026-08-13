'use client'

import { useFormState } from 'react-dom'

import { updatePersonalDetails, type SettingsState } from '@/app/settings/actions'
import { Field, FormStatus, SubmitButton, inputClass } from '@/components/forms/fields'
import { SectionCard } from '@/components/settings/section-card'
import { GENDER_OPTIONS } from '@/lib/profiles/options'
import { NUMERIC_BOUNDS } from '@/lib/profiles/validate'
import type { FitnessProfile } from '@/lib/profiles/types'

export function ProfilePanel({ profile }: { profile: FitnessProfile | null }) {
  const [state, action] = useFormState<SettingsState, FormData>(updatePersonalDetails, {})
  const error = (name: string) => state.fieldErrors?.[name]

  return (
    <SectionCard
      title="Personal details"
      description="Your name is what your coach calls you. Age and gender shape both your programming and how your avatar is rendered."
    >
      <form action={action} noValidate className="space-y-5">
        <Field label="Full name" error={error('full_name')}>
          <input
            name="full_name"
            defaultValue={profile?.full_name ?? ''}
            autoComplete="name"
            placeholder="Your name"
            className={inputClass(error('full_name'))}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Age" error={error('age')}>
            <input
              name="age"
              type="number"
              min={NUMERIC_BOUNDS.age.min}
              max={NUMERIC_BOUNDS.age.max}
              defaultValue={profile?.age ?? ''}
              className={inputClass(error('age'))}
              placeholder="25"
            />
          </Field>

          <Field label="Gender" hint="Optional">
            <select
              name="gender"
              defaultValue={profile?.gender ?? 'prefer-not-to-say'}
              className={inputClass()}
            >
              {GENDER_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <FormStatus ok={state.ok} error={state.error} />

        <div className="flex justify-end">
          <SubmitButton label="Save details" pendingLabel="Saving" />
        </div>
      </form>
    </SectionCard>
  )
}
