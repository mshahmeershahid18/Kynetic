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
    <div className="rounded-3xl border border-border bg-card p-5 shadow-sm">
      <Icon className="mb-3 h-6 w-6 text-primary" />
      <p className="text-sm font-bold text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-black leading-tight">{value}</p>
      {detail ? <p className="mt-2 text-xs leading-5 text-muted-foreground">{detail}</p> : null}
    </div>
  )
}
