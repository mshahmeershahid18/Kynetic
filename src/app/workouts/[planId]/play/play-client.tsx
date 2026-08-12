'use client'

import { SessionPlayer } from '@/components/workout/session-player'
import { completeWorkoutAction } from '@/app/workouts/actions'
import type { WorkoutPlanRecord, WorkoutSessionSummary } from '@/lib/workouts/types'

export function PlayClient({ plan }: { plan: WorkoutPlanRecord }) {
  const handleComplete = async (duration: number, summary: WorkoutSessionSummary) => {
    const formData = new FormData()
    formData.append('plan_id', plan.id)
    formData.append('duration_minutes', duration.toString())
    formData.append('session_data', JSON.stringify(summary))
    await completeWorkoutAction(formData)
  }

  return <SessionPlayer plan={plan} onComplete={handleComplete} />
}
