import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowLeft, Video } from 'lucide-react'

import { FormCheckClient } from '@/app/form-check/form-check-client'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { visionLabel } from '@/lib/vision/exercise-analyzers'
import type { FormAnalysisRecord } from '@/lib/workouts/types'

export const metadata = {
  title: 'Form check · Kynetic',
  description: 'Upload a video of your set and get an automated rep count and form analysis.',
}

export default async function FormCheckPage() {
  const supabase = createServerSupabaseClient()
  if (!supabase) return null

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data } = await supabase
    .from('form_analyses')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(10)

  const history = (data ?? []) as FormAnalysisRecord[]

  return (
    <main className="min-h-screen bg-muted/20 pb-20 pt-8">
      <div className="container-shell max-w-3xl">
        <Link
          href="/dashboard"
          className="focus-ring inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3.5 py-2 text-sm font-medium transition hover:bg-muted"
        >
          <ArrowLeft className="h-4 w-4" />
          Dashboard
        </Link>

        <header className="mb-8 mt-6">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Form check</h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
            Not in the mood for a live session? Film one set, upload it here, and Kynetic
            counts your reps and scores your technique. Everything is analysed on your own
            device — the video is never uploaded to a server.
          </p>
        </header>

        <FormCheckClient />

        <section className="mt-10">
          <h2 className="text-sm font-semibold">Recent form checks</h2>
          {history.length ? (
            <ul className="mt-4 space-y-2">
              {history.map((record) => (
                <li
                  key={record.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{visionLabel(record.vision_kind)}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(record.created_at).toLocaleDateString(undefined, {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                  <div className="flex gap-5 text-sm tabular-nums">
                    <span>
                      <span className="text-muted-foreground">Reps </span>
                      <span className="font-semibold">{record.rep_count}</span>
                    </span>
                    <span>
                      <span className="text-muted-foreground">Depth </span>
                      <span className="font-semibold">{record.average_depth ?? '—'}%</span>
                    </span>
                    <span>
                      <span className="text-muted-foreground">Form </span>
                      <span className="font-semibold">{record.form_score ?? '—'}</span>
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="mt-4 flex flex-col items-center gap-2 rounded-xl border border-dashed border-border px-6 py-10 text-center">
              <Video className="h-5 w-5 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Your saved form checks will appear here.
              </p>
            </div>
          )}
        </section>
      </div>
    </main>
  )
}
