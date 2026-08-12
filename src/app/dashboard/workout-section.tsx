'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { generateWorkoutAction } from '@/app/workouts/actions'
import { Loader2, Plus, Play, Calendar } from 'lucide-react'

export function WorkoutSection({ plans }: { plans: any[] }) {
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  async function handleGenerate() {
    setIsLoading(true)
    try {
      await generateWorkoutAction()
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-2xl font-black tracking-tight">Your Workouts</h2>
        <button 
          onClick={handleGenerate}
          disabled={isLoading}
          className="flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-bold text-primary-foreground transition hover:scale-[1.02] disabled:opacity-50"
        >
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Generate New
        </button>
      </div>

      {!plans || plans.length === 0 ? (
        <div className="flex flex-1 items-center justify-center rounded-2xl border-2 border-dashed border-border bg-muted/30 p-8 text-center">
          <div className="max-w-xs">
            <h3 className="mb-2 text-lg font-bold">No plans yet</h3>
            <p className="text-sm text-muted-foreground">Click generate to let Kynetic build a personalized workout based on your profile.</p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {plans.map((plan) => (
            <div key={plan.id} className="flex items-center justify-between rounded-2xl border border-border bg-background p-4 hover:border-primary transition">
              <div>
                <h3 className="font-bold">{plan.title}</h3>
                <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Calendar className="h-3 w-3"/> {new Date(plan.created_at).toLocaleDateString()}</span>
                  <span className="capitalize">{plan.difficulty}</span>
                  <span>{plan.duration_minutes} min</span>
                </div>
              </div>
              <button 
                onClick={() => router.push(`/workouts/${plan.id}`)}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-secondary-foreground transition hover:scale-105"
              >
                <Play className="h-4 w-4 ml-1" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
