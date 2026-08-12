'use client'

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react'
import Link from 'next/link'
import { ArrowLeft, CheckCircle2, ChevronRight, Clock, Loader2, SkipForward, Timer } from 'lucide-react'

import { ExerciseDemo } from '@/components/workout/exercise-demo'
import { LiveFormCoach, type LiveFormMetrics } from '@/components/workout/live-form-coach'
import { VideoFormCheck } from '@/components/workout/video-form-check'
import { supportsVision } from '@/lib/vision/exercise-analyzers'
import { buildExerciseLog, flattenWorkout, formatClock, totalSets } from '@/lib/workouts/session'
import type { WorkoutPlanRecord, WorkoutSessionSummary } from '@/lib/workouts/types'

type PlayerMode = 'exercise' | 'rest' | 'complete'
type GuidanceTab = 'live' | 'upload'

type SessionPlayerProps = {
  plan: WorkoutPlanRecord
  onComplete: (durationMinutes: number, summary: WorkoutSessionSummary) => Promise<void>
}

const EMPTY_METRICS: LiveFormMetrics = {
  rep_count: 0,
  average_depth: 0,
  form_score: 0,
  form_warnings: [],
  tracking_quality: 0,
  tracking: false,
  current_cue: 'Camera not started.',
}

export function SessionPlayer({ plan, onComplete }: SessionPlayerProps) {
  const steps = useMemo(() => flattenWorkout(plan), [plan])
  const plannedSets = useMemo(() => totalSets(steps), [steps])

  const [mode, setMode] = useState<PlayerMode>('exercise')
  const [stepIndex, setStepIndex] = useState(0)
  const [currentSet, setCurrentSet] = useState(1)
  const [completedSets, setCompletedSets] = useState<Record<string, number>>({})
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [restRemaining, setRestRemaining] = useState(0)
  const [difficulty, setDifficulty] =
    useState<NonNullable<WorkoutSessionSummary['perceived_difficulty']>>('just_right')
  const [guidanceTab, setGuidanceTab] = useState<GuidanceTab>('live')
  const [isPending, startTransition] = useTransition()

  /**
   * Form metrics are kept per exercise rather than as a single running value.
   * A session mixes several movements, so the summary has to aggregate all of
   * them — keeping one value would report only the last exercise performed.
   */
  const [metricsByExercise, setMetricsByExercise] = useState<Record<string, LiveFormMetrics>>({})
  const completedRef = useRef(false)

  const step = steps[stepIndex]
  const exercise = step?.exercise
  const exerciseKey = step ? String(step.globalIndex) : '0'
  const visionKind = supportsVision(exercise?.vision_kind) ? exercise!.vision_kind! : null
  const targetSets = Math.max(1, Number(exercise?.sets) || 1)
  const doneSets = Object.values(completedSets).reduce((sum, value) => sum + value, 0)
  const progress = plannedSets ? Math.round((doneSets / plannedSets) * 100) : 0
  const liveMetrics = metricsByExercise[exerciseKey] ?? EMPTY_METRICS

  const handleMetrics = useCallback(
    (metrics: LiveFormMetrics) => {
      setMetricsByExercise((previous) => ({ ...previous, [exerciseKey]: metrics }))
    },
    [exerciseKey]
  )

  // Exercises without live support default to the upload tab.
  useEffect(() => {
    setGuidanceTab(visionKind ? 'live' : 'upload')
  }, [visionKind, exerciseKey])

  useEffect(() => {
    if (mode === 'complete') return
    const timer = window.setInterval(() => setElapsedSeconds((value) => value + 1), 1000)
    return () => window.clearInterval(timer)
  }, [mode])

  useEffect(() => {
    if (mode !== 'rest' || restRemaining <= 0) return
    const timer = window.setInterval(() => setRestRemaining((value) => Math.max(0, value - 1)), 1000)
    return () => window.clearInterval(timer)
  }, [mode, restRemaining])

  const advance = useCallback(() => {
    setCurrentSet((set) => {
      if (set < targetSets) return set + 1
      setStepIndex((index) => Math.min(steps.length - 1, index + 1))
      return 1
    })
    setMode('exercise')
  }, [steps.length, targetSets])

  useEffect(() => {
    if (mode === 'rest' && restRemaining === 0) advance()
  }, [mode, restRemaining, advance])

  /** Combines every exercise's camera data into one session-level summary. */
  function aggregateFormMetrics() {
    const entries = Object.entries(metricsByExercise).filter(([, value]) => value.rep_count > 0)
    if (!entries.length) {
      return { reps: 0, depth: undefined, form: undefined, warnings: [], guided: [], repsByKey: {} }
    }

    const reps = entries.reduce((sum, [, value]) => sum + value.rep_count, 0)
    // Weight depth and form by rep count so a 20-rep set counts more than a 3-rep one.
    const depth = Math.round(
      entries.reduce((sum, [, value]) => sum + value.average_depth * value.rep_count, 0) / reps
    )
    const form = Math.round(
      entries.reduce((sum, [, value]) => sum + value.form_score * value.rep_count, 0) / reps
    )
    const warnings = Array.from(new Set(entries.flatMap(([, value]) => value.form_warnings)))

    const repsByKey: Record<string, number> = {}
    const guided: string[] = []
    entries.forEach(([key, value]) => {
      repsByKey[key] = value.rep_count
      const matched = steps.find((item) => String(item.globalIndex) === key)
      if (matched?.exercise.slug) guided.push(matched.exercise.slug)
    })

    return { reps, depth, form, warnings, guided, repsByKey }
  }

  function markSetComplete() {
    if (completedRef.current || !step || !exercise) return

    const nextCompleted = {
      ...completedSets,
      [exerciseKey]: Math.min(targetSets, (completedSets[exerciseKey] ?? 0) + 1),
    }
    setCompletedSets(nextCompleted)

    const lastSet = currentSet >= targetSets
    const lastExercise = stepIndex >= steps.length - 1

    if (lastSet && lastExercise) {
      const form = aggregateFormMetrics()
      const exerciseLog = buildExerciseLog(steps, nextCompleted, form.repsByKey)
      const completedSetCount = exerciseLog.reduce((sum, item) => sum + item.completed_sets, 0)

      const summary: WorkoutSessionSummary = {
        completed_from: 'guided_session_player',
        plan_title: plan.title,
        total_exercises: steps.length,
        total_sets: plannedSets,
        completed_sets: completedSetCount,
        elapsed_seconds: elapsedSeconds,
        exercise_log: exerciseLog,
        // Omitted entirely when no camera data exists, so the coach is never
        // handed a fabricated zero to reason about.
        ...(form.reps > 0
          ? {
              rep_count: form.reps,
              average_depth: form.depth,
              form_score: form.form,
              form_warnings: form.warnings,
              guided_exercises: form.guided,
            }
          : {}),
        perceived_difficulty: difficulty,
      }

      completedRef.current = true
      setMode('complete')
      startTransition(() => {
        void onComplete(Math.max(1, Math.ceil(elapsedSeconds / 60)), summary)
      })
      return
    }

    setRestRemaining(Math.max(5, Number(exercise.rest_seconds) || 45))
    setMode('rest')
  }

  if (!step || !exercise) {
    return (
      <div className="rounded-2xl border border-border bg-card p-10 text-center">
        <p className="font-semibold">This plan has no playable exercises.</p>
        <Link href="/dashboard" className="mt-4 inline-block text-sm text-primary hover:underline">
          Back to dashboard
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Header ------------------------------------------------------------ */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href={`/workouts/${plan.id}`}
          className="focus-ring inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3.5 py-2 text-sm font-medium transition hover:bg-muted"
        >
          <ArrowLeft className="h-4 w-4" />
          Plan details
        </Link>
        <div className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3.5 py-2 text-sm font-medium tabular-nums">
          <Clock className="h-4 w-4 text-muted-foreground" />
          {formatClock(elapsedSeconds)}
        </div>
      </div>

      {/* Progress ---------------------------------------------------------- */}
      <section className="rounded-2xl border border-border bg-card px-6 py-5">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Guided session
            </p>
            <h1 className="mt-1 text-xl font-semibold tracking-tight sm:text-2xl">{plan.title}</h1>
          </div>
          <p className="text-sm text-muted-foreground tabular-nums">
            {doneSets} of {plannedSets} sets · {progress}%
          </p>
        </div>
        <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </section>

      {mode === 'rest' ? (
        <section className="rounded-2xl border border-border bg-card px-6 py-14 text-center">
          <Timer className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-4 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Rest
          </p>
          <p className="mt-2 text-6xl font-semibold tabular-nums">{formatClock(restRemaining)}</p>
          <p className="mx-auto mt-4 max-w-sm text-sm text-muted-foreground">
            Breathe and reset before your next {currentSet < targetSets ? 'set' : 'exercise'}.
          </p>
          <button
            type="button"
            onClick={() => {
              setRestRemaining(0)
              advance()
            }}
            className="focus-ring mt-6 inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition hover:opacity-90"
          >
            <SkipForward className="h-4 w-4" />
            Skip rest
          </button>
        </section>
      ) : mode === 'complete' ? (
        <section className="rounded-2xl border border-border bg-card px-6 py-16 text-center">
          <Loader2 className="mx-auto h-7 w-7 animate-spin text-primary" />
          <h2 className="mt-4 text-lg font-semibold">Saving your session</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Your AI coach is reviewing this workout against your recent history.
          </p>
        </section>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          {/* Exercise ------------------------------------------------------ */}
          <div className="space-y-5">
            <section className="rounded-2xl border border-border bg-card">
              <header className="border-b border-border px-6 py-5">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  {step.block.name} · Exercise {stepIndex + 1} of {steps.length}
                </p>
                <div className="mt-2 flex flex-wrap items-baseline justify-between gap-3">
                  <h2 className="text-2xl font-semibold tracking-tight">{exercise.name}</h2>
                  <span className="rounded-lg bg-muted px-3 py-1.5 text-sm font-medium">
                    Set {currentSet}/{targetSets} · {exercise.reps}
                  </span>
                </div>
              </header>

              <ExerciseDemo exercise={exercise} />

              <ol className="space-y-2.5 px-6 py-5">
                {exercise.instructions.map((instruction, index) => (
                  <li key={instruction} className="flex gap-3 text-sm leading-relaxed">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-semibold text-muted-foreground">
                      {index + 1}
                    </span>
                    <span className="text-muted-foreground">{instruction}</span>
                  </li>
                ))}
              </ol>

              <div className="flex flex-wrap gap-3 border-t border-border px-6 py-5">
                <button
                  type="button"
                  onClick={markSetComplete}
                  disabled={isPending}
                  className="focus-ring inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-60"
                >
                  {isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4" />
                  )}
                  Complete set
                </button>
                {stepIndex < steps.length - 1 ? (
                  <button
                    type="button"
                    onClick={() => {
                      setStepIndex((index) => Math.min(steps.length - 1, index + 1))
                      setCurrentSet(1)
                    }}
                    className="focus-ring inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm font-medium transition hover:bg-muted"
                  >
                    Skip exercise
                    <ChevronRight className="h-4 w-4" />
                  </button>
                ) : null}
              </div>
            </section>

            <DifficultyPicker value={difficulty} onChange={setDifficulty} />
          </div>

          {/* Guidance ------------------------------------------------------ */}
          <div className="space-y-5">
            <div className="flex gap-1 rounded-lg bg-muted p-1">
              <TabButton
                active={guidanceTab === 'live'}
                disabled={!visionKind}
                onClick={() => setGuidanceTab('live')}
                label="Live guidance"
                hint={visionKind ? undefined : 'Not available for this exercise'}
              />
              <TabButton
                active={guidanceTab === 'upload'}
                onClick={() => setGuidanceTab('upload')}
                label="Upload a video"
              />
            </div>

            {guidanceTab === 'live' ? (
              <LiveFormCoach
                key={exerciseKey}
                visionKind={visionKind}
                exerciseName={exercise.name}
                active={mode === 'exercise' && !isPending}
                onMetricsChange={handleMetrics}
              />
            ) : (
              <VideoFormCheck
                {...(visionKind ? { lockedKind: visionKind } : {})}
                onComplete={(_, summary) =>
                  handleMetrics({
                    ...summary,
                    tracking: false,
                    current_cue: 'Analysed from your uploaded video.',
                  })
                }
              />
            )}

            <SessionMetrics doneSets={doneSets} plannedSets={plannedSets} metrics={liveMetrics} />
          </div>
        </div>
      )}
    </div>
  )
}

