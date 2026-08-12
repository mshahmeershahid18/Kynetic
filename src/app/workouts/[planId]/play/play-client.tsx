'use client'

import { SessionPlayer } from '@/components/workout/session-player'
import { completeWorkoutAction } from '@/app/workouts/actions'
import type { WorkoutPlanRecord } from '@/lib/workouts/types'

export function PlayClient({ plan }: { plan: WorkoutPlanRecord }) {
  const handleComplete = async (duration: number) => {
    const formData = new FormData()
    formData.append('plan_id', plan.id)
    formData.append('duration_minutes', duration.toString())
    await completeWorkoutAction(formData)
  }

  return <SessionPlayer plan={plan} onComplete={handleComplete} />
}
