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
    <div className="rounded-2xl border border-border bg-card px-5 py-4">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
      </div>
      <p className="mt-2 truncate text-2xl font-semibold tabular-nums">{value}</p>
      {detail ? <p className="mt-1 truncate text-xs text-muted-foreground">{detail}</p> : null}
    </div>
  )
}
