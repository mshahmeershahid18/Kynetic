import { AlertTriangle } from 'lucide-react'

/**
 * Shown when Supabase credentials are missing.
 *
 * Auth-gated pages cannot do anything useful without a Supabase client, and
 * returning null from them renders a blank white page that looks broken. This
 * says what is actually wrong and how to fix it.
 */
export function ConfigNotice() {
  return (
    <main className="grid min-h-[calc(100vh-4rem)] place-items-center px-5 py-16">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card px-6 py-7 text-center">
        <span className="mx-auto grid h-10 w-10 place-items-center rounded-lg bg-muted">
          <AlertTriangle className="h-5 w-5 text-muted-foreground" />
        </span>
        <h1 className="mt-4 text-lg font-semibold tracking-tight">Supabase is not configured</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          This page needs a database connection. Copy <code className="rounded bg-muted px-1.5 py-0.5 text-xs">.env.example</code> to{' '}
          <code className="rounded bg-muted px-1.5 py-0.5 text-xs">.env.local</code>, fill in your
          Supabase URL and anon key, then restart the dev server.
        </p>
        <p className="mt-4 text-xs text-muted-foreground">
          See the README for the full setup steps, including the schema and seed files.
        </p>
      </div>
    </main>
  )
}
