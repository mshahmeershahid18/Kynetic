'use client'

import { useEffect, useMemo, useRef, useState, useTransition } from 'react'
import { ArrowLeft, CheckCircle2, Clock, Dumbbell, Loader2, RotateCcw, Timer } from 'lucide-react'
import Link from 'next/link'

import { PoseRepCounter, type RepCounterMetrics } from '@/components/workout/pose-rep-counter'
import { buildExerciseLog, flattenWorkout, formatClock, totalSets } from '@/lib/workouts/session'
import type { WorkoutPlanRecord, WorkoutSessionSummary } from '@/lib/workouts/types'

type PlayerMode = 'exercise' | 'rest' | 'complete'

type SessionPlayerProps = {
  plan: WorkoutPlanRecord
  onComplete: (durationMinutes: number, summary: WorkoutSessionSummary) => Promise<void>
}

const EMPTY_REP_METRICS: RepCounterMetrics = {
  rep_count: 0,
  average_depth: 0,
  form_score: 70,
  form_warnings: [],
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
  const [difficulty, setDifficulty] = useState<NonNullable<WorkoutSessionSummary['perceived_difficulty']>>('just_right')
  const [repMetrics, setRepMetrics] = useState<RepCounterMetrics>(EMPTY_REP_METRICS)
  const [isPending, startTransition] = useTransition()
  const completedRef = useRef(false)

  const step = steps[stepIndex]
  const exercise = step?.exercise
  const activeExerciseKey = step ? String(step.globalIndex) : '0'
  const targetSets = Math.max(1, Number(exercise?.sets) || 1)
  const doneSets = Object.values(completedSets).reduce((sum, value) => sum + value, 0)
  const progress = plannedSets ? Math.round((doneSets / plannedSets) * 100) : 0

  useEffect(() => {
    if (mode === 'complete') return
    const timer = window.setInterval(() => setElapsedSeconds((value) => value + 1), 1000)
    return () => window.clearInterval(timer)
  }, [mode])

  useEffect(() => {
    if (mode !== 'rest' || restRemaining <= 0) return
    const timer = window.setInterval(() => {
      setRestRemaining((value) => Math.max(0, value - 1))
    }, 1000)
    return () => window.clearInterval(timer)
  }, [mode, restRemaining])

  useEffect(() => {
    if (mode === 'rest' && restRemaining === 0) nextAfterRest()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, restRemaining])

  function markSetComplete() {
    if (completedRef.current || !step || !exercise) return
    const key = String(step.globalIndex)
    const nextSetCount = Math.min(targetSets, (completedSets[key] ?? 0) + 1)
    const nextCompleted = { ...completedSets, [key]: nextSetCount }
    setCompletedSets(nextCompleted)

    const finalSetForExercise = currentSet >= targetSets
    const finalExercise = stepIndex >= steps.length - 1

    if (finalSetForExercise && finalExercise) {
      const exerciseLog = buildExerciseLog(steps, nextCompleted)
      const completedSetCount = exerciseLog.reduce((sum, item) => sum + item.completed_sets, 0)
      const durationMinutes = Math.max(1, Math.ceil(elapsedSeconds / 60))
      const summary: WorkoutSessionSummary = {
        completed_from: 'guided_session_player',
        plan_title: plan.title,
        total_exercises: steps.length,
        total_sets: plannedSets,
        completed_sets: completedSetCount,
        elapsed_seconds: elapsedSeconds,
        exercise_log: exerciseLog,
        rep_count: repMetrics.rep_count,
        average_depth: repMetrics.average_depth,
        form_score: repMetrics.form_score,
        form_warnings: repMetrics.form_warnings,
        perceived_difficulty: difficulty,
      }
      completedRef.current = true
      setMode('complete')
      startTransition(() => {
        void onComplete(durationMinutes, summary)
      })
      return
    }

    const restSeconds = Math.max(5, Number(exercise.rest_seconds) || 45)
    setRestRemaining(restSeconds)
    setMode('rest')
  }

  function nextAfterRest() {
    if (!step || !exercise) return
    if (currentSet < targetSets) {
      setCurrentSet((value) => value + 1)
    } else {
      setStepIndex((value) => Math.min(steps.length - 1, value + 1))
      setCurrentSet(1)
    }
    setMode('exercise')
  }

  function skipRest() {
    setRestRemaining(0)
    nextAfterRest()
  }

  if (!step || !exercise) {
    return <div className="rounded-[2rem] border border-border bg-card p-8 text-center font-black">This plan has no playable exercises.</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Link href={`/workouts/${plan.id}`} className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-bold transition hover:border-primary/60">
          <ArrowLeft className="h-4 w-4" /> Plan details
        </Link>
        <div className="flex items-center gap-2 rounded-full bg-card px-4 py-2 text-sm font-black">
          <Clock className="h-4 w-4 text-primary" /> {formatClock(elapsedSeconds)} elapsed
        </div>
      </div>

      <section className="overflow-hidden rounded-[2.5rem] border border-border bg-card">
        <div className="bg-muted p-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.25em] text-primary">Guided session</p>
              <h1 className="mt-2 text-3xl font-black tracking-tight md:text-5xl">{plan.title}</h1>
            </div>
            <div className="rounded-full bg-background px-4 py-2 text-sm font-black">{progress}% complete</div>
          </div>
          <div className="mt-5 h-3 overflow-hidden rounded-full bg-background">
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>

        {mode === 'rest' ? (
          <div className="grid gap-6 p-6 lg:grid-cols-[1fr_0.8fr]">
            <div className="rounded-[2rem] bg-background p-8 text-center">
              <Timer className="mx-auto h-12 w-12 text-primary" />
              <p className="mt-4 text-sm font-black uppercase tracking-[0.2em] text-primary">Rest</p>
              <p className="mt-2 text-7xl font-black tabular-nums">{formatClock(restRemaining)}</p>
              <p className="mx-auto mt-4 max-w-md text-muted-foreground">Breathe, shake out tension, and get ready for the next {currentSet < targetSets ? 'set' : 'exercise'}.</p>
              <button type="button" onClick={skipRest} className="focus-ring mt-6 rounded-full bg-primary px-6 py-3 font-black text-primary-foreground">Skip rest</button>
            </div>
            <SessionSidebar doneSets={doneSets} plannedSets={plannedSets} repMetrics={repMetrics} />
          </div>
        ) : (
          <div className="grid gap-6 p-6 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="space-y-5">
              <div className="rounded-[2rem] bg-background p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="font-black text-primary">{step.block.name} • {step.block.focus}</p>
                    <h2 className="mt-2 text-4xl font-black tracking-tight">{exercise.name}</h2>
                    <p className="mt-2 text-sm font-bold text-muted-foreground">Exercise {stepIndex + 1} of {steps.length} • Set {currentSet} of {targetSets}</p>
                  </div>
                  <div className="rounded-2xl bg-primary/10 px-4 py-3 text-right font-black text-primary">
                    <p>{exercise.reps} reps</p>
                    <p className="text-xs uppercase tracking-widest">target</p>
                  </div>
                </div>
                <ul className="mt-6 space-y-3 text-sm leading-6 text-muted-foreground">
                  {exercise.instructions.map((instruction) => <li key={instruction} className="rounded-2xl bg-card p-4">• {instruction}</li>)}
                </ul>
                <div className="mt-6 flex flex-wrap gap-3">
                  <button type="button" onClick={markSetComplete} disabled={isPending} className="focus-ring inline-flex items-center gap-2 rounded-full bg-primary px-6 py-4 font-black text-primary-foreground transition hover:scale-[1.02] disabled:opacity-60">
                    {isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <CheckCircle2 className="h-5 w-5" />} Complete set
                  </button>
                  <button type="button" onClick={() => setCurrentSet(1)} className="focus-ring inline-flex items-center gap-2 rounded-full border border-border bg-card px-6 py-4 font-black transition hover:bg-muted">
                    <RotateCcw className="h-5 w-5" /> Reset set counter
                  </button>
                </div>
              </div>

              <DifficultyPicker value={difficulty} onChange={setDifficulty} />
            </div>

            <div className="space-y-5">
              <PoseRepCounter key={activeExerciseKey} active={mode === 'exercise' && !isPending} exerciseName={exercise.name} onMetricsChange={setRepMetrics} />
              <SessionSidebar doneSets={doneSets} plannedSets={plannedSets} repMetrics={repMetrics} />
            </div>
          </div>
        )}
      </section>

      {mode === 'complete' ? (
        <div className="rounded-[2rem] border border-primary/40 bg-primary/10 p-6 text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
          <h2 className="mt-3 text-2xl font-black">Saving session and generating coach feedback…</h2>
        </div>
      ) : null}
    </div>
  )
}

