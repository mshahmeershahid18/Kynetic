import { CalendarDays } from 'lucide-react'

import type { WorkoutSessionRecord } from '@/lib/workouts/types'

const DIFFICULTY_LABEL: Record<string, string> = {
  too_easy: 'Too easy',
  just_right: 'Just right',
  too_hard: 'Too hard',
}

export function WorkoutHistoryCard({ sessions }: { sessions: WorkoutSessionRecord[] }) {
  const completed = sessions.filter((session) => session.status === 'completed').slice(0, 6)

  return (
    <section className="rounded-2xl border border-border bg-card">
      <header className="flex items-center gap-2 border-b border-border px-6 py-4">
        <CalendarDays className="h-4 w-4 text-muted-foreground" />
        <h2 className="text-sm font-semibold">Recent sessions</h2>
      </header>

      {completed.length ? (
        <ul className="divide-y divide-border">
          {completed.map((session) => {
            const data = session.session_data
            return (
              <li key={session.id} className="flex flex-wrap items-center justify-between gap-3 px-6 py-4">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {data?.plan_title ?? 'Workout session'}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {session.completed_at
                      ? new Date(session.completed_at).toLocaleDateString(undefined, {
                          day: 'numeric',
                          month: 'short',
                        })
                      : 'Date unknown'}
                    {data?.perceived_difficulty
                      ? ` · ${DIFFICULTY_LABEL[data.perceived_difficulty] ?? data.perceived_difficulty}`
                      : ''}
                  </p>
                </div>
                <div className="flex shrink-0 gap-4 text-xs tabular-nums">
                  <Stat label="min" value={session.duration_minutes ?? '—'} />
                  <Stat label="sets" value={
                    data?.completed_sets !== undefined && data?.total_sets
                      ? `${data.completed_sets}/${data.total_sets}`
                      : '—'
                  } />
                  <Stat label="reps" value={data?.rep_count ?? '—'} />
                  <Stat label="form" value={data?.form_score ?? '—'} />
                </div>
              </li>
            )
          })}
        </ul>
      ) : (
        <p className="px-6 py-8 text-center text-sm text-muted-foreground">
          No completed sessions yet.
        </p>
      )}
    </section>
  )
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="text-right">
      <p className="font-semibold">{value}</p>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
    </div>
  )
}