function TabButton({
  active,
  disabled,
  onClick,
  label,
  hint,
}: {
  active: boolean
  disabled?: boolean
  onClick: () => void
  label: string
  hint?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={hint}
      className={`focus-ring flex-1 rounded-md px-3 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-40 ${
        active ? 'bg-card shadow-sm' : 'text-muted-foreground hover:text-foreground'
      }`}
    >
      {label}
    </button>
  )
}

function SessionMetrics({
  doneSets,
  plannedSets,
  metrics,
}: {
  doneSets: number
  plannedSets: number
  metrics: LiveFormMetrics
}) {
  return (
    <section className="rounded-2xl border border-border bg-card px-6 py-5">
      <h3 className="text-sm font-semibold">This exercise</h3>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Metric label="Sets" value={`${doneSets}/${plannedSets}`} />
        <Metric label="Tracked reps" value={String(metrics.rep_count)} />
        <Metric label="Avg depth" value={metrics.rep_count ? `${metrics.average_depth}%` : '—'} />
        <Metric label="Form" value={metrics.form_score ? String(metrics.form_score) : '—'} />
      </div>
    </section>
  )
}

function DifficultyPicker({
  value,
  onChange,
}: {
  value: NonNullable<WorkoutSessionSummary['perceived_difficulty']>
  onChange: (value: NonNullable<WorkoutSessionSummary['perceived_difficulty']>) => void
}) {
  const options: Array<{ id: NonNullable<WorkoutSessionSummary['perceived_difficulty']>; label: string }> = [
    { id: 'too_easy', label: 'Too easy' },
    { id: 'just_right', label: 'Just right' },
    { id: 'too_hard', label: 'Too hard' },
  ]

  return (
    <section className="rounded-2xl border border-border bg-card px-6 py-5">
      <p className="text-sm font-semibold">How is this session feeling?</p>
      <p className="mt-1 text-xs text-muted-foreground">
        This directly shapes how hard your next workout will be.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {options.map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => onChange(option.id)}
            className={`focus-ring rounded-lg border px-3.5 py-2 text-sm font-medium transition ${
              value === option.id
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border bg-background hover:border-primary/50'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </section>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-muted px-3 py-3">
      <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold tabular-nums">{value}</p>
    </div>
  )
}
