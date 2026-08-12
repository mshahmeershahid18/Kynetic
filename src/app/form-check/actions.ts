"use server";

import { revalidatePath } from "next/cache";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { visionKinds, type VisionKind } from "@/lib/vision/exercise-analyzers";

export type SaveFormAnalysisInput = {
  exerciseSlug: string;
  visionKind: string;
  repCount: number;
  averageDepth: number;
  formScore: number;
  warnings: string[];
  trackingQuality: number;
};

/**
 * Persists the numeric result of a video form check.
 *
 * The video itself is analysed in the browser and never leaves the device;
 * only this summary is stored.
 */
export async function saveFormAnalysisAction(
  input: SaveFormAnalysisInput
): Promise<{ ok: boolean; error?: string }> {
  const supabase = createServerSupabaseClient();
  if (!supabase) return { ok: false, error: "Supabase is not configured." };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Please sign in to save form checks." };

  if (!(visionKinds as readonly string[]).includes(input.visionKind)) {
    return { ok: false, error: "That exercise does not support form analysis." };
  }

  // Clamp everything: these values originate in the browser.
  const clamp = (value: number, min: number, max: number) =>
    Number.isFinite(value) ? Math.max(min, Math.min(max, Math.round(value))) : min;

  const { error } = await supabase.from("form_analyses").insert({
    user_id: user.id,
    exercise_slug: input.exerciseSlug.slice(0, 120),
    vision_kind: input.visionKind as VisionKind,
    source: "upload",
    rep_count: clamp(input.repCount, 0, 1000),
    average_depth: clamp(input.averageDepth, 0, 100),
    form_score: clamp(input.formScore, 0, 100),
    warnings: input.warnings.slice(0, 5).map((warning) => warning.slice(0, 200)),
    metrics: { tracking_quality: clamp(input.trackingQuality, 0, 100) },
  });

  if (error) return { ok: false, error: error.message };

  revalidatePath("/form-check");
  revalidatePath("/dashboard");
  return { ok: true };
}
