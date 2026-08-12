import { createServerSupabaseClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AnimatedSection } from '@/components/landing/animated-section'
import { Activity, Dumbbell, Target, User as UserIcon } from 'lucide-react'

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

export default async function DashboardPage() {
  const supabase = createServerSupabaseClient()
  if (!supabase) return null

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile || !profile.age) {
    redirect('/onboarding')
  }

  return (
    <main className="min-h-screen bg-muted/20 pb-20 pt-10">
      <div className="container-shell max-w-6xl">
        <header className="mb-12">
          <AnimatedSection>
            <h1 className="text-4xl font-black tracking-tight">Dashboard</h1>
            <p className="mt-2 text-muted-foreground">Welcome back, athlete.</p>
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
                <p className="text-lg font-black leading-tight capitalize">{profile.goal.replace('-', ' ')}</p>
              </div>
              <div className="rounded-3xl border border-border bg-card p-5">
                <Dumbbell className="mb-3 h-6 w-6 text-primary" />
                <p className="text-sm font-bold text-muted-foreground">Level</p>
                <p className="text-lg font-black leading-tight capitalize">{profile.experience_level}</p>
              </div>
              <div className="rounded-3xl border border-border bg-card p-5">
                <UserIcon className="mb-3 h-6 w-6 text-primary" />
                <p className="text-sm font-bold text-muted-foreground">Weight</p>
                <p className="text-2xl font-black">{profile.weight_kg}kg</p>
              </div>
            </AnimatedSection>

            <AnimatedSection className="flex-1 rounded-[2.5rem] border border-border bg-card p-8">
              <h2 className="text-2xl font-black tracking-tight">Today's Session</h2>
              <div className="mt-8 flex h-40 items-center justify-center rounded-2xl border-2 border-dashed border-border bg-muted/30">
                <p className="font-bold text-muted-foreground">Workout generation coming in Phase 2</p>
              </div>
            </AnimatedSection>
          </div>
        </div>
      </div>
    </main>
  )
}
