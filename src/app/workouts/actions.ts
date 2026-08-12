"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { generateCoachingFeedback, generateWorkoutPlan } from "@/lib/ai-service";
import { fetchExerciseLibrary } from "@/lib/exercises/library";
import { calculateBmi, resolveAvatarState } from "@/lib/profiles/avatar";
import type { ExperienceLevel, FitnessProfile } from "@/lib/profiles/types";
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

  // The AI service verifies this token, so it must travel with every call.
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const accessToken = session?.access_token ?? null;

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (profileError || !profile?.onboarding_completed) redirect("/onboarding");

  return { supabase, user, accessToken, profile: profile as FitnessProfile };
}

export async function generateWorkoutAction() {
  const { supabase, user, accessToken, profile } = await requireUserAndProfile();
  const snapshot = toWorkoutProfileSnapshot(profile);
  const library = await fetchExerciseLibrary();

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

  const { plan, source } = await generateWorkoutPlan({
    profile: snapshot,
    library,
    context,
    accessToken,
  });

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
      generator: source,
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
  const { supabase, user, accessToken, profile } = await requireUserAndProfile();
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

  const { feedback, source } = await generateCoachingFeedback(payload, accessToken);
  const { error: feedbackError } = await supabase.from("ai_feedback").insert({
    user_id: user.id,
    session_id: insertedSession.id,
    workout_plan_id: planId,
    feedback,
    feedback_text: feedback.summary,
    suggestions: feedback.suggestions,
    generator: source,
    source_payload: { ...payload, feedback_source: source },
  });

  if (feedbackError) {
    redirect(`/dashboard?message=${encodeURIComponent(`Workout completed, but feedback could not be saved: ${feedbackError.message}`)}`);
  }

  // Training volume raises the experience level, which the 3D avatar reads.
  const { count } = await supabase
    .from("workout_sessions")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("status", "completed");

  const completedCount = count ?? 0;
  const current = profile.experience_level;
  let newExperience: ExperienceLevel | null = current;

  if (completedCount >= 40 && current !== "experienced") {
    newExperience = "experienced";
  } else if (completedCount >= 15 && (!current || current === "none" || current === "beginner")) {
    newExperience = "intermediate";
  } else if (completedCount >= 5 && (!current || current === "none")) {
    newExperience = "beginner";
  }

  if (newExperience !== current) {
    // Single source of truth for bucket naming, shared with onboarding and the
    // avatar renderer, so the three can never disagree.
    const bmi = profile.bmi ?? calculateBmi(profile.height_cm ?? 0, profile.weight_kg ?? 0);
    const avatarState = resolveAvatarState(bmi, newExperience);

    await supabase
      .from("profiles")
      .update({ experience_level: newExperience, avatar_state: avatarState })
      .eq("id", user.id);

    // Snapshot the change so progress over time is queryable.
    await supabase.from("progress").insert({
      user_id: user.id,
      weight_kg: profile.weight_kg,
      bmi,
      experience_level: newExperience,
      avatar_state: avatarState,
      note: `Reached ${completedCount} completed sessions`,
    });
  }

  revalidatePath("/dashboard");
  revalidatePath(`/workouts/${planId}`);
  redirect(`/dashboard?message=${encodeURIComponent("Workout completed — AI coaching feedback is ready")}`);
}
