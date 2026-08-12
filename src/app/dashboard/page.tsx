import { createServerSupabaseClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AnimatedSection } from '@/components/landing/animated-section'
import { GenerateWorkoutButton, WorkoutHistory } from '@/components/workouts/workout-plan-card'
import type { AiFeedbackRecord, WorkoutPlanRecord, WorkoutSessionRecord } from '@/lib/workouts/types'
import { Activity, CalendarDays, Dumbbell, Lightbulb, Target, Timer, User as UserIcon } from 'lucide-react'

// Avatar visually reflects BMI & Experience
function Avatar({ state }: { state: string }) {
  const [bmi, exp] = (state || 'normal-none').split('-')
  
  const colors = {
    underweight: 'bg-blue-500/20 text-blue-500 border-blue-500/30',
    normal: 'bg-green-500/20 text-green-500 border-green-500/30',
    overweight: 'bg-orange-500/20 text-orange-500 border-orange-500/30',
    obese: 'bg-red-500/20 text-red-500 border-red-500/30'
  } as any

  const sizes = {
    none: 'scale-90',
    beginner: 'scale-95',
    intermediate: 'scale-100',
    experienced: 'scale-105 font-black'
  } as any

  const colorClass = colors[bmi] || colors.normal
  const sizeClass = sizes[exp] || sizes.none

  return (
    <div className={`flex aspect-square w-full max-w-sm flex-col items-center justify-center rounded-[3rem] border-4 ${colorClass} ${sizeClass} transition-all duration-700 ease-out shadow-2xl`}>
      <UserIcon className="mb-4 h-32 w-32 opacity-80" />
      <span className="rounded-full bg-background/50 px-4 py-1 text-sm font-bold backdrop-blur-md uppercase tracking-widest">
        {bmi} • {exp}
      </span>
    </div>
  )
}

