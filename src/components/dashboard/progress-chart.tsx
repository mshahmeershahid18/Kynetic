import type { WeeklyProgressPoint } from '@/lib/dashboard/gamification'

export function ProgressChart({ points }: { points: WeeklyProgressPoint[] }) {
  const maxMinutes = Math.max(30, ...points.map((point) => point.minutes))
  const totalMinutes = points.reduce((sum, point) => sum + point.minutes, 0)
  const totalSessions = points.reduce((sum, point) => sum + point.sessions, 0)

  return (
    <section className="rounded-2xl border border-border bg-card">
      <header className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border px-6 py-4">
        <h2 className="text-sm font-semibold">Last 7 days</h2>
        <p className="text-xs text-muted-foreground tabular-nums">
          {totalSessions} {totalSessions === 1 ? 'session' : 'sessions'} · {totalMinutes} min
        </p>
      </header>

      <div className="px-6 py-6">
        <div className="flex h-40 items-end gap-2">
          {points.map((point) => {
            const height = point.minutes ? Math.max(6, Math.round((point.minutes / maxMinutes) * 100)) : 2

            return (
              <div key={point.dateKey} className="group flex flex-1 flex-col items-center gap-2">
                <div className="relative flex w-full flex-1 items-end">
                  <div
                    className={`w-full rounded-t-md transition-all duration-500 ${
                      point.minutes ? 'bg-primary' : 'bg-muted'
                    }`}
                    style={{ height: `${height}%` }}
                  />
                  {point.minutes ? (
                    <span className="pointer-events-none absolute -top-6 left-1/2 -translate-x-1/2 rounded-md bg-foreground px-1.5 py-0.5 text-[10px] font-medium text-background opacity-0 transition group-hover:opacity-100">
                      {point.minutes}m
                    </span>
                  ) : null}
                </div>
                <span className="text-[11px] text-muted-foreground">{point.label}</span>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
