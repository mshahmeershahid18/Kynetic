import Link from 'next/link'
import { redirect } from 'next/navigation'
import {
  Activity,
  ArrowRight,
  CalendarDays,
  Dumbbell,
  Flame,
  MessageSquareQuote,
  Play,
  Timer,
  Video,
} from 'lucide-react'

import { AchievementsCard } from '@/components/dashboard/achievements-card'
import { AvatarCard } from '@/components/dashboard/avatar-card'
import { InsightsCard } from '@/components/dashboard/insights-card'
import { ProgressChart } from '@/components/dashboard/progress-chart'
import { StatCard } from '@/components/dashboard/stat-card'
import { WorkoutHistoryCard } from '@/components/dashboard/workout-history-card'
import { ConfigNotice } from '@/components/layout/config-notice'
import { GenerateWorkoutButton, WorkoutHistory } from '@/components/workouts/workout-plan-card'
import { buildDashboardGamification } from '@/lib/dashboard/gamification'
import type { FitnessProfile } from '@/lib/profiles/types'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import type { AiFeedbackRecord, WorkoutPlanRecord, WorkoutSessionRecord } from '@/lib/workouts/types'

export const metadata = { title: 'Dashboard · Kynetic' }

// Per-user, auth-gated data — never prerender or cache this across users.
export const dynamic = 'force-dynamic'

