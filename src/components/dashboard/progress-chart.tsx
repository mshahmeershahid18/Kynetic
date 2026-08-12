import type { WeeklyProgressPoint } from '@/lib/dashboard/gamification'

export function ProgressChart({ points }: { points: WeeklyProgressPoint[] }) {
  const maxMinutes = Math.max(30, ...points.map((point) => point.minutes))

  return (
    <section className="rounded-[2.5rem] border border-border bg-card p-8 shadow-sm">
      <div className="mb-8 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <h2 className="text-2xl font-black tracking-tight">7-day progress</h2>
          <p className="mt-2 text-sm text-muted-foreground">Workout minutes, session count, and tracked form scores from saved history.</p>
        </div>
      </div>

      <div className="flex h-64 items-end gap-3 rounded-[2rem] bg-muted/50 p-5">
        {points.map((point) => {
          const height = Math.max(point.minutes ? 14 : 4, Math.round((point.minutes / maxMinutes) * 100))

          return (
            <div key={point.dateKey} className="flex flex-1 flex-col items-center gap-3">
              <div className="flex h-40 w-full items-end justify-center">
                <div
                  className="w-full max-w-12 rounded-t-2xl bg-primary shadow-sm transition-all"
                  style={{ height: `${height}%` }}
                  title={`${point.minutes} minutes`}
                />
              </div>
              <div className="text-center">
                <p className="text-xs font-black uppercase text-muted-foreground">{point.label}</p>
                <p className="text-sm font-black">{point.minutes}m</p>
                <p className="text-[11px] text-muted-foreground">
                  {point.sessions} session{point.sessions === 1 ? '' : 's'}
                </p>
              </div>
            </div>
          )
        })}
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        {points.filter((point) => point.averageFormScore !== null).slice(-3).map((point) => (
          <div key={`${point.dateKey}-form`} className="rounded-2xl bg-muted p-4">
            <p className="text-xs font-bold text-muted-foreground">{point.label} form</p>
            <p className="mt-1 text-2xl font-black">{point.averageFormScore}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
