"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { generateCoachingFeedback, generateWorkoutPlan } from "@/lib/ai-service";
import type { FitnessProfile } from "@/lib/profiles/types";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { toWorkoutProfileSnapshot, type WorkoutPlanRecord, type WorkoutSessionRecord, type WorkoutSessionSummary } from "@/lib/workouts/types";

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

  const { data: recentSessions } = await supabase
    .from("workout_sessions")
    .select("*")
    .eq("user_id", user.id)
    .eq("status", "completed")
    .order("completed_at", { ascending: false })
    .limit(5);

  const { data: recentFeedback } = await supabase
    .from("ai_feedback")
    .select("feedback, feedback_text, suggestions, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(5);

  const context = {
    recent_sessions: recentSessions ?? [],
    recent_feedback: recentFeedback ?? [],
  };

  const { plan, source } = await generateWorkoutPlan(snapshot, context);

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
      source_profile_snapshot: { ...snapshot, generation_source: source, context_used: true },
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
  const { supabase, user, profile } = await requireUserAndProfile();
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

  const { data: insertedSession, error } = await supabase
    .from("workout_sessions")
    .insert({
      user_id: user.id,
      workout_plan_id: planId,
      status: "completed",
      duration_minutes: Number.isFinite(duration) && duration > 0 ? duration : null,
      session_data: sessionData,
      completed_at: new Date().toISOString(),
    })
    .select("*")
    .single();

  if (error || !insertedSession) {
    redirect(`/workouts/${planId}?message=${encodeURIComponent(error?.message ?? "Unable to save session")}`);
  }

  const { data: planRecord } = await supabase
    .from("workout_plans")
    .select("*")
    .eq("id", planId)
    .eq("user_id", user.id)
    .single();

  const { data: recentSessions } = await supabase
    .from("workout_sessions")
    .select("*")
    .eq("user_id", user.id)
    .neq("id", insertedSession.id)
    .order("completed_at", { ascending: false })
    .limit(5);

  const { data: recentFeedback } = await supabase
    .from("ai_feedback")
    .select("feedback, feedback_text, suggestions, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(5);

  const payload = {
    plan: (planRecord as WorkoutPlanRecord | null)?.plan ?? null,
    session: { ...(insertedSession as WorkoutSessionRecord), ...((insertedSession as WorkoutSessionRecord).session_data ?? {}) },
    recent_sessions: recentSessions ?? [],
    recent_feedback: recentFeedback ?? [],
    profile,
  };

  const { feedback, source } = await generateCoachingFeedback(payload);
  const { error: feedbackError } = await supabase.from("ai_feedback").insert({
    user_id: user.id,
    session_id: insertedSession.id,
    workout_plan_id: planId,
    feedback,
    feedback_text: feedback.summary,
    suggestions: feedback.suggestions,
    source_payload: { ...payload, feedback_source: source },
  });

  if (feedbackError) {
    redirect(`/dashboard?message=${encodeURIComponent(`Workout completed, but feedback could not be saved: ${feedbackError.message}`)}`);
  }

  // Phase 5: Avatar Auto-leveling
  const { count } = await supabase
    .from("workout_sessions")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("status", "completed");

  const completedCount = count ?? 0;
  let newExperience = profile.experience_level;

  if (completedCount >= 15 && (!profile.experience_level || profile.experience_level === "none" || profile.experience_level === "beginner")) {
    newExperience = "intermediate";
  } else if (completedCount >= 5 && (!profile.experience_level || profile.experience_level === "none")) {
    newExperience = "beginner";
  }

  if (newExperience !== profile.experience_level) {
    // Re-calculate avatar_state
    let bmiBucket = "normal";
    const bmi = profile.bmi ?? 22;
    if (bmi < 18.5) bmiBucket = "underweight";
    else if (bmi >= 25 && bmi < 30) bmiBucket = "overweight";
    else if (bmi >= 30) bmiBucket = "obese";
    
    const newAvatarState = `${bmiBucket}-${newExperience || "none"}`;

    await supabase
      .from("profiles")
      .update({ experience_level: newExperience, avatar_state: newAvatarState })
      .eq("id", user.id);
  }

  revalidatePath("/dashboard");
  revalidatePath(`/workouts/${planId}`);
  redirect(`/dashboard?message=${encodeURIComponent("Workout completed — AI coaching feedback is ready")}`);
}
