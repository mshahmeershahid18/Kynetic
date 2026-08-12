import { Lightbulb } from 'lucide-react'

export function InsightsCard({ insights }: { insights: string[] }) {
  return (
    <section className="rounded-[2.5rem] border border-border bg-card p-8 shadow-sm">
      <div className="mb-6 flex items-start gap-3">
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
          <Lightbulb className="h-6 w-6" />
        </div>
        <div>
          <h2 className="text-2xl font-black tracking-tight">AI history insights</h2>
          <p className="mt-2 text-sm text-muted-foreground">Generated from workout history, rep metrics, streaks, and latest coach feedback.</p>
        </div>
      </div>

      <div className="space-y-3">
        {insights.map((insight) => (
          <p key={insight} className="rounded-2xl border border-border bg-background p-4 text-sm leading-6 text-muted-foreground">
            {insight}
          </p>
        ))}
      </div>
    </section>
  )
}
