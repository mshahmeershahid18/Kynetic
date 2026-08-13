"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { calculateBmi, resolveAvatarState } from "@/lib/profiles/avatar";
import {
  activityLevels,
  experienceLevels,
  fitnessGoals,
  type ActivityLevel,
  type ExperienceLevel,
} from "@/lib/profiles/types";
import {
  boundedNumber,
  multi,
  oneOf,
  text,
  type FieldErrors,
} from "@/lib/profiles/validate";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type OnboardingState = {
  error?: string;
  fieldErrors?: FieldErrors;
};

export async function saveOnboardingProfile(
  _previous: OnboardingState,
  formData: FormData
): Promise<OnboardingState> {
  const supabase = createServerSupabaseClient();
  if (!supabase) {
    return { error: "Supabase is not configured." };
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/auth/login?message=Please%20sign%20in%20to%20continue");
  }

  const fieldErrors: FieldErrors = {};

  const fullName = text(formData, "full_name");
  if (!fullName) fieldErrors.full_name = "Your name is required.";

  const age = boundedNumber(formData, "age", fieldErrors);
  const heightCm = boundedNumber(formData, "height_cm", fieldErrors);
  const weightKg = boundedNumber(formData, "weight_kg", fieldErrors);
  const days = boundedNumber(formData, "available_days_per_week", fieldErrors);
  const minutes = boundedNumber(formData, "preferred_session_minutes", fieldErrors);

  const goal = oneOf(formData, "goal", fitnessGoals, "Goal", fieldErrors);
  const fitnessLevel = oneOf(formData, "fitness_level", activityLevels, "Activity level", fieldErrors);
  const experienceLevel = oneOf(formData, "experience_level", experienceLevels, "Experience", fieldErrors);

  if (Object.keys(fieldErrors).length) {
    return { error: "Please fix the highlighted fields.", fieldErrors };
  }

  const bmi = calculateBmi(heightCm!, weightKg!);
  const avatarState = resolveAvatarState(bmi, experienceLevel as ExperienceLevel);

  const { error } = await supabase.from("profiles").upsert(
    {
      id: user.id,
      email: user.email ?? null,
      full_name: fullName,
      age,
      gender: text(formData, "gender") || null,
      height_cm: heightCm,
      weight_kg: weightKg,
      goal,
      fitness_level: fitnessLevel as ActivityLevel,
      experience_level: experienceLevel as ExperienceLevel,
      limitations: text(formData, "limitations") || null,
      equipment: multi(formData, "equipment"),
      workout_preferences: multi(formData, "workout_preferences"),
      available_days_per_week: days,
      preferred_session_minutes: minutes,
      bmi,
      avatar_state: avatarState,
      onboarding_completed: true,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" }
  );

  if (error) {
    return { error: error.message };
  }

  // Record a body-metric snapshot so the progress history has a starting point
  // and later weight changes are measurable against it.
  await supabase.from("progress").insert({
    user_id: user.id,
    weight_kg: weightKg,
    bmi,
    experience_level: experienceLevel,
    avatar_state: avatarState,
    note: "Profile updated",
  });

  // Fire and forget: a failed welcome email must not block onboarding.
  void sendWelcomeEmail(user.email);

  revalidatePath("/dashboard");
  redirect("/dashboard?message=Profile%20saved.%20Generate%20your%20first%20workout%20to%20begin.");
}

async function sendWelcomeEmail(email: string | undefined) {
  if (!email) return;
  try {
    const { sendWelcomeEmail: send } = await import("@/lib/email/sender");
    await send(email);
  } catch {
    // Email is best-effort; onboarding already succeeded.
  }
}
