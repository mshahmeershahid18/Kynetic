'use client'

import { useState } from 'react'
import { Dumbbell, PlayCircle } from 'lucide-react'

import type { WorkoutExercise } from '@/lib/workouts/types'

/**
 * Demonstration media for a prescribed exercise.
 *
 * Media lives in Supabase Storage and is referenced from the `exercises`
 * library. When a clip has not been uploaded yet the component falls back to
 * the written coaching cues, so the session is never blocked on media.
 */
export function ExerciseDemo({ exercise }: { exercise: WorkoutExercise }) {
  const [failed, setFailed] = useState(false)
  const source = resolveDemoUrl(exercise.demo_media_url)
  const cues = exercise.cues ?? []

  if (source && !failed) {
    return (
      <div className="border-b border-border bg-black">
        <video
          key={source}
          src={source}
          className="aspect-video w-full object-contain"
          controls
          loop
          muted
          playsInline
          preload="metadata"
          onError={() => setFailed(true)}
        >
          <track kind="captions" />
        </video>
      </div>
    )
  }

  return (
    <div className="border-b border-border bg-muted/40 px-6 py-5">
      <div className="flex items-center gap-2 text-sm font-medium">
        {source ? (
          <PlayCircle className="h-4 w-4 text-muted-foreground" />
        ) : (
          <Dumbbell className="h-4 w-4 text-muted-foreground" />
        )}
        Key coaching cues
      </div>
      {cues.length ? (
        <ul className="mt-3 flex flex-wrap gap-2">
          {cues.map((cue) => (
            <li
              key={cue}
              className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-muted-foreground"
            >
              {cue}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-sm text-muted-foreground">
          Follow the numbered steps below and keep every rep controlled.
        </p>
      )}
      {source ? (
        <p className="mt-3 text-xs text-muted-foreground">
          The demonstration clip could not be loaded.
        </p>
      ) : null}
    </div>
  )
}

/** Mirrors the server-side helper; Storage paths are stored bucket-relative. */
function resolveDemoUrl(path: string | null | undefined): string | null {
  if (!path) return null
  if (path.startsWith('http://') || path.startsWith('https://')) return path

  const base = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!base) return null
  return `${base.replace(/\/$/, '')}/storage/v1/object/public/${path.replace(/^\//, '')}`
}
