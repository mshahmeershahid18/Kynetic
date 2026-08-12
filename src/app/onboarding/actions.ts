"use server";

import { redirect } from "next/navigation";

import { calculateBmi, resolveAvatarState } from "@/lib/profiles/avatar";
import type { ExperienceLevel } from "@/lib/profiles/types";
import { createServerSupabaseClient } from "@/lib/supabase/server";

function stringValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function numberValue(formData: FormData, key: string) {
  const value = Number(stringValue(formData, key));
  return Number.isFinite(value) && value > 0 ? value : null;
}

function multiValue(formData: FormData, key: string) {
  return formData.getAll(key).filter((value): value is string => typeof value === "string" && value.trim().length > 0);
}

export async function saveOnboardingProfile(formData: FormData) {
  const supabase = createServerSupabaseClient();
  if (!supabase) {
    redirect("/onboarding?message=Supabase%20is%20not%20configured");
  }

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    redirect("/auth/login?message=Please%20sign%20in%20to%20complete%20onboarding");
  }

  const heightCm = numberValue(formData, "height_cm");
  const weightKg = numberValue(formData, "weight_kg");
  const bmi = heightCm && weightKg ? calculateBmi(heightCm, weightKg) : null;
  const experienceLevel = stringValue(formData, "experience_level") || null;

  const payload = {
    id: userData.user.id,
    email: userData.user.email ?? null,
    full_name: stringValue(formData, "full_name") || userData.user.user_metadata.full_name || null,
    age: numberValue(formData, "age"),
    gender: stringValue(formData, "gender") || null,
    height_cm: heightCm,
    weight_kg: weightKg,
    goal: stringValue(formData, "goal") || null,
    fitness_level: stringValue(formData, "fitness_level") || null,
    experience_level: experienceLevel,
    limitations: stringValue(formData, "limitations") || null,
    equipment: multiValue(formData, "equipment"),
    workout_preferences: multiValue(formData, "workout_preferences"),
    available_days_per_week: numberValue(formData, "available_days_per_week"),
    preferred_session_minutes: numberValue(formData, "preferred_session_minutes"),
    bmi,
    avatar_state: resolveAvatarState(bmi, experienceLevel as ExperienceLevel | null),
    onboarding_completed: true,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase.from("profiles").upsert(payload, { onConflict: "id" });

  if (error) {
    redirect(`/onboarding?message=${encodeURIComponent(error.message)}`);
  }

  redirect("/dashboard");
}
