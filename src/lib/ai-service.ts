import { env } from "@/lib/config/env";
import { generateFallbackWorkout } from "@/lib/workouts/fallback-generator";
import type { GeneratedWorkoutPlan, WorkoutProfileSnapshot } from "@/lib/workouts/types";

export type AiHealth = {
  status: string;
  service: string;
};

export async function getAiServiceHealth(): Promise<AiHealth | null> {
  try {
    const response = await fetch(`${env.aiServiceUrl}/health`, {
      next: { revalidate: 30 },
    });

    if (!response.ok) {
      return null;
    }

    return (await response.json()) as AiHealth;
  } catch {
    return null;
  }
}

function isGeneratedWorkoutPlan(value: unknown): value is GeneratedWorkoutPlan {
  if (!value || typeof value !== "object") return false;
  const plan = value as Partial<GeneratedWorkoutPlan>;
  return Boolean(plan.title && Array.isArray(plan.blocks) && Array.isArray(plan.warmup) && Array.isArray(plan.cooldown));
}

export async function generateWorkoutPlan(profile: WorkoutProfileSnapshot): Promise<{ plan: GeneratedWorkoutPlan; source: "ai-service" | "fallback" }> {
  try {
    const response = await fetch(`${env.aiServiceUrl}/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ profile }),
      cache: "no-store",
    });

    if (response.ok) {
      const payload = (await response.json()) as { plan?: unknown };
      if (isGeneratedWorkoutPlan(payload.plan)) {
        return { plan: payload.plan, source: "ai-service" };
      }
    }
  } catch {
    // The local deterministic generator keeps the product usable when Python is offline.
  }

  return { plan: generateFallbackWorkout(profile), source: "fallback" };
}
