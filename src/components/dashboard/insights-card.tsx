import { Lightbulb } from 'lucide-react'

export function InsightsCard({ insights }: { insights: string[] }) {
  return (
    <section className="rounded-2xl border border-border bg-card">
      <header className="flex items-center gap-2 border-b border-border px-6 py-4">
        <Lightbulb className="h-4 w-4 text-muted-foreground" />
        <h2 className="text-sm font-semibold">Insights</h2>
      </header>

      {insights.length ? (
        <ul className="divide-y divide-border">
          {insights.map((insight) => (
            <li key={insight} className="px-6 py-3.5 text-sm leading-relaxed text-muted-foreground">
              {insight}
            </li>
          ))}
        </ul>
      ) : (
        <p className="px-6 py-5 text-sm text-muted-foreground">
          Complete a few sessions and insights from your history will appear here.
        </p>
      )}
    </section>
  )
}
