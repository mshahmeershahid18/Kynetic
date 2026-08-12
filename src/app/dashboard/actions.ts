'use server'

import { createServerSupabaseClient } from '@/lib/supabase/server'
import { env } from '@/lib/config/env'
import { revalidatePath } from 'next/cache'

export async function generateWorkoutAction() {
  const supabase = createServerSupabaseClient()
  if (!supabase) return { error: "Supabase not configured." }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Not logged in." }

  // 1. Fetch user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) return { error: "Profile not found." }

  // 2. Call Python Service
  try {
    const res = await fetch(`${env.aiServiceUrl}/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        profile: {
          goal: profile.goal,
          fitness_level: profile.fitness_level,
          experience_level: profile.experience_level,
          equipment: profile.equipment,
          workout_preferences: profile.workout_preferences,
          available_minutes: profile.preferred_session_minutes,
          available_days_per_week: profile.available_days_per_week,
          limitations: profile.limitations,
          age: profile.age,
          bmi: profile.bmi,
        }
      })
    })

    if (!res.ok) {
      throw new Error("Failed to reach AI service")
    }

    const { plan } = await res.json()

    // 3. Insert into Supabase
    const { data: insertedPlan, error } = await supabase
      .from('workout_plans')
      .insert({
        user_id: user.id,
        title: plan.title,
        summary: plan.summary,
        duration_minutes: plan.duration_minutes,
        difficulty: plan.difficulty,
        goal: plan.goal,
        plan: plan,
        source_profile_snapshot: profile,
      })
      .select('id')
      .single()

    if (error) {
      console.error(error)
      return { error: "Failed to save generated plan." }
    }

    revalidatePath('/dashboard')
    return { success: true, planId: insertedPlan.id }
  } catch (err: any) {
    console.error(err)
    return { error: err.message }
  }
}
