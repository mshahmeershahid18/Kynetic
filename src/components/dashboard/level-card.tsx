import { Trophy } from 'lucide-react'
import type { DashboardGamification } from '@/lib/dashboard/gamification'

export function LevelCard({ gamification }: { gamification: DashboardGamification }) {
  return (
    <section className="rounded-[2.5rem] border border-border bg-card p-8 shadow-sm">
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-start">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.2em] text-primary">Athlete level</p>
          <h2 className="mt-2 text-4xl font-black tracking-tight">Level {gamification.level}</h2>
          <p className="mt-2 text-sm text-muted-foreground">{gamification.xp.toLocaleString()} lifetime XP earned from completed sessions, reps, form, and coaching loops.</p>
        </div>
        <div className="grid h-20 w-20 place-items-center rounded-3xl bg-primary/10 text-primary">
          <Trophy className="h-10 w-10" />
        </div>
      </div>

      <div className="mt-8">
        <div className="mb-2 flex justify-between text-xs font-black uppercase tracking-widest text-muted-foreground">
          <span>{gamification.xpIntoLevel} XP</span>
          <span>{gamification.xpForNextLevel} XP</span>
        </div>
        <div className="h-4 overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${gamification.levelProgress}%` }} />
        </div>
        <p className="mt-3 text-sm text-muted-foreground">{gamification.xpForNextLevel - gamification.xpIntoLevel} XP until Level {gamification.level + 1}.</p>
      </div>
    </section>
  )
}
