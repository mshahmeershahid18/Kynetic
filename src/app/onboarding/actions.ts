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
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type OnboardingState = {
  error?: string;
  fieldErrors?: Record<string, string>;
};

function text(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function multi(formData: FormData, key: string) {
  return formData
    .getAll(key)
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0);
}

/**
 * Validates a numeric field against the same bounds the database enforces.
 * Catching these here turns a raw Postgres constraint violation into a
 * readable message on the right field.
 */
function boundedNumber(
  formData: FormData,
  key: string,
  { min, max, label }: { min: number; max: number; label: string },
  errors: Record<string, string>
): number | null {
  const raw = text(formData, key);
  if (!raw) {
    errors[key] = `${label} is required.`;
    return null;
  }

  const value = Number(raw);
  if (!Number.isFinite(value)) {
    errors[key] = `${label} must be a number.`;
    return null;
  }
  if (value < min || value > max) {
    errors[key] = `${label} must be between ${min} and ${max}.`;
    return null;
  }
  return value;
}

function oneOf<T extends readonly string[]>(
  formData: FormData,
  key: string,
  allowed: T,
  label: string,
  errors: Record<string, string>
): T[number] | null {
  const value = text(formData, key);
  if (!value) {
    errors[key] = `${label} is required.`;
    return null;
  }
  if (!(allowed as readonly string[]).includes(value)) {
    errors[key] = `Choose a valid ${label.toLowerCase()}.`;
    return null;
  }
  return value as T[number];
}

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

  const fieldErrors: Record<string, string> = {};

  const fullName = text(formData, "full_name");
  if (!fullName) fieldErrors.full_name = "Your name is required.";

  // Bounds mirror the CHECK constraints in supabase/schema.sql.
  const age = boundedNumber(formData, "age", { min: 13, max: 100, label: "Age" }, fieldErrors);
  const heightCm = boundedNumber(formData, "height_cm", { min: 90, max: 250, label: "Height" }, fieldErrors);
  const weightKg = boundedNumber(formData, "weight_kg", { min: 25, max: 350, label: "Weight" }, fieldErrors);
  const days = boundedNumber(
    formData,
    "available_days_per_week",
    { min: 1, max: 7, label: "Training days" },
    fieldErrors
  );
  const minutes = boundedNumber(
    formData,
    "preferred_session_minutes",
    { min: 10, max: 180, label: "Session length" },
    fieldErrors
  );

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
