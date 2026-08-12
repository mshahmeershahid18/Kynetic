import { CalendarDays, Timer } from 'lucide-react'
import type { WorkoutSessionRecord } from '@/lib/workouts/types'

export function WorkoutHistoryCard({ sessions }: { sessions: WorkoutSessionRecord[] }) {
  const completed = sessions.filter((session) => session.status === 'completed')

  return (
    <section className="rounded-[2.5rem] border border-border bg-card p-8 shadow-sm">
      <div className="mb-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <h2 className="text-2xl font-black tracking-tight">Workout history</h2>
          <p className="mt-2 text-sm text-muted-foreground">Recent completed sessions with duration, reps, form score, and difficulty capture.</p>
        </div>
      </div>

      {completed.length ? (
        <div className="space-y-4">
          {completed.slice(0, 6).map((session) => (
            <article key={session.id} className="rounded-[2rem] border border-border bg-background p-5">
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                <div>
                  <h3 className="font-black">{session.session_data?.plan_title ?? 'Completed workout'}</h3>
                  <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><CalendarDays className="h-3 w-3" /> {formatDate(session.completed_at)}</span>
                    <span className="flex items-center gap-1"><Timer className="h-3 w-3" /> {session.duration_minutes ?? 0} min</span>
                  </div>
                </div>
                {session.session_data?.perceived_difficulty ? (
                  <span className="rounded-full bg-muted px-3 py-1 text-xs font-black capitalize text-muted-foreground">
                    {session.session_data.perceived_difficulty.replace('_', ' ')}
                  </span>
                ) : null}
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <MiniMetric label="Sets" value={session.session_data?.completed_sets ?? '—'} />
                <MiniMetric label="Reps" value={session.session_data?.rep_count ?? '—'} />
                <MiniMetric label="Form" value={session.session_data?.form_score ?? '—'} />
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="rounded-[2rem] border border-dashed border-border bg-muted/40 p-6 text-sm leading-6 text-muted-foreground">
          Complete a workout from a generated plan to populate charts, streaks, XP, and achievements.
        </div>
      )}
    </section>
  )
}

function MiniMetric({ label, value }: { label: string; value: string | number }) {
  return <div className="rounded-2xl bg-muted p-3"><p className="text-xs font-bold text-muted-foreground">{label}</p><p className="mt-1 text-xl font-black">{value}</p></div>
}

function formatDate(value: string | null) {
  if (!value) return 'Unknown date'
  return new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}
