'use client'

import { useFormState } from 'react-dom'

import { updateTrainingSetup, type SettingsState } from '@/app/settings/actions'
import {
  CheckboxGroup,
  Field,
  FormStatus,
  RadioGroup,
  SubmitButton,
  inputClass,
} from '@/components/forms/fields'
import { SectionCard } from '@/components/settings/section-card'
import {
  ACTIVITY_HELP,
  EQUIPMENT_OPTIONS,
  EXPERIENCE_HELP,
  PREFERENCE_OPTIONS,
} from '@/lib/profiles/options'
import {
  activityLevels,
  experienceLevels,
  fitnessGoals,
  type FitnessProfile,
} from '@/lib/profiles/types'
import { NUMERIC_BOUNDS } from '@/lib/profiles/validate'

export function TrainingPanel({ profile }: { profile: FitnessProfile | null }) {
  const [state, action] = useFormState<SettingsState, FormData>(updateTrainingSetup, {})
  const error = (name: string) => state.fieldErrors?.[name]

  return (
    <form action={action} noValidate className="space-y-6">
      <SectionCard
        title="Goal and experience"
        description="Your AI coach programs differently for each of these."
      >
        <div className="space-y-5">
          <Field label="Primary goal" error={error('goal')}>
            <select
              name="goal"
              defaultValue={profile?.goal ?? 'Build muscle'}
              className={inputClass(error('goal'))}
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
            error={error('fitness_level')}
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
            error={error('experience_level')}
            options={experienceLevels.map((level) => ({
              value: level,
              label: level,
              help: EXPERIENCE_HELP[level],
            }))}
            defaultValue={profile?.experience_level ?? 'none'}
          />
        </div>
      </SectionCard>

      <SectionCard
        title="Schedule and equipment"
        description="Kynetic only prescribes exercises you can actually do, in the time you have."
      >
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Days per week" error={error('available_days_per_week')}>
              <input
                name="available_days_per_week"
                type="number"
                min={NUMERIC_BOUNDS.available_days_per_week.min}
                max={NUMERIC_BOUNDS.available_days_per_week.max}
                defaultValue={profile?.available_days_per_week ?? 3}
                className={inputClass(error('available_days_per_week'))}
              />
            </Field>
            <Field label="Session length (min)" error={error('preferred_session_minutes')}>
              <input
                name="preferred_session_minutes"
                type="number"
                min={NUMERIC_BOUNDS.preferred_session_minutes.min}
                max={NUMERIC_BOUNDS.preferred_session_minutes.max}
                defaultValue={profile?.preferred_session_minutes ?? 45}
                className={inputClass(error('preferred_session_minutes'))}
              />
            </Field>
          </div>

          <CheckboxGroup
            name="equipment"
            label="Equipment you have"
            hint="Leave all unchecked for bodyweight only"
            options={EQUIPMENT_OPTIONS}
            selected={profile?.equipment ?? []}
          />

          <CheckboxGroup
            name="workout_preferences"
            label="Training styles you enjoy"
            hint="Optional"
            options={PREFERENCE_OPTIONS}
            selected={profile?.workout_preferences ?? []}
          />
        </div>
      </SectionCard>

      <SectionCard
        title="Health and limitations"
        description="Every generated plan avoids loading anything you mention here, and your coach references it in feedback."
      >
        <div className="space-y-5">
          <Field label="Injuries or limitations" hint="Optional" error={error('limitations')}>
            <textarea
              name="limitations"
              rows={4}
              defaultValue={profile?.limitations ?? ''}
              className={`${inputClass()} resize-none`}
              placeholder="e.g. Left knee pain when squatting deep, recovering shoulder impingement"
            />
          </Field>

          <FormStatus ok={state.ok} error={state.error} />

          <div className="flex justify-end">
            <SubmitButton label="Save training setup" pendingLabel="Saving" />
          </div>
        </div>
      </SectionCard>
    </form>
  )
}