function SessionSidebar({ doneSets, plannedSets, repMetrics }: { doneSets: number; plannedSets: number; repMetrics: RepCounterMetrics }) {
  return (
    <aside className="rounded-[2rem] border border-border bg-background p-5">
      <h3 className="flex items-center gap-2 text-xl font-black"><Dumbbell className="h-5 w-5 text-primary" /> Session metrics</h3>
      <div className="mt-5 grid grid-cols-2 gap-3">
        <Metric label="Sets" value={`${doneSets}/${plannedSets}`} />
        <Metric label="CV reps" value={String(repMetrics.rep_count)} />
        <Metric label="Avg depth" value={`${repMetrics.average_depth}%`} />
        <Metric label="Form" value={`${repMetrics.form_score}`} />
      </div>
      <p className="mt-4 rounded-2xl bg-muted p-3 text-sm font-bold text-muted-foreground">{repMetrics.current_cue}</p>
      {repMetrics.form_warnings.length ? <ul className="mt-3 space-y-2 text-sm text-muted-foreground">{repMetrics.form_warnings.map((warning) => <li key={warning}>• {warning}</li>)}</ul> : null}
    </aside>
  )
}

function DifficultyPicker({ value, onChange }: { value: NonNullable<WorkoutSessionSummary['perceived_difficulty']>; onChange: (value: NonNullable<WorkoutSessionSummary['perceived_difficulty']>) => void }) {
  const options: NonNullable<WorkoutSessionSummary['perceived_difficulty']>[] = ['too_easy', 'just_right', 'too_hard']
  return (
    <div className="rounded-[2rem] border border-border bg-background p-5">
      <p className="font-black">How does this feel?</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {options.map((option) => (
          <button key={option} type="button" onClick={() => onChange(option)} className={`rounded-full px-4 py-2 text-sm font-black capitalize transition ${value === option ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-card'}`}>
            {option.replace('_', ' ')}
          </button>
        ))}
      </div>
    </div>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl bg-card p-4"><p className="text-xs font-black uppercase tracking-widest text-muted-foreground">{label}</p><p className="mt-1 text-2xl font-black">{value}</p></div>
}
