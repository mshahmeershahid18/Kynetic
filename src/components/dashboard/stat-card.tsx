import type { LucideIcon } from 'lucide-react'

export function StatCard({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: LucideIcon
  label: string
  value: string | number
  detail?: string
}) {
  return (
    <div className="group rounded-2xl border border-border bg-card/60 backdrop-blur-md px-5 py-4 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md hover:bg-card/80">
      <div className="flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
          <Icon className="h-4 w-4" />
        </div>
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
      </div>
      <p className="mt-2 truncate text-2xl font-semibold tabular-nums">{value}</p>
      {detail ? <p className="mt-1 truncate text-xs text-muted-foreground">{detail}</p> : null}
    </div>
  )
}
