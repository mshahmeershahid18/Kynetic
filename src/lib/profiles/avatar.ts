import type { ExperienceLevel } from "@/lib/profiles/types";

export function calculateBmi(heightCm: number, weightKg: number) {
  if (!heightCm || !weightKg) {
    return null;
  }

  const heightM = heightCm / 100;
  return Number((weightKg / (heightM * heightM)).toFixed(1));
}

export function getBmiBucket(bmi: number | null) {
  if (bmi === null) {
    return "unknown";
  }
  if (bmi < 18.5) {
    return "underweight";
  }
  if (bmi < 25) {
    return "normal";
  }
  if (bmi < 30) {
    return "overweight";
  }
  return "higher-mass";
}

export function resolveAvatarState(bmi: number | null, experience: ExperienceLevel | null) {
  const body = getBmiBucket(bmi);
  const muscle = experience ?? "none";
  return `${body}-${muscle}`;
}

export function getAvatarDescription(avatarState: string | null) {
  if (!avatarState) {
    return "A neutral training avatar waiting for your onboarding profile.";
  }

  const [body, ...rest] = avatarState.split("-");
  const experience = rest.join(" ");
  return `Body profile: ${body}; training build: ${experience}.`;
}
