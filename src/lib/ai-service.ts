import { env } from "@/lib/config/env";
import { generateFallbackWorkout } from "@/lib/workouts/fallback-generator";
import type { CoachingFeedback, GeneratedWorkoutPlan, WorkoutProfileSnapshot } from "@/lib/workouts/types";

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

export async function generateWorkoutPlan(
  profile: WorkoutProfileSnapshot,
  context: Record<string, unknown> = {}
): Promise<{ plan: GeneratedWorkoutPlan; source: "ai-service" | "fallback" }> {
  try {
    const response = await fetch(`${env.aiServiceUrl}/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ profile, context }),
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

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isCoachingFeedback(value: unknown): value is CoachingFeedback {
  if (!value || typeof value !== "object") return false;
  const feedback = value as Partial<CoachingFeedback>;
  return Boolean(
    typeof feedback.headline === "string" &&
    typeof feedback.summary === "string" &&
    isStringArray(feedback.wins) &&
    isStringArray(feedback.improvements) &&
    typeof feedback.difficulty_fit === "string" &&
    isStringArray(feedback.suggestions) &&
    typeof feedback.next_time_focus === "string"
  );
}

function fallbackFeedback(payload: FeedbackPayload): CoachingFeedback {
  const session = payload.session as Record<string, unknown>;
  const plan = payload.plan as Record<string, unknown> | null;
  const title = typeof session.plan_title === "string" ? session.plan_title : typeof plan?.title === "string" ? plan.title : "your workout";
  const completedSets = typeof session.completed_sets === "number" ? session.completed_sets : undefined;
  const totalSets = typeof session.total_sets === "number" ? session.total_sets : undefined;
  const formScore = typeof session.form_score === "number" ? session.form_score : undefined;
  const repCount = typeof session.rep_count === "number" ? session.rep_count : undefined;
  const completion = completedSets && totalSets ? completedSets / totalSets : null;

  const difficultyFit = completion === null
    ? "Kynetic needs a little more completion data before adjusting difficulty confidently."
    : completion >= 0.95
      ? "The difficulty fit well; you can consider a small progression next time."
      : completion >= 0.75
        ? "The difficulty was close to right; repeat a similar target once more."
        : "The difficulty may have been too high today; reduce volume or rest longer next time.";

  return {
    headline: `Coach feedback for ${title}`,
    summary: `${difficultyFit} This fallback feedback is based on the saved session summary while the Python service is offline.`,
    wins: [
      completedSets ? `You completed ${completedSets} working sets.` : "You completed the session and saved a performance record.",
      repCount ? `You logged ${repCount} reps for future personalization.` : "Your workout history now has another data point.",
    ],
    improvements: [formScore && formScore < 75 ? "Prioritize cleaner form before adding reps or load." : "Keep logging form and reps so coaching becomes more specific."],
    difficulty_fit: difficultyFit,
    suggestions: [
      completion !== null && completion < 0.75 ? "Drop one set from the hardest movement next time." : "Aim for the top end of the rep range while keeping form stable.",
      "Use the guided player and rep/form tracking fields whenever possible.",
    ],
    next_time_focus: formScore && formScore < 75 ? "Move slower and keep technique consistent across every set." : "Repeat the strongest movement with the same form standard.",
    metrics: {
      rep_count: repCount ?? null,
      form_score: formScore ?? null,
      completed_sets: completedSets ?? null,
    },
  };
}

export type FeedbackPayload = {
  plan: unknown;
  session: unknown;
  recent_sessions: unknown[];
  recent_feedback: unknown[];
  profile: unknown;
};

export async function generateCoachingFeedback(payload: FeedbackPayload): Promise<{ feedback: CoachingFeedback; source: "ai-service" | "fallback" }> {
  try {
    const response = await fetch(`${env.aiServiceUrl}/feedback`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      cache: "no-store",
    });

    if (response.ok) {
      const body = (await response.json()) as { feedback?: unknown };
      if (isCoachingFeedback(body.feedback)) {
        return { feedback: body.feedback, source: "ai-service" };
      }
    }
  } catch {
    // Keep session completion usable even if the Python service is unavailable.
  }

  return { feedback: fallbackFeedback(payload), source: "fallback" };
}
