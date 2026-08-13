import { env } from "@/lib/config/env";
import { generateFallbackWorkout } from "@/lib/workouts/fallback-generator";
import type {
  CoachingFeedback,
  ExerciseLibraryEntry,
  GeneratedWorkoutPlan,
  WorkoutProfileSnapshot,
} from "@/lib/workouts/types";

export type AiHealth = {
  status: string;
  service: string;
  gemini_enabled?: boolean;
  model?: string | null;
  auth_required?: boolean;
};

/** Which engine actually produced a result. */
export type GenerationSource = "gemini" | "deterministic" | "local-fallback";

export async function getAiServiceHealth(): Promise<AiHealth | null> {
  try {
    const response = await fetch(`${env.aiServiceUrl}/health`, { next: { revalidate: 30 } });
    if (!response.ok) return null;
    return (await response.json()) as AiHealth;
  } catch {
    return null;
  }
}

/**
 * The AI service verifies the caller's Supabase JWT, so every request carries
 * the signed-in user's access token. Without it the service returns 401.
 */
function authHeaders(accessToken: string | null): Record<string, string> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  return headers;
}

function isGeneratedWorkoutPlan(value: unknown): value is GeneratedWorkoutPlan {
  if (!value || typeof value !== "object") return false;
  const plan = value as Partial<GeneratedWorkoutPlan>;
  return Boolean(
    plan.title &&
    Array.isArray(plan.blocks) &&
    plan.blocks.length > 0 &&
    Array.isArray(plan.warmup) &&
    Array.isArray(plan.cooldown)
  );
}

export type GenerateWorkoutInput = {
  profile: WorkoutProfileSnapshot;
  library: ExerciseLibraryEntry[];
  context?: Record<string, unknown>;
  accessToken: string | null;
};

export async function generateWorkoutPlan({
  profile,
  library,
  context = {},
  accessToken,
}: GenerateWorkoutInput): Promise<{ plan: GeneratedWorkoutPlan; source: GenerationSource }> {
  try {
    const response = await fetch(`${env.aiServiceUrl}/generate`, {
      method: "POST",
      headers: authHeaders(accessToken),
      body: JSON.stringify({
        profile,
        context: {
          ...context,
          // The model may only prescribe movements that exist in the library.
          exercise_library: library.map((entry) => ({
            slug: entry.slug,
            name: entry.name,
            muscle_group: entry.muscle_group,
            equipment: entry.equipment,
            difficulty: entry.difficulty,
            instructions: entry.instructions,
            cues: entry.cues,
            demo_media_url: entry.demo_media_url,
            vision_kind: entry.vision_kind,
          })),
        },
      }),
      cache: "no-store",
    });

    if (response.ok) {
      const payload = (await response.json()) as { plan?: unknown; generator?: string };
      if (isGeneratedWorkoutPlan(payload.plan)) {
        return {
          plan: payload.plan,
          source: payload.generator === "gemini" ? "gemini" : "deterministic",
        };
      }
    }
  } catch {
    // Fall through to the local generator below.
  }

  return { plan: generateFallbackWorkout(profile, library), source: "local-fallback" };
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

export type FeedbackPayload = {
  plan: unknown;
  session: unknown;
  recent_sessions: unknown[];
  recent_feedback: unknown[];
  profile: unknown;
};

function fallbackFeedback(payload: FeedbackPayload): CoachingFeedback {
  const session = (payload.session ?? {}) as Record<string, unknown>;
  const plan = payload.plan as Record<string, unknown> | null;

  const title =
    typeof session.plan_title === "string"
      ? session.plan_title
      : typeof plan?.title === "string"
        ? plan.title
        : "your workout";

  const numeric = (key: string) => (typeof session[key] === "number" ? (session[key] as number) : undefined);
  const completedSets = numeric("completed_sets");
  const totalSets = numeric("total_sets");
  const formScore = numeric("form_score");
  const repCount = numeric("rep_count");
  const completion = completedSets !== undefined && totalSets ? completedSets / totalSets : null;

  const difficultyFit =
    completion === null
      ? "Kynetic needs a little more completion data before adjusting difficulty confidently."
      : completion >= 0.95
        ? "The difficulty fit well; you can consider a small progression next time."
        : completion >= 0.75
          ? "The difficulty was close to right; repeat a similar target once more."
          : "The difficulty may have been too high today; reduce volume or rest longer next time.";

  return {
    headline: `Coach feedback for ${title}`,
    summary: `${difficultyFit} This is offline feedback based on your saved session summary — the AI coach was unreachable.`,
    wins: [
      completedSets
        ? `You completed ${completedSets} working sets.`
        : "You completed the session and saved a performance record.",
      repCount
        ? `You logged ${repCount} reps for future personalization.`
        : "Your workout history now has another data point.",
    ],
    improvements: [
      formScore !== undefined && formScore < 75
        ? "Prioritize cleaner form before adding reps or load."
        : "Keep logging form and reps so coaching becomes more specific.",
    ],
    difficulty_fit: difficultyFit,
    suggestions: [
      completion !== null && completion < 0.75
        ? "Drop one set from the hardest movement next time."
        : "Aim for the top end of the rep range while keeping form stable.",
      "Use live guidance or a video form check so the coach has technique data to work with.",
    ],
    next_time_focus:
      formScore !== undefined && formScore < 75
        ? "Move slower and keep technique consistent across every set."
        : "Repeat the strongest movement with the same form standard.",
    metrics: {
      rep_count: repCount ?? null,
      form_score: formScore ?? null,
      completed_sets: completedSets ?? null,
    },
  };
}

export async function generateCoachingFeedback(
  payload: FeedbackPayload,
  accessToken: string | null
): Promise<{ feedback: CoachingFeedback; source: GenerationSource }> {
  try {
    const response = await fetch(`${env.aiServiceUrl}/feedback`, {
      method: "POST",
      headers: authHeaders(accessToken),
      body: JSON.stringify(payload),
      cache: "no-store",
    });

    if (response.ok) {
      const body = (await response.json()) as { feedback?: unknown; generator?: string };
      if (isCoachingFeedback(body.feedback)) {
        return {
          feedback: body.feedback,
          source: body.generator === "gemini" ? "gemini" : "deterministic",
        };
      }
    }
  } catch {
    // Keep session completion usable even if the AI service is unavailable.
  }

  return { feedback: fallbackFeedback(payload), source: "local-fallback" };
}
