import type { WorkoutBlock, WorkoutExercise, WorkoutPlanRecord, WorkoutSessionExerciseLog } from '@/lib/workouts/types'

export type SessionStep = {
  block: WorkoutBlock
  exercise: WorkoutExercise
  exerciseIndex: number
  globalIndex: number
}

export function flattenWorkout(plan: WorkoutPlanRecord): SessionStep[] {
  let globalIndex = 0
  return plan.plan.blocks.flatMap((block) =>
    block.exercises.map((exercise, exerciseIndex) => ({
      block,
      exercise,
      exerciseIndex,
      globalIndex: globalIndex++,
    })),
  )
}

export function totalSets(steps: SessionStep[]) {
  return steps.reduce((sum, step) => sum + Math.max(1, Number(step.exercise.sets) || 1), 0)
}

export function buildExerciseLog(
  steps: SessionStep[],
  completedSetsByExercise: Record<string, number>,
  trackedRepsByExercise: Record<string, number> = {},
): WorkoutSessionExerciseLog[] {
  return steps.map((step) => {
    const key = String(step.globalIndex)
    const sets = Math.max(1, Number(step.exercise.sets) || 1)
    return {
      name: step.exercise.name,
      slug: step.exercise.slug,
      block: step.block.name,
      target_sets: sets,
      completed_sets: Math.min(sets, completedSetsByExercise[key] ?? 0),
      target_reps: step.exercise.reps,
      rest_seconds: step.exercise.rest_seconds,
      tracked_reps: trackedRepsByExercise[key],
    }
  })
}

export function formatClock(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}
