import { Award, Lock } from 'lucide-react'
import type { DashboardAchievement } from '@/lib/dashboard/gamification'

export function AchievementsCard({ achievements }: { achievements: DashboardAchievement[] }) {
  const unlockedCount = achievements.filter((achievement) => achievement.unlocked).length

  return (
    <section className="rounded-[2.5rem] border border-border bg-card p-8 shadow-sm">
      <div className="mb-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <h2 className="text-2xl font-black tracking-tight">Achievements</h2>
          <p className="mt-2 text-sm text-muted-foreground">Reward badges for consistency, training volume, rep tracking, and AI coach usage.</p>
        </div>
        <span className="rounded-full bg-primary/10 px-4 py-2 text-sm font-black text-primary">
          {unlockedCount}/{achievements.length} unlocked
        </span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {achievements.map((achievement) => (
          <article key={achievement.id} className={`rounded-[2rem] border p-5 transition ${achievement.unlocked ? 'border-primary/40 bg-primary/5' : 'border-border bg-background'}`}>
            <div className="flex items-start gap-4">
              <div className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl ${achievement.unlocked ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                {achievement.unlocked ? <Award className="h-6 w-6" /> : <Lock className="h-5 w-5" />}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-black">{achievement.title}</h3>
                <p className="mt-1 text-sm leading-5 text-muted-foreground">{achievement.description}</p>
              </div>
            </div>
            <div className="mt-5">
              <div className="mb-2 flex justify-between text-xs font-bold text-muted-foreground">
                <span>Progress</span>
                <span>{achievement.progress}/{achievement.target}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary" style={{ width: `${Math.round((achievement.progress / achievement.target) * 100)}%` }} />
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
