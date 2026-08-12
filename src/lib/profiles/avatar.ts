import type { ExperienceLevel } from "@/lib/profiles/types";

export const bmiBuckets = ["underweight", "normal", "overweight", "obese"] as const;
export type BmiBucket = (typeof bmiBuckets)[number];

export function calculateBmi(heightCm: number, weightKg: number): number | null {
  if (!heightCm || !weightKg || heightCm <= 0 || weightKg <= 0) return null;
  const heightM = heightCm / 100;
  return Number((weightKg / (heightM * heightM)).toFixed(1));
}

export function getBmiBucket(bmi: number | null): BmiBucket | "unknown" {
  if (bmi === null) return "unknown";
  if (bmi < 18.5) return "underweight";
  if (bmi < 25) return "normal";
  if (bmi < 30) return "overweight";
  return "obese";
}

/**
 * The stored `avatar_state` string. Kept as a single source of truth so
 * onboarding, session completion, and the renderer can never disagree on
 * bucket naming.
 */
export function resolveAvatarState(bmi: number | null, experience: ExperienceLevel | null): string {
  return `${getBmiBucket(bmi)}-${experience ?? "none"}`;
}

export function parseAvatarState(avatarState: string | null): {
  bucket: BmiBucket | "unknown";
  experience: ExperienceLevel;
} {
  const [bucket, ...rest] = (avatarState ?? "normal-none").split("-");
  const experience = rest.join("-") as ExperienceLevel;
  const validBucket = (bmiBuckets as readonly string[]).includes(bucket)
    ? (bucket as BmiBucket)
    : "unknown";
  return {
    bucket: validBucket,
    experience: (["none", "beginner", "intermediate", "experienced"] as string[]).includes(experience)
      ? experience
      : "none",
  };
}

/**
 * Continuous 0-1 shape parameters for the 3D avatar.
 *
 * plan.md offered two options: a discrete asset matrix, or a parametric model
 * whose proportions move smoothly. This is the parametric route — BMI drives
 * mass and experience drives muscularity, so the body changes gradually as the
 * profile changes rather than snapping between tiers.
 */
export type AvatarMorphs = {
  /** 0 = very lean, 1 = high body mass. */
  mass: number;
  /** 0 = untrained, 1 = well developed musculature. */
  muscle: number;
};

const EXPERIENCE_MUSCLE: Record<ExperienceLevel, number> = {
  none: 0.05,
  beginner: 0.3,
  intermediate: 0.6,
  experienced: 0.92,
};

export function avatarMorphs(
  bmi: number | null,
  experience: ExperienceLevel | null
): AvatarMorphs {
  // Map a realistic BMI span (16-38) onto 0-1 and clamp the extremes.
  const value = bmi ?? 22;
  const mass = Math.max(0, Math.min(1, (value - 16) / 22));
  const muscle = EXPERIENCE_MUSCLE[experience ?? "none"] ?? 0.05;
  return { mass, muscle };
}

const BUCKET_COPY: Record<BmiBucket | "unknown", string> = {
  underweight: "below the healthy BMI range",
  normal: "in the healthy BMI range",
  overweight: "above the healthy BMI range",
  obese: "well above the healthy BMI range",
  unknown: "not yet calculated",
};

const EXPERIENCE_COPY: Record<ExperienceLevel, string> = {
  none: "untrained build",
  beginner: "early training adaptations",
  intermediate: "visible training development",
  experienced: "well developed, trained build",
};

export function getAvatarDescription(avatarState: string | null): string {
  if (!avatarState) {
    return "Complete onboarding to generate your avatar.";
  }
  const { bucket, experience } = parseAvatarState(avatarState);
  return `Body mass ${BUCKET_COPY[bucket]}, rendered with ${EXPERIENCE_COPY[experience]}.`;
}
