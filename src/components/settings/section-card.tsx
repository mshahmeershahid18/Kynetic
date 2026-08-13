export function SectionCard({
  title,
  description,
  children,
  tone = 'default',
}: {
  title: string
  description?: string
  children: React.ReactNode
  tone?: 'default' | 'danger'
}) {
  const border = tone === 'danger' ? 'border-destructive/40' : 'border-border'

  return (
    <section className={`rounded-2xl border ${border} bg-card/60 backdrop-blur-sm`}>
      <header className="border-b border-border px-6 py-4">
        <h2 className="text-sm font-semibold">{title}</h2>
        {description ? (
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{description}</p>
        ) : null}
      </header>
      <div className="px-6 py-5">{children}</div>
    </section>
  )
}
