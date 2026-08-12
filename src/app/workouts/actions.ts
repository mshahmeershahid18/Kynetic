"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { generateWorkoutPlan } from "@/lib/ai-service";
import type { FitnessProfile } from "@/lib/profiles/types";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { toWorkoutProfileSnapshot, type WorkoutSessionSummary } from "@/lib/workouts/types";

async function requireUserAndProfile() {
  const supabase = createServerSupabaseClient();
  if (!supabase) redirect("/dashboard?message=Supabase%20is%20not%20configured");

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) redirect("/auth/login?message=Please%20sign%20in");

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (profileError || !profile?.onboarding_completed) redirect("/onboarding");

  return { supabase, user, profile: profile as FitnessProfile };
}

export async function generateWorkoutAction() {
  const { supabase, user, profile } = await requireUserAndProfile();
  const snapshot = toWorkoutProfileSnapshot(profile);
  const { plan, source } = await generateWorkoutPlan(snapshot);

  const { data, error } = await supabase
    .from("workout_plans")
    .insert({
      user_id: user.id,
      title: plan.title,
      summary: plan.summary,
      duration_minutes: plan.duration_minutes,
      difficulty: plan.difficulty,
      goal: plan.goal,
      plan,
      source_profile_snapshot: { ...snapshot, generation_source: source },
    })
    .select("id")
    .single();

  if (error || !data) {
    redirect(`/dashboard?message=${encodeURIComponent(error?.message ?? "Unable to save workout")}`);
  }

  revalidatePath("/dashboard");
  redirect(`/workouts/${data.id}`);
}

export async function completeWorkoutAction(formData: FormData) {
  const { supabase, user } = await requireUserAndProfile();
  const planId = String(formData.get("plan_id") ?? "");
  const duration = Number(formData.get("duration_minutes") ?? 0);
  const rawSessionData = formData.get("session_data");
  let sessionData: WorkoutSessionSummary = { completed_from: "workout_plan_page" };

  if (typeof rawSessionData === "string" && rawSessionData) {
    try {
      sessionData = JSON.parse(rawSessionData) as WorkoutSessionSummary;
    } catch {
      sessionData = { completed_from: "guided_session_player" };
    }
  }

  if (!planId) redirect("/dashboard?message=Missing%20workout%20plan");

  const { data: planOwner } = await supabase
    .from("workout_plans")
    .select("id")
    .eq("id", planId)
    .eq("user_id", user.id)
    .single();

  if (!planOwner) redirect("/dashboard?message=Workout%20not%20found");

  const { error } = await supabase.from("workout_sessions").insert({
    user_id: user.id,
    workout_plan_id: planId,
    status: "completed",
    duration_minutes: Number.isFinite(duration) && duration > 0 ? duration : null,
    session_data: sessionData,
    completed_at: new Date().toISOString(),
  });

  if (error) {
    redirect(`/workouts/${planId}?message=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/dashboard");
  revalidatePath(`/workouts/${planId}`);
  redirect("/dashboard?message=Workout%20completed");
}
