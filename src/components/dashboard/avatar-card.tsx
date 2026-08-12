'use client'

import dynamic from 'next/dynamic'
import { Info } from 'lucide-react'

import { avatarMorphs, getAvatarDescription, getBmiBucket, parseAvatarState } from '@/lib/profiles/avatar'
import type { FitnessProfile } from '@/lib/profiles/types'

// Three.js is browser-only and heavy; keep it out of the server bundle and off
// the critical path for the rest of the dashboard.
const Avatar3D = dynamic(() => import('@/components/dashboard/avatar-3d').then((mod) => mod.Avatar3D), {
  ssr: false,
  loading: () => (
    <div className="grid h-full w-full place-items-center">
      <div className="h-40 w-16 animate-pulse rounded-full bg-muted-foreground/20" />
    </div>
  ),
})

const BUCKET_LABEL: Record<string, string> = {
  underweight: 'Underweight',
  normal: 'Healthy range',
  overweight: 'Overweight',
  obese: 'Obese',
  unknown: 'Not set',
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
  const morphs = avatarMorphs(bmi, experience)
  const state = parseAvatarState(profile?.avatar_state ?? null)

  return (
    <section className="flex h-full flex-col overflow-hidden rounded-3xl border border-border bg-card">
      <header className="flex items-start justify-between gap-4 border-b border-border px-6 py-5">
        <div>
          <h2 className="text-base font-semibold tracking-tight">Your avatar</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Body composition and training level, in 3D
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
          {EXPERIENCE_LABEL[state.experience] ?? 'Untrained'}
        </span>
      </header>

      <div className="relative min-h-[340px] flex-1 bg-gradient-to-b from-muted/60 to-muted/20">
        <Avatar3D morphs={morphs} className="absolute inset-0 h-full w-full" />
        <p className="pointer-events-none absolute bottom-3 left-0 right-0 text-center text-[11px] text-muted-foreground/70">
          Drag to rotate
        </p>
      </div>

      <div className="grid grid-cols-3 divide-x divide-border border-t border-border">
        <Metric label="BMI" value={bmi ? bmi.toFixed(1) : '—'} />
        <Metric label="Category" value={BUCKET_LABEL[bucket] ?? 'Not set'} />
        <Metric label="Build" value={`${Math.round(morphs.muscle * 100)}%`} />
      </div>

      <p className="flex items-start gap-2 border-t border-border px-6 py-4 text-xs leading-relaxed text-muted-foreground">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <span>{getAvatarDescription(profile?.avatar_state ?? null)}</span>
      </p>
    </section>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-3 py-4 text-center">
      <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 truncate text-sm font-semibold">{value}</p>
    </div>
  )
}