export default async function DashboardPage({ searchParams }: { searchParams?: { message?: string } }) {
  const supabase = createServerSupabaseClient()
  if (!supabase) return null

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile || !profile.age) {
    redirect('/onboarding')
  }

  const { data: workoutPlans } = await supabase
    .from('workout_plans')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(6)

  const { data: workoutSessions } = await supabase
    .from('workout_sessions')
    .select('*')
    .eq('user_id', user.id)
    .order('completed_at', { ascending: false })
    .limit(12)

  const { data: aiFeedback } = await supabase
    .from('ai_feedback')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(3)

  const plans = (workoutPlans ?? []) as WorkoutPlanRecord[]
  const sessions = (workoutSessions ?? []) as WorkoutSessionRecord[]
  const feedbackRecords = (aiFeedback ?? []) as AiFeedbackRecord[]
  const completedCount = sessions.filter((session) => session.status === 'completed').length
  const totalMinutes = sessions.reduce((total, session) => total + (session.duration_minutes ?? 0), 0)
  const latestPlan = plans[0]

  return (
    <main className="min-h-screen bg-muted/20 pb-20 pt-10">
      <div className="container-shell max-w-6xl">
        <header className="mb-12">
          <AnimatedSection>
            <h1 className="text-4xl font-black tracking-tight">Dashboard</h1>
            <p className="mt-2 text-muted-foreground">Welcome back, athlete.</p>
            {searchParams?.message ? (
              <p className="mt-4 rounded-2xl border border-border bg-card p-4 text-sm font-bold text-muted-foreground">{searchParams.message}</p>
            ) : null}
          </AnimatedSection>
        </header>

        <div className="grid gap-8 lg:grid-cols-[1fr_1.5fr]">
          <AnimatedSection className="flex flex-col items-center rounded-[2.5rem] border border-border bg-card p-10 text-center shadow-sm">
            <h2 className="mb-8 font-bold text-muted-foreground uppercase tracking-widest">Your Avatar</h2>
            <Avatar state={profile.avatar_state} />
            <p className="mt-8 max-w-[250px] text-sm text-muted-foreground">
              Your avatar updates automatically as your BMI shifts and experience grows.
            </p>
          </AnimatedSection>

          <div className="flex flex-col gap-8">
            <AnimatedSection className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div className="rounded-3xl border border-border bg-card p-5">
                <Activity className="mb-3 h-6 w-6 text-primary" />
                <p className="text-sm font-bold text-muted-foreground">BMI</p>
                <p className="text-2xl font-black">{profile.bmi}</p>
              </div>
              <div className="rounded-3xl border border-border bg-card p-5">
                <Target className="mb-3 h-6 w-6 text-primary" />
                <p className="text-sm font-bold text-muted-foreground">Goal</p>
                <p className="text-lg font-black leading-tight capitalize">{profile.goal?.replace('-', ' ') ?? 'Not set'}</p>
              </div>
              <div className="rounded-3xl border border-border bg-card p-5">
                <Dumbbell className="mb-3 h-6 w-6 text-primary" />
                <p className="text-sm font-bold text-muted-foreground">Level</p>
                <p className="text-lg font-black leading-tight capitalize">{profile.experience_level ?? 'New'}</p>
              </div>
              <div className="rounded-3xl border border-border bg-card p-5">
                <Timer className="mb-3 h-6 w-6 text-primary" />
                <p className="text-sm font-bold text-muted-foreground">Session</p>
                <p className="text-lg font-black leading-tight">{profile.preferred_session_minutes ?? 30} min</p>
              </div>
            </AnimatedSection>

            <AnimatedSection className="flex-1 rounded-[2.5rem] border border-border bg-card p-8">
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                <div>
                  <p className="text-sm font-black uppercase tracking-[0.2em] text-primary">Today's Session</p>
                  <h2 className="mt-2 text-2xl font-black tracking-tight">{latestPlan?.title ?? 'Generate your next workout'}</h2>
                  <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
                    {latestPlan?.summary ?? 'Kynetic uses your goal, level, equipment, limitations, and available time to create a personalized workout and save it to your account.'}
                  </p>
                </div>
                <GenerateWorkoutButton compact />
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-3">
                <div className="rounded-2xl bg-muted p-4">
                  <CalendarDays className="mb-2 h-5 w-5 text-primary" />
                  <p className="text-xs font-bold text-muted-foreground">Generated</p>
                  <p className="text-2xl font-black">{plans.length}</p>
                </div>
                <div className="rounded-2xl bg-muted p-4">
                  <Dumbbell className="mb-2 h-5 w-5 text-primary" />
                  <p className="text-xs font-bold text-muted-foreground">Completed</p>
                  <p className="text-2xl font-black">{completedCount}</p>
                </div>
                <div className="rounded-2xl bg-muted p-4">
                  <Timer className="mb-2 h-5 w-5 text-primary" />
                  <p className="text-xs font-bold text-muted-foreground">Minutes</p>
                  <p className="text-2xl font-black">{totalMinutes}</p>
                </div>
              </div>
            </AnimatedSection>

            <AnimatedSection className="rounded-[2.5rem] border border-border bg-card p-8">
              <div className="mb-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
                <div>
                  <h2 className="text-2xl font-black tracking-tight">Latest coaching feedback</h2>
                  <p className="mt-2 text-sm text-muted-foreground">Saved after completed sessions and reused as context for future coaching.</p>
                </div>
              </div>
              {feedbackRecords.length ? (
                <div className="space-y-4">
                  {feedbackRecords.map((record) => (
                    <article key={record.id} className="rounded-[2rem] border border-border bg-background p-5">
                      <div className="flex items-start gap-3">
                        <Lightbulb className="mt-1 h-5 w-5 shrink-0 text-primary" />
                        <div>
                          <h3 className="font-black">{record.feedback.headline}</h3>
                          <p className="mt-2 text-sm leading-6 text-muted-foreground">{record.feedback.summary}</p>
                        </div>
                      </div>
                      <ul className="mt-4 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
                        {record.feedback.suggestions.slice(0, 2).map((suggestion) => (
                          <li key={suggestion} className="rounded-2xl bg-muted p-3">• {suggestion}</li>
                        ))}
                      </ul>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="rounded-[2rem] border border-dashed border-border bg-muted/40 p-6 text-sm leading-6 text-muted-foreground">
                  Complete a guided or manual workout to receive personalized AI coaching on reps, form, difficulty fit, and next-session focus.
                </div>
              )}
            </AnimatedSection>

            <AnimatedSection className="rounded-[2.5rem] border border-border bg-card p-8">
              <div className="mb-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
                <div>
                  <h2 className="text-2xl font-black tracking-tight">Generated plans</h2>
                  <p className="mt-2 text-sm text-muted-foreground">Your saved AI workouts are protected by Supabase RLS and visible only to you.</p>
                </div>
              </div>
              <WorkoutHistory plans={plans} sessions={sessions} />
            </AnimatedSection>
          </div>
        </div>
      </div>
    </main>
  )
}
