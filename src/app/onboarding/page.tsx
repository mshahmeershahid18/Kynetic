'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AnimatedSection } from '@/components/landing/animated-section'
import { createBrowserSupabaseClient } from '@/lib/supabase/client'
import { ArrowRight, Loader2, ArrowLeft } from 'lucide-react'

type OnboardingData = {
  age: string;
  gender: string;
  height_cm: string;
  weight_kg: string;
  fitness_level: string;
  goal: string;
  equipment: string[];
  experience_level: string;
}

const STEPS = 5;

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  
  const [data, setData] = useState<OnboardingData>({
    age: '',
    gender: 'prefer-not-to-say',
    height_cm: '',
    weight_kg: '',
    fitness_level: 'beginner',
    goal: 'build-muscle',
    equipment: [],
    experience_level: 'none',
  })

  function updateData(partial: Partial<OnboardingData>) {
    setData(prev => ({ ...prev, ...partial }))
  }

  function nextStep() {
    setStep(s => Math.min(s + 1, STEPS))
  }

  function prevStep() {
    setStep(s => Math.max(s - 1, 1))
  }

  async function submit() {
    setIsLoading(true)
    const supabase = createBrowserSupabaseClient()
    if (!supabase) return

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setIsLoading(false)
      return
    }

    try {
      // Calculate BMI
      const h = parseFloat(data.height_cm) / 100
      const w = parseFloat(data.weight_kg)
      const bmi = w / (h * h)
      
      // Determine avatar state based on BMI and experience
      let bmiBucket = 'normal'
      if (bmi < 18.5) bmiBucket = 'underweight'
      else if (bmi >= 25 && bmi < 30) bmiBucket = 'overweight'
      else if (bmi >= 30) bmiBucket = 'obese'

      const avatarState = `${bmiBucket}-${data.experience_level}`

      const { error } = await supabase.from('profiles').upsert({
        id: user.id,
        email: user.email,
        full_name: user.user_metadata?.full_name || null,
        age: parseInt(data.age),
        gender: data.gender,
        height_cm: parseFloat(data.height_cm),
        weight_kg: parseFloat(data.weight_kg),
        fitness_level: data.fitness_level,
        goal: data.goal,
        equipment: data.equipment,
        experience_level: data.experience_level,
        bmi: parseFloat(bmi.toFixed(1)),
        avatar_state: avatarState,
        onboarding_completed: true
      })

      if (error) {
        console.error("Failed to save profile", error)
        alert("Failed to save profile: " + error.message)
        setIsLoading(false)
        return
      }

      // Send welcome email via our route handler
      try {
        await fetch('/api/email/welcome', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: user.email })
        })
      } catch (err) {
        console.warn("Welcome email skipped/failed", err)
      }

      router.push('/dashboard')
    } catch (err) {
      console.error(err)
      setIsLoading(false)
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-muted/40 p-6">
      <AnimatedSection className="w-full max-w-xl">
        <div className="rounded-[2rem] border border-border bg-card p-8 shadow-2xl backdrop-blur-xl sm:p-12">
          
          <div className="mb-8 flex items-center justify-between">
            {step > 1 ? (
              <button onClick={prevStep} className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-muted transition">
                <ArrowLeft className="h-5 w-5" />
              </button>
            ) : <div className="h-10 w-10" />}
            <span className="font-bold text-muted-foreground">Step {step} of {STEPS}</span>
            <div className="h-10 w-10" />
          </div>

          <div className="min-h-[300px]">
            {step === 1 && (
              <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-right-8 duration-500">
                <h2 className="text-3xl font-black tracking-tight">Let's build your profile</h2>
                <div>
                  <label className="mb-2 block font-bold">Age</label>
                  <input type="number" required value={data.age} onChange={e => updateData({ age: e.target.value })} className="w-full rounded-2xl border border-border bg-background px-4 py-3 focus:border-primary focus:outline-none" placeholder="e.g. 25" />
                </div>
                <div>
                  <label className="mb-2 block font-bold">Gender</label>
                  <select value={data.gender} onChange={e => updateData({ gender: e.target.value })} className="w-full rounded-2xl border border-border bg-background px-4 py-3 focus:border-primary focus:outline-none">
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="non-binary">Non-binary</option>
                    <option value="prefer-not-to-say">Prefer not to say</option>
                  </select>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-right-8 duration-500">
                <h2 className="text-3xl font-black tracking-tight">Your body metrics</h2>
                <p className="text-muted-foreground">This helps us calculate your BMI and generate your avatar.</p>
                <div>
                  <label className="mb-2 block font-bold">Height (cm)</label>
                  <input type="number" required value={data.height_cm} onChange={e => updateData({ height_cm: e.target.value })} className="w-full rounded-2xl border border-border bg-background px-4 py-3 focus:border-primary focus:outline-none" placeholder="175" />
                </div>
                <div>
                  <label className="mb-2 block font-bold">Weight (kg)</label>
                  <input type="number" required value={data.weight_kg} onChange={e => updateData({ weight_kg: e.target.value })} className="w-full rounded-2xl border border-border bg-background px-4 py-3 focus:border-primary focus:outline-none" placeholder="70" />
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-right-8 duration-500">
                <h2 className="text-3xl font-black tracking-tight">Experience & Goals</h2>
                <div>
                  <label className="mb-2 block font-bold">Primary Goal</label>
                  <select value={data.goal} onChange={e => updateData({ goal: e.target.value })} className="w-full rounded-2xl border border-border bg-background px-4 py-3 focus:border-primary focus:outline-none">
                    <option value="build-muscle">Build Muscle</option>
                    <option value="lose-weight">Lose Weight</option>
                    <option value="get-stronger">Get Stronger</option>
                    <option value="stay-healthy">Stay Healthy</option>
                  </select>
                </div>
                <div>
                  <label className="mb-2 block font-bold">Gym Experience</label>
                  <select value={data.experience_level} onChange={e => updateData({ experience_level: e.target.value })} className="w-full rounded-2xl border border-border bg-background px-4 py-3 focus:border-primary focus:outline-none">
                    <option value="none">None</option>
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="experienced">Experienced</option>
                  </select>
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-right-8 duration-500">
                <h2 className="text-3xl font-black tracking-tight">Equipment</h2>
                <p className="text-muted-foreground">What do you have access to?</p>
                <div className="flex flex-col gap-3">
                  {['Dumbbells', 'Barbell', 'Kettlebell', 'Pull-up Bar', 'Resistance Bands'].map(eq => (
                    <label key={eq} className="flex cursor-pointer items-center gap-3 rounded-2xl border border-border bg-background p-4 hover:border-primary transition">
                      <input 
                        type="checkbox" 
                        checked={data.equipment.includes(eq)}
                        onChange={(e) => {
                          if (e.target.checked) updateData({ equipment: [...data.equipment, eq] })
                          else updateData({ equipment: data.equipment.filter(i => i !== eq) })
                        }}
                        className="h-5 w-5 accent-primary" 
                      />
                      <span className="font-bold">{eq}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {step === 5 && (
              <div className="flex flex-col gap-6 text-center animate-in fade-in zoom-in-95 duration-500">
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-primary/20 text-primary">
                  <ArrowRight className="h-10 w-10" />
                </div>
                <h2 className="text-3xl font-black tracking-tight">Ready to generate your avatar?</h2>
                <p className="text-muted-foreground">We've collected all the data we need. Let's head to your dashboard.</p>
              </div>
            )}
          </div>

          <div className="mt-12 flex justify-end">
            {step < STEPS ? (
              <button 
                onClick={nextStep} 
                className="flex items-center gap-2 rounded-full bg-primary px-6 py-3 font-bold text-primary-foreground transition hover:scale-[1.02]"
              >
                Next <ArrowRight className="h-4 w-4" />
              </button>
            ) : (
              <button 
                onClick={submit} 
                disabled={isLoading}
                className="flex w-full items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 font-bold text-primary-foreground transition hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100"
              >
                {isLoading ? <Loader2 className="animate-spin" /> : 'Complete Setup'}
              </button>
            )}
          </div>

        </div>
      </AnimatedSection>
    </main>
  )
}
