'use client'

import dynamic from 'next/dynamic'
import Link from 'next/link'

import { avatarMorphs, getBmiBucket } from '@/lib/profiles/avatar'
import type { FitnessProfile } from '@/lib/profiles/types'

// Three.js plus the mesh are browser-only and heavy. Keep them out of the
// server bundle and off the critical path for the rest of the dashboard.
const Avatar3D = dynamic(() => import('@/components/dashboard/avatar-3d').then((m) => m.Avatar3D), {
  ssr: false,
  loading: () => (
    <div className="grid h-full w-full place-items-center">
      <div className="h-32 w-10 animate-pulse rounded-full bg-muted-foreground/15" />
    </div>
  ),
})

const BUCKET_LABEL: Record<string, string> = {
  underweight: 'Underweight',
  normal: 'Healthy',
  overweight: 'Overweight',
  obese: 'Obese',
  unknown: 'Not set',
}

const BUCKET_TONE: Record<string, string> = {
  underweight: 'text-amber-600 dark:text-amber-400',
  normal: 'text-emerald-600 dark:text-emerald-400',
  overweight: 'text-amber-600 dark:text-amber-400',
  obese: 'text-orange-600 dark:text-orange-400',
  unknown: 'text-muted-foreground',
}

const EXPERIENCE_LABEL: Record<string, string> = {
  none: 'Untrained',
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  experienced: 'Experienced',
}

export function AvatarCard({ profile }: { profile: FitnessProfile | null }) {
  const bmi = profile?.bmi ?? null
  const experience = profile?.experience_level ?? null
  const bucket = getBmiBucket(bmi)
  const morphs = avatarMorphs(bmi, experience, profile?.gender)

  return (
    <section className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card/60 backdrop-blur-sm shadow-glow">
      <header className="flex items-start justify-between gap-3 px-5 py-4">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold">Your body</h2>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {EXPERIENCE_LABEL[experience ?? 'none']} · updates as you train
          </p>
        </div>
      </header>

      <div className="relative min-h-[450px] flex-1 bg-gradient-to-b from-muted/50 via-transparent to-muted/30">
        {/* Inset at the bottom keeps the figure clear of the "Drag to rotate" hint. */}
        <Avatar3D params={morphs} className="absolute inset-x-2 top-2 bottom-7" />
        <p className="pointer-events-none absolute bottom-2 left-0 right-0 text-center text-[11px] text-muted-foreground/60">
          Drag to rotate
        </p>
      </div>

      <div className="grid grid-cols-3 divide-x divide-border border-t border-border">
        <Metric label="BMI" value={bmi ? bmi.toFixed(1) : '—'} />
        <Metric
          label="Category"
          value={BUCKET_LABEL[bucket] ?? '—'}
          tone={BUCKET_TONE[bucket]}
        />
        <Metric label="Weight" value={profile?.weight_kg ? `${profile.weight_kg} kg` : '—'} />
      </div>

      {bmi === null ? (
        <Link
          href="/settings"
          className="focus-ring border-t border-border px-5 py-3 text-center text-xs font-medium text-primary hover:underline"
        >
          Add your height and weight
        </Link>
      ) : null}
    </section>
  )
}

function Metric({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="px-2 py-3 text-center">
      <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={`mt-0.5 truncate text-sm font-semibold tabular-nums ${tone ?? ''}`}>{value}</p>
    </div>
  )
}