export default async function DashboardPage({
  searchParams,
}: {
  searchParams?: { message?: string }
}) {
  const supabase = createServerSupabaseClient()
  if (!supabase) return <ConfigNotice />

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profileRow } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (!profileRow || !profileRow.onboarding_completed) redirect('/onboarding')
  const profile = profileRow as FitnessProfile

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
  const game = buildDashboardGamification({ sessions, plans, feedbackRecords })

  const firstName = profile.full_name?.split(' ')[0]
  const hasTrained = game.completedSessions > 0

  return (
    <main className="relative min-h-screen bg-muted/20 bg-grid overflow-hidden">
      <div className="pointer-events-none absolute -top-64 -right-64 h-[600px] w-[600px] rounded-full bg-primary/20 blur-[120px] mix-blend-screen" />
      <div className="pointer-events-none absolute top-1/3 -left-64 h-[500px] w-[500px] rounded-full bg-secondary/10 blur-[120px] mix-blend-screen" />
      
      <div className="container-shell relative z-10 max-w-6xl space-y-6 pb-16 pt-8">
        {/* Header --------------------------------------------------------- */}
        <header className="flex flex-wrap items-center justify-between gap-4 animate-fade-in-up">
          <div className="min-w-0">
            <h1 className="truncate font-display text-2xl font-bold tracking-tight sm:text-3xl">
              {firstName ? `Welcome back, ${firstName}` : 'Dashboard'}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm font-medium">
              <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-primary">Level {game.level}</span>
              <span className="rounded-full bg-muted px-2.5 py-0.5 text-muted-foreground tabular-nums">{game.xp.toLocaleString()} XP</span>
              {hasTrained ? (
                <span className="rounded-full bg-orange-500/10 px-2.5 py-0.5 text-orange-600 dark:text-orange-400 tabular-nums">
                  {game.currentStreak} day{game.currentStreak === 1 ? '' : 's'} streak
                </span>
              ) : null}
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap gap-2">
            <Link
              href="/form-check"
              className="focus-ring inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3.5 py-2 text-sm font-medium transition hover:bg-muted"
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

        {/* Level progress -------------------------------------------------- */}
        <div className="animate-fade-in-up rounded-2xl border border-border bg-card/60 backdrop-blur-md px-6 py-5 shadow-sm" style={{ animationDelay: '0.1s' }}>
          <div className="flex items-baseline justify-between gap-3 text-sm font-medium">
            <span className="text-foreground">Level {game.level} Progress</span>
            <span className="tabular-nums text-muted-foreground">
              {game.xpIntoLevel.toLocaleString()} / {game.xpForNextLevel.toLocaleString()} XP
            </span>
          </div>
          <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-muted/50 shadow-inner">
            <div
              className="h-full rounded-full bg-gradient-to-r from-primary to-emerald-400 transition-all duration-1000 ease-out"
              style={{ width: `${game.levelProgress}%` }}
            />
          </div>
        </div>

        {/* Stats ----------------------------------------------------------- */}
        <div className="animate-fade-in-up grid grid-cols-2 gap-4 lg:grid-cols-4" style={{ animationDelay: '0.2s' }}>
          <StatCard
            icon={Flame}
            label="Streak"
            value={`${game.currentStreak}d`}
            detail={game.longestStreak ? `Best ${game.longestStreak}d` : 'Train today to start'}
          />
          <StatCard
            icon={Dumbbell}
            label="Sessions"
            value={game.completedSessions}
            detail={`${plans.length} plan${plans.length === 1 ? '' : 's'} generated`}
          />
          <StatCard
            icon={Timer}
            label="Minutes"
            value={game.totalMinutes}
            detail="Lifetime training time"
          />
          <StatCard
            icon={Activity}
            label="Form score"
            value={game.averageFormScore ?? '—'}
            detail={game.averageFormScore ? 'Average from tracked reps' : 'No tracked reps yet'}
          />
        </div>

        {/* Primary grid ---------------------------------------------------- */}
        <div className="animate-fade-in-up grid gap-6 lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)]" style={{ animationDelay: '0.3s' }}>
          {/* Left rail */}
          <div className="space-y-6">
            <AvatarCard profile={profile} />

            <section className="rounded-2xl border border-border bg-card">
              <header className="flex items-center justify-between gap-3 px-5 py-4">
                <h2 className="text-sm font-semibold">Training profile</h2>
                <Link
                  href="/settings"
                  className="focus-ring text-xs font-medium text-primary hover:underline"
                >
                  Edit
                </Link>
              </header>
              <dl className="divide-y divide-border border-t border-border text-sm">
                <ProfileRow label="Goal" value={profile.goal ?? 'Not set'} />
                <ProfileRow label="Experience" value={profile.experience_level ?? 'None'} />
                <ProfileRow label="Activity" value={profile.fitness_level ?? 'Not set'} />
                <ProfileRow
                  label="Schedule"
                  value={
                    profile.available_days_per_week && profile.preferred_session_minutes
                      ? `${profile.available_days_per_week}×/week · ${profile.preferred_session_minutes} min`
                      : 'Not set'
                  }
                />
                <ProfileRow
                  label="Equipment"
                  value={profile.equipment?.length ? profile.equipment.join(', ') : 'Bodyweight only'}
                />
                {profile.limitations ? (
                  <ProfileRow label="Working around" value={profile.limitations} />
                ) : null}
              </dl>
            </section>
          </div>

          {/* Main column */}
          <div className="space-y-6">
            {/* Next session ------------------------------------------------- */}
            <section className="overflow-hidden rounded-2xl border border-border bg-card/60 backdrop-blur-sm shadow-sm transition-shadow hover:shadow-md">
              {latestPlan ? (
                <>
                  <div className="flex flex-wrap items-start justify-between gap-4 px-6 py-5">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Up next
                      </p>
                      <h2 className="mt-1.5 text-lg font-semibold tracking-tight">
                        {latestPlan.title}
                      </h2>
                      {latestPlan.summary ? (
                        <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-muted-foreground">
                          {latestPlan.summary}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <Link
                        href={`/workouts/${latestPlan.id}`}
                        className="focus-ring inline-flex items-center rounded-lg border border-border px-3.5 py-2 text-sm font-medium transition hover:bg-muted"
                      >
                        Details
                      </Link>
                      <Link
                        href={`/workouts/${latestPlan.id}/play`}
                        className="focus-ring inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90"
                      >
                        <Play className="h-4 w-4" />
                        Start
                      </Link>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 divide-x divide-border border-t border-border">
                    <Cell label="Duration" value={`${latestPlan.duration_minutes ?? '—'} min`} />
                    <Cell label="Difficulty" value={latestPlan.difficulty ?? '—'} />
                    <Cell
                      label="Exercises"
                      value={String(
                        latestPlan.plan.blocks.reduce((n, block) => n + block.exercises.length, 0)
                      )}
                    />
                  </div>
                </>
              ) : (
                <div className="px-6 py-12 text-center">
                  <Dumbbell className="mx-auto h-6 w-6 text-muted-foreground" />
                  <h2 className="mt-4 text-base font-semibold">Generate your first workout</h2>
                  <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
                    Kynetic builds a session from your goal, equipment, available time, and anything
                    you asked it to work around.
                  </p>
                  <div className="mt-6 flex justify-center">
                    <GenerateWorkoutButton pulse />
                  </div>
                </div>
              )}
            </section>

            {/* Your plans (Moved to top) ------------------------------------ */}
            <section className="rounded-2xl border border-border bg-card/60 backdrop-blur-sm shadow-sm">
              <header className="flex items-center gap-2 border-b border-border px-6 py-4">
                <CalendarDays className="h-4 w-4 text-primary" />
                <h2 className="text-sm font-semibold">Your plans</h2>
              </header>
              <div className="px-6 py-5">
                <WorkoutHistory plans={plans} sessions={sessions} />
              </div>
            </section>

            {/* Coach feedback ---------------------------------------------- */}
            <section className="rounded-2xl border border-border bg-card">
              <header className="flex items-center gap-2 border-b border-border px-6 py-4">
                <MessageSquareQuote className="h-4 w-4 text-muted-foreground" />
                <h2 className="text-sm font-semibold">Coach feedback</h2>
              </header>
              {latestFeedback ? (
                <div className="px-6 py-5">
                  <h3 className="text-sm font-medium">{latestFeedback.feedback.headline}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {latestFeedback.feedback.summary}
                  </p>
                  {latestFeedback.feedback.suggestions.length ? (
                    <ul className="mt-4 space-y-2 border-t border-border pt-4">
                      {latestFeedback.feedback.suggestions.slice(0, 3).map((suggestion) => (
                        <li key={suggestion} className="flex gap-2.5 text-sm text-muted-foreground">
                          <ArrowRight className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                          {suggestion}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              ) : (
                <p className="px-6 py-10 text-center text-sm text-muted-foreground">
                  Finish a session and your coach will review your reps, form, and whether the
                  difficulty actually fit.
                </p>
              )}
            </section>

            {hasTrained ? <ProgressChart points={game.weeklyProgress} /> : null}

            <WorkoutHistoryCard sessions={sessions} />

            {hasTrained ? <InsightsCard insights={game.insights} /> : null}

            <AchievementsCard achievements={game.achievements} />
          </div>
        </div>
      </div>
    </main>
  )
}

function ProfileRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 px-5 py-3">
      <dt className="shrink-0 text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium capitalize">{value}</dd>
    </div>
  )
}

function Cell({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-4 py-3.5 text-center">
      <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 truncate text-sm font-semibold capitalize">{value}</p>
    </div>
  )
}
