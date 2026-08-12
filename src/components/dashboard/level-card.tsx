import { Trophy } from 'lucide-react'

import type { DashboardGamification } from '@/lib/dashboard/gamification'

export function LevelCard({ gamification }: { gamification: DashboardGamification }) {
  return (
    <section className="rounded-2xl border border-border bg-card px-6 py-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Athlete level
          </p>
          <p className="mt-1 text-2xl font-semibold tracking-tight">Level {gamification.level}</p>
          <p className="mt-1 text-sm text-muted-foreground tabular-nums">
            {gamification.xp.toLocaleString()} lifetime XP
          </p>
        </div>
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-muted">
          <Trophy className="h-5 w-5 text-muted-foreground" />
        </div>
      </div>

      <div className="mt-5">
        <div className="mb-2 flex justify-between text-xs text-muted-foreground tabular-nums">
          <span>{gamification.xpIntoLevel.toLocaleString()} XP</span>
          <span>{gamification.xpForNextLevel.toLocaleString()} XP</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all duration-700"
            style={{ width: `${gamification.levelProgress}%` }}
          />
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          {gamification.levelProgress}% toward level {gamification.level + 1}
        </p>
      </div>
    </section>
  )
}
