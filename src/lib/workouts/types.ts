import type { FitnessProfile } from "@/lib/profiles/types";

export type WorkoutExercise = {
  name: string;
  muscle_group: string;
  equipment: string;
  sets: number;
  reps: string;
  rest_seconds: number;
  instructions: string[];
};

export type WorkoutBlock = {
  name: string;
  focus: string;
  exercises: WorkoutExercise[];
};

export type GeneratedWorkoutPlan = {
  title: string;
  summary: string;
  duration_minutes: number;
  difficulty: string;
  goal: string;
  warmup: string[];
  blocks: WorkoutBlock[];
  cooldown: string[];
  coaching_notes: string[];
};

export type WorkoutPlanRecord = {
  id: string;
  user_id: string;
  title: string;
  summary: string | null;
  duration_minutes: number | null;
  difficulty: string | null;
  goal: string | null;
  plan: GeneratedWorkoutPlan;
  source_profile_snapshot: WorkoutProfileSnapshot;
  created_at: string;
};

export type WorkoutSessionRecord = {
  id: string;
  user_id: string;
  workout_plan_id: string;
  status: "completed" | "skipped";
  duration_minutes: number | null;
  session_data: Record<string, unknown> | null;
  completed_at: string | null;
  created_at: string;
};

export type WorkoutProfileSnapshot = {
  goal: string | null;
  fitness_level: string | null;
  experience_level: string | null;
  equipment: string[];
  available_minutes: number | null;
  available_days_per_week: number | null;
  workout_preferences: string[];
  limitations: string | null;
  age: number | null;
  bmi: number | null;
};

export function toWorkoutProfileSnapshot(profile: FitnessProfile): WorkoutProfileSnapshot {
  return {
    goal: profile.goal,
    fitness_level: profile.fitness_level,
    experience_level: profile.experience_level,
    equipment: profile.equipment ?? [],
    available_minutes: profile.preferred_session_minutes,
    available_days_per_week: profile.available_days_per_week,
    workout_preferences: profile.workout_preferences ?? [],
    limitations: profile.limitations,
    age: profile.age,
    bmi: profile.bmi,
  };
}
