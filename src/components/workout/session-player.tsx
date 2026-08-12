'use client'

import { useEffect, useMemo, useState, useTransition, type ReactNode } from 'react'
import Link from 'next/link'
import { ArrowLeft, CheckCircle2, ChevronRight, Clock, Dumbbell, Loader2, Pause, Play, RotateCcw, Timer } from 'lucide-react'

import type { WorkoutExercise, WorkoutPlanRecord, WorkoutSessionSummary } from '@/lib/workouts/types'

type PlayerStep = {
  blockName: string
  blockFocus: string
  exercise: WorkoutExercise
}

type PlayerPhase = 'ready' | 'exercise' | 'rest' | 'complete'

function flattenWorkout(plan: WorkoutPlanRecord): PlayerStep[] {
  return plan.plan.blocks.flatMap((block) =>
    block.exercises.map((exercise) => ({
      blockName: block.name,
      blockFocus: block.focus,
      exercise,
    })),
  )
}

function formatTime(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

function buildSummary(args: {
  plan: WorkoutPlanRecord
  steps: PlayerStep[]
  completedSets: Record<string, number>
  elapsedSeconds: number
}): WorkoutSessionSummary {
  const exerciseLog = args.steps.map((step, index) => ({
    name: step.exercise.name,
    block: step.blockName,
    target_sets: step.exercise.sets,
    completed_sets: args.completedSets[String(index)] ?? 0,
    target_reps: step.exercise.reps,
    rest_seconds: step.exercise.rest_seconds,
  }))

  return {
    completed_from: 'guided_session_player',
    plan_title: args.plan.title,
    total_exercises: args.steps.length,
    total_sets: exerciseLog.reduce((total, item) => total + item.target_sets, 0),
    completed_sets: exerciseLog.reduce((total, item) => total + item.completed_sets, 0),
    exercise_log: exerciseLog,
  }
}

export function SessionPlayer({
  plan,
  onComplete,
}: {
  plan: WorkoutPlanRecord
  onComplete: (durationMinutes: number, summary: WorkoutSessionSummary) => Promise<void>
}) {
  const steps = useMemo(() => flattenWorkout(plan), [plan])
  const [phase, setPhase] = useState<PlayerPhase>('ready')
  const [currentIndex, setCurrentIndex] = useState(0)
  const [currentSet, setCurrentSet] = useState(1)
  const [restRemaining, setRestRemaining] = useState(0)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [completedSets, setCompletedSets] = useState<Record<string, number>>({})
  const [isPending, startTransition] = useTransition()

  const current = steps[currentIndex]
  const progressSets = Object.values(completedSets).reduce((total, value) => total + value, 0)
  const totalSets = steps.reduce((total, step) => total + step.exercise.sets, 0)
  const progressPercent = totalSets ? Math.round((progressSets / totalSets) * 100) : 0

  useEffect(() => {
    if (phase !== 'exercise' && phase !== 'rest') return
    const timer = window.setInterval(() => setElapsedSeconds((value) => value + 1), 1000)
    return () => window.clearInterval(timer)
  }, [phase])

  useEffect(() => {
    if (phase !== 'rest') return
    if (restRemaining <= 0) {
      setPhase('exercise')
      return
    }

    const timer = window.setTimeout(() => setRestRemaining((value) => Math.max(value - 1, 0)), 1000)
    return () => window.clearTimeout(timer)
  }, [phase, restRemaining])

  function resetPlayer() {
    setPhase('ready')
    setCurrentIndex(0)
    setCurrentSet(1)
    setRestRemaining(0)
    setElapsedSeconds(0)
    setCompletedSets({})
  }

  function advanceAfterSet() {
    if (!current) return

    const nextCompletedSets = {
      ...completedSets,
      [String(currentIndex)]: (completedSets[String(currentIndex)] ?? 0) + 1,
    }
    setCompletedSets(nextCompletedSets)

    const hasMoreSets = currentSet < current.exercise.sets
    const hasMoreExercises = currentIndex < steps.length - 1

    if (hasMoreSets) {
      setCurrentSet((set) => set + 1)
      setRestRemaining(current.exercise.rest_seconds)
      setPhase('rest')
      return
    }

    if (hasMoreExercises) {
      setCurrentIndex((index) => index + 1)
      setCurrentSet(1)
      setRestRemaining(current.exercise.rest_seconds)
      setPhase('rest')
      return
    }

    setPhase('complete')
    saveSession(nextCompletedSets)
  }

  function saveSession(setsSnapshot: Record<string, number> = completedSets) {
    const durationMinutes = Math.max(1, Math.ceil(elapsedSeconds / 60))
    const summary = buildSummary({ plan, steps, completedSets: setsSnapshot, elapsedSeconds })
    startTransition(async () => {
      await onComplete(durationMinutes, { ...summary, elapsed_seconds: elapsedSeconds })
    })
  }

  function completeSession() {
    saveSession()
  }

  if (!steps.length || !current) {
    return (
      <div className="rounded-[2.5rem] border border-border bg-card p-8 text-center">
        <Dumbbell className="mx-auto h-10 w-10 text-primary" />
        <h1 className="mt-4 text-3xl font-black">This plan has no exercises</h1>
        <Link href={`/workouts/${plan.id}`} className="mt-6 inline-flex rounded-full bg-primary px-5 py-3 font-black text-primary-foreground">
          Back to plan
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <Link href={`/workouts/${plan.id}`} className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-bold transition hover:border-primary/60">
          <ArrowLeft className="h-4 w-4" /> Plan details
        </Link>
        <button onClick={resetPlayer} className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-bold transition hover:bg-muted">
          <RotateCcw className="h-4 w-4" /> Reset
        </button>
      </div>

      <section className="overflow-hidden rounded-[2.5rem] border border-border bg-card shadow-sm">
        <div className="border-b border-border bg-muted/60 p-6">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.2em] text-primary">Guided workout player</p>
              <h1 className="mt-2 text-3xl font-black tracking-tight md:text-4xl">{plan.title}</h1>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
              <Stat icon={<Clock className="h-4 w-4" />} label="Elapsed" value={formatTime(elapsedSeconds)} />
              <Stat icon={<Timer className="h-4 w-4" />} label="Progress" value={`${progressPercent}%`} />
              <Stat icon={<Dumbbell className="h-4 w-4" />} label="Sets" value={`${progressSets}/${totalSets}`} />
            </div>
          </div>
          <div className="mt-6 h-3 overflow-hidden rounded-full bg-background">
            <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${progressPercent}%` }} />
          </div>
        </div>

        <div className="grid gap-0 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="p-6 md:p-8">
            {phase === 'rest' ? (
              <div className="flex min-h-[360px] flex-col items-center justify-center rounded-[2rem] bg-background p-8 text-center">
                <Pause className="h-12 w-12 text-primary" />
                <p className="mt-4 text-sm font-black uppercase tracking-[0.25em] text-primary">Rest</p>
                <p className="mt-3 text-7xl font-black tabular-nums">{formatTime(restRemaining)}</p>
                <p className="mt-4 text-muted-foreground">Next: {current.exercise.name}</p>
                <button onClick={() => setPhase('exercise')} className="mt-8 rounded-full bg-primary px-6 py-3 font-black text-primary-foreground transition hover:scale-[1.02]">
                  Skip rest
                </button>
              </div>
            ) : phase === 'complete' ? (
              <div className="flex min-h-[360px] flex-col items-center justify-center rounded-[2rem] bg-background p-8 text-center">
                <CheckCircle2 className="h-14 w-14 text-green-500" />
                <h2 className="mt-5 text-4xl font-black">Session complete</h2>
                <p className="mt-3 max-w-md text-muted-foreground">Save this guided workout to your Supabase workout history.</p>
                <button disabled={isPending} onClick={completeSession} className="mt-8 inline-flex items-center gap-2 rounded-full bg-primary px-7 py-4 font-black text-primary-foreground transition hover:scale-[1.02] disabled:opacity-60">
                  {isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <CheckCircle2 className="h-5 w-5" />}
                  {isPending ? 'Saving...' : 'Save completion'}
                </button>
              </div>
            ) : (
              <div className="rounded-[2rem] bg-background p-6 md:p-8">
                <p className="text-sm font-black text-primary">{current.blockName} • {current.blockFocus}</p>
                <h2 className="mt-3 text-4xl font-black tracking-tight">{current.exercise.name}</h2>
                <p className="mt-2 text-sm font-bold text-muted-foreground">{current.exercise.muscle_group} • {current.exercise.equipment}</p>

                <div className="mt-8 grid gap-3 sm:grid-cols-3">
                  <BigMetric label="Set" value={`${currentSet}/${current.exercise.sets}`} />
                  <BigMetric label="Target" value={current.exercise.reps} />
                  <BigMetric label="Rest" value={`${current.exercise.rest_seconds}s`} />
                </div>

                <div className="mt-8 space-y-3">
                  <h3 className="font-black">Coaching cues</h3>
                  {current.exercise.instructions.map((instruction) => (
                    <p key={instruction} className="rounded-2xl border border-border bg-card p-4 text-sm leading-6 text-muted-foreground">
                      {instruction}
                    </p>
                  ))}
                </div>

                {phase === 'ready' ? (
                  <button onClick={() => setPhase('exercise')} className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-7 py-4 font-black text-primary-foreground transition hover:scale-[1.01]">
                    <Play className="h-5 w-5 fill-primary-foreground" /> Start workout
                  </button>
                ) : (
                  <button onClick={advanceAfterSet} className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-7 py-4 font-black text-primary-foreground transition hover:scale-[1.01]">
                    Complete set <ChevronRight className="h-5 w-5" />
                  </button>
                )}
              </div>
            )}
          </div>

          <aside className="border-t border-border bg-muted/40 p-6 lg:border-l lg:border-t-0">
            <h3 className="text-xl font-black">Exercise queue</h3>
            <div className="mt-5 space-y-3">
              {steps.map((step, index) => (
                <div key={`${step.blockName}-${step.exercise.name}`} className={`rounded-2xl border p-4 ${index === currentIndex ? 'border-primary bg-primary/10' : 'border-border bg-card'}`}>
                  <p className="font-black">{step.exercise.name}</p>
                  <p className="mt-1 text-xs font-bold text-muted-foreground">{step.exercise.sets} sets × {step.exercise.reps}</p>
                </div>
              ))}
            </div>
          </aside>
        </div>
      </section>
    </div>
  )
}

function Stat({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return <div className="rounded-2xl bg-background px-4 py-3"><div className="flex items-center gap-2 text-primary">{icon}<span className="text-xs font-bold text-muted-foreground">{label}</span></div><p className="mt-1 font-black">{value}</p></div>
}

function BigMetric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl border border-border bg-card p-4"><p className="text-xs font-black uppercase tracking-widest text-muted-foreground">{label}</p><p className="mt-2 text-2xl font-black">{value}</p></div>
}
