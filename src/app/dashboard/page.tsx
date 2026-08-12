import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Activity, Dumbbell, Flame, Target, Timer, Video, Zap } from 'lucide-react'

import { AchievementsCard } from '@/components/dashboard/achievements-card'
import { AvatarCard } from '@/components/dashboard/avatar-card'
import { InsightsCard } from '@/components/dashboard/insights-card'
import { LevelCard } from '@/components/dashboard/level-card'
import { ProgressChart } from '@/components/dashboard/progress-chart'
import { StatCard } from '@/components/dashboard/stat-card'
import { WorkoutHistoryCard } from '@/components/dashboard/workout-history-card'
import { GenerateWorkoutButton, WorkoutHistory } from '@/components/workouts/workout-plan-card'
import { buildDashboardGamification } from '@/lib/dashboard/gamification'
import type { FitnessProfile } from '@/lib/profiles/types'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import type { AiFeedbackRecord, WorkoutPlanRecord, WorkoutSessionRecord } from '@/lib/workouts/types'

export const metadata = {
  title: 'Dashboard · Kynetic',
}

// Per-user, auth-gated data — never prerender or cache this across users.
export const dynamic = 'force-dynamic'

export default async function DashboardPage({
  searchParams,
}: {
  searchParams?: { message?: string }
}) {
  const supabase = createServerSupabaseClient()
  if (!supabase) return null

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profileRow } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (!profileRow || !profileRow.age) redirect('/onboarding')
  const profile = profileRow as FitnessProfile

  // Independent reads — issue them together rather than serially.
  const [plansResult, sessionsResult, feedbackResult] = await Promise.all([
    supabase
      .from('workout_plans')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(8),
    supabase
      .from('workout_sessions')
      .select('*')
      .eq('user_id', user.id)
      .order('completed_at', { ascending: false })
      .limit(30),
    supabase
      .from('ai_feedback')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(3),
  ])

  const plans = (plansResult.data ?? []) as WorkoutPlanRecord[]
  const sessions = (sessionsResult.data ?? []) as WorkoutSessionRecord[]
  const feedbackRecords = (feedbackResult.data ?? []) as AiFeedbackRecord[]
  const latestPlan = plans[0]
  const latestFeedback = feedbackRecords[0]
  const gamification = buildDashboardGamification({ sessions, plans, feedbackRecords })

  const firstName = profile.full_name?.split(' ')[0]

  return (
    <main className="min-h-screen bg-muted/20 pb-16 pt-8">
      <div className="container-shell max-w-6xl space-y-6">
        {/* Header ------------------------------------------------------- */}
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              {firstName ? `Welcome back, ${firstName}` : 'Dashboard'}
            </h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              {gamification.completedSessions
                ? `${gamification.completedSessions} sessions completed · ${gamification.currentStreak}-day streak`
                : 'Generate your first workout to get started.'}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/form-check"
              className="focus-ring inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium transition hover:bg-muted"
            >
              <Video className="h-4 w-4" />
              Form check
            </Link>
            <GenerateWorkoutButton compact />
          </div>
        </header>

        {searchParams?.message ? (
          <p className="rounded-xl border border-border bg-card px-4 py-3 text-sm">
            {searchParams.message}
          </p>
        ) : null}

        {/* Stats -------------------------------------------------------- */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard
            icon={Flame}
            label="Streak"
            value={`${gamification.currentStreak}d`}
            detail={`Best ${gamification.longestStreak}d`}
          />
          <StatCard
            icon={Dumbbell}
            label="Sessions"
            value={gamification.completedSessions}
            detail={`${plans.length} plans generated`}
          />
          <StatCard
            icon={Timer}
            label="Minutes"
            value={gamification.totalMinutes}
            detail="Lifetime training time"
          />
          <StatCard
            icon={Activity}
            label="Form"
            value={gamification.averageFormScore ?? '—'}
            detail={gamification.averageFormScore ? 'Average tracked score' : 'No tracked reps yet'}
          />
        </div>

        {/* Main grid ---------------------------------------------------- */}
        <div className="grid gap-6 lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)]">
          {/* Left column */}
          <div className="space-y-6">
            <AvatarCard profile={profile} />
            <LevelCard gamification={gamification} />

            <section className="rounded-2xl border border-border bg-card px-6 py-5">
              <h2 className="text-sm font-semibold">Your profile</h2>
              <dl className="mt-4 space-y-3 text-sm">
                <Row icon={Target} label="Goal" value={profile.goal ?? 'Not set'} />
                <Row icon={Zap} label="Experience" value={profile.experience_level ?? 'none'} />
                <Row
                  icon={Timer}
                  label="Session length"
                  value={profile.preferred_session_minutes ? `${profile.preferred_session_minutes} min` : 'Not set'}
                />
                <Row
                  icon={Dumbbell}
                  label="Equipment"
                  value={profile.equipment?.length ? profile.equipment.join(', ') : 'Bodyweight only'}
                />
              </dl>
              <Link
                href="/onboarding"
                className="focus-ring mt-5 inline-block text-sm font-medium text-primary hover:underline"
              >
                Update profile
              </Link>
            </section>
          </div>

          {/* Right column */}
          <div className="space-y-6">
            {/* Next session */}
            <section className="rounded-2xl border border-border bg-card">
              <header className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-6 py-5">
                <div className="min-w-0">
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Next session
                  </p>
                  <h2 className="mt-1 truncate text-lg font-semibold tracking-tight">
                    {latestPlan?.title ?? 'No workout generated yet'}
                  </h2>
                  <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-muted-foreground">
                    {latestPlan?.summary ??
                      'Kynetic builds a session from your goal, experience, equipment, limitations, and how your recent workouts actually went.'}
                  </p>
                </div>
                {latestPlan ? (
                  <Link
                    href={`/workouts/${latestPlan.id}/play`}
                    className="focus-ring inline-flex shrink-0 items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90"
                  >
                    Start session
                  </Link>
                ) : (
                  <GenerateWorkoutButton compact />
                )}
              </header>
              {latestPlan ? (
                <div className="grid grid-cols-3 divide-x divide-border">
                  <Cell label="Duration" value={`${latestPlan.duration_minutes ?? '—'} min`} />
                  <Cell label="Difficulty" value={latestPlan.difficulty ?? '—'} />
                  <Cell
                    label="Exercises"
                    value={String(
                      latestPlan.plan.blocks.reduce((total, block) => total + block.exercises.length, 0)
                    )}
                  />
                </div>
              ) : null}
            </section>

            <ProgressChart points={gamification.weeklyProgress} />

            {/* Latest coaching */}
            <section className="rounded-2xl border border-border bg-card">
              <header className="border-b border-border px-6 py-4">
                <h2 className="text-sm font-semibold">Coach feedback</h2>
              </header>
              {latestFeedback ? (
                <div className="px-6 py-5">
                  <h3 className="text-sm font-medium">{latestFeedback.feedback.headline}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {latestFeedback.feedback.summary}
                  </p>
                  {latestFeedback.feedback.suggestions.length ? (
                    <ul className="mt-4 space-y-2">
                      {latestFeedback.feedback.suggestions.slice(0, 3).map((suggestion) => (
                        <li key={suggestion} className="flex gap-2.5 text-sm text-muted-foreground">
                          <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-muted-foreground" />
                          {suggestion}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              ) : (
                <p className="px-6 py-8 text-center text-sm text-muted-foreground">
                  Complete a session to get personalized coaching on your reps, form, and difficulty.
                </p>
              )}
            </section>

            <InsightsCard insights={gamification.insights} />
            <WorkoutHistoryCard sessions={sessions} />
            <AchievementsCard achievements={gamification.achievements} />

            <section className="rounded-2xl border border-border bg-card">
              <header className="border-b border-border px-6 py-4">
                <h2 className="text-sm font-semibold">Your workouts</h2>
              </header>
              <div className="px-6 py-5">
                <WorkoutHistory plans={plans} sessions={sessions} />
              </div>
            </section>
          </div>
        </div>
      </div>
    </main>
  )
}

function Row({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Target
  label: string
  value: string
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <dt className="flex items-center gap-2 text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </dt>
      <dd className="truncate text-right font-medium capitalize">{value}</dd>
    </div>
  )
}

function Cell({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-4 py-4 text-center">
      <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 truncate text-sm font-semibold capitalize">{value}</p>
    </div>
  )
}
