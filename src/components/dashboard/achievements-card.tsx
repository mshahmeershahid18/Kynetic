import { Check, Lock } from 'lucide-react'

import type { DashboardAchievement } from '@/lib/dashboard/gamification'

export function AchievementsCard({ achievements }: { achievements: DashboardAchievement[] }) {
  const unlocked = achievements.filter((achievement) => achievement.unlocked).length

  return (
    <section className="rounded-2xl border border-border bg-card">
      <header className="flex items-center justify-between gap-3 border-b border-border px-6 py-4">
        <h2 className="text-sm font-semibold">Achievements</h2>
        <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground tabular-nums">
          {unlocked}/{achievements.length}
        </span>
      </header>

      <ul className="grid gap-px bg-border sm:grid-cols-2">
        {achievements.map((achievement) => {
          const percent = achievement.target
            ? Math.min(100, Math.round((achievement.progress / achievement.target) * 100))
            : 0

          return (
            <li key={achievement.id} className="bg-card px-5 py-4">
              <div className="flex items-start gap-3">
                <div
                  className={`mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg ${
                    achievement.unlocked ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {achievement.unlocked ? <Check className="h-3.5 w-3.5" /> : <Lock className="h-3 w-3" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{achievement.title}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                    {achievement.description}
                  </p>
                  {!achievement.unlocked ? (
                    <div className="mt-2.5">
                      <div className="h-1 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-muted-foreground/40"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                      <p className="mt-1.5 text-[11px] text-muted-foreground tabular-nums">
                        {achievement.progress} / {achievement.target}
                      </p>
                    </div>
                  ) : null}
                </div>
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
