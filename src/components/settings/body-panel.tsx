'use client'

import { useMemo, useState } from 'react'
import { useFormState } from 'react-dom'

import { updateBodyMetrics, type SettingsState } from '@/app/settings/actions'
import { Field, FormStatus, SubmitButton, inputClass } from '@/components/forms/fields'
import { SectionCard } from '@/components/settings/section-card'
import { calculateBmi, getBmiBucket } from '@/lib/profiles/avatar'
import { NUMERIC_BOUNDS } from '@/lib/profiles/validate'
import type { FitnessProfile } from '@/lib/profiles/types'

const BUCKET_TONE: Record<string, string> = {
  underweight: 'text-amber-600 dark:text-amber-400',
  normal: 'text-emerald-600 dark:text-emerald-400',
  overweight: 'text-amber-600 dark:text-amber-400',
  obese: 'text-orange-600 dark:text-orange-400',
  unknown: 'text-muted-foreground',
}

export function BodyPanel({ profile }: { profile: FitnessProfile | null }) {
  const [state, action] = useFormState<SettingsState, FormData>(updateBodyMetrics, {})
  const error = (name: string) => state.fieldErrors?.[name]

  // Mirrored locally so the BMI readout tracks what you are typing, before you
  // commit the change.
  const [height, setHeight] = useState(profile?.height_cm ? String(profile.height_cm) : '')
  const [weight, setWeight] = useState(profile?.weight_kg ? String(profile.weight_kg) : '')
  const bmi = useMemo(() => calculateBmi(Number(height), Number(weight)), [height, weight])
  const bucket = getBmiBucket(bmi)

  return (
    <SectionCard
      title="Body metrics"
      description="Each save records a snapshot, so your progress chart and 3D avatar both follow the change."
    >
      <form action={action} noValidate className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Height (cm)" error={error('height_cm')}>
            <input
              name="height_cm"
              type="number"
              min={NUMERIC_BOUNDS.height_cm.min}
              max={NUMERIC_BOUNDS.height_cm.max}
              value={height}
              onChange={(event) => setHeight(event.target.value)}
              className={inputClass(error('height_cm'))}
              placeholder="175"
            />
          </Field>

          <Field label="Weight (kg)" error={error('weight_kg')}>
            <input
              name="weight_kg"
              type="number"
              min={NUMERIC_BOUNDS.weight_kg.min}
              max={NUMERIC_BOUNDS.weight_kg.max}
              step="0.1"
              value={weight}
              onChange={(event) => setWeight(event.target.value)}
              className={inputClass(error('weight_kg'))}
              placeholder="70"
            />
          </Field>
        </div>

        <div className="grid grid-cols-2 divide-x divide-border rounded-xl border border-border bg-muted/40">
          <div className="px-4 py-3">
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              BMI
            </p>
            <p className="mt-0.5 text-lg font-semibold tabular-nums">{bmi ?? '—'}</p>
          </div>
          <div className="px-4 py-3">
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Category
            </p>
            <p className={`mt-0.5 text-lg font-semibold capitalize ${BUCKET_TONE[bucket]}`}>
              {bucket === 'unknown' ? '—' : bucket}
            </p>
          </div>
        </div>

        <FormStatus ok={state.ok} error={state.error} />

        <div className="flex justify-end">
          <SubmitButton label="Save metrics" pendingLabel="Saving" />
        </div>
      </form>
    </SectionCard>
  )
}
