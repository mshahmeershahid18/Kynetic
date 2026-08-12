import type { FitnessProfile } from "@/lib/profiles/types";

import type { VisionKind } from "@/lib/vision/exercise-analyzers";

/** A row from the shared `exercises` library table. */
export type ExerciseLibraryEntry = {
  id: string;
  slug: string;
  name: string;
  muscle_group: string;
  equipment: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  instructions: string[];
  cues: string[];
  demo_media_url: string | null;
  demo_poster_url: string | null;
  /**
   * Non-null only for simple movements a webcam can judge. This is the single
   * switch that decides whether live guidance is offered for an exercise.
   */
  vision_kind: VisionKind | null;
};

export type WorkoutExercise = {
  /** References `exercises.slug`, so demos and vision support resolve. */
  slug: string;
  name: string;
  muscle_group: string;
  equipment: string;
  sets: number;
  reps: string;
  rest_seconds: number;
  instructions: string[];
  cues?: string[];
  demo_media_url?: string | null;
  vision_kind?: VisionKind | null;
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
  /** Which engine produced this plan: "gemini" or "deterministic". */
  generator: string | null;
  created_at: string;
};

export type WorkoutSessionExerciseLog = {
  name: string;
  slug?: string;
  block: string;
  target_sets: number;
  completed_sets: number;
  target_reps: string;
  rest_seconds: number;
  /** Reps counted by the camera, when live guidance was used. */
  tracked_reps?: number;
};

export type WorkoutSessionSummary = {
  completed_from: "workout_plan_page" | "guided_session_player";
  plan_title?: string;
  total_exercises?: number;
  total_sets?: number;
  completed_sets?: number;
  elapsed_seconds?: number;
  exercise_log?: WorkoutSessionExerciseLog[];
  rep_count?: number;
  average_depth?: number;
  form_score?: number;
  form_warnings?: string[];
  /** Share of analysed frames where the body was fully visible, 0-100. */
  tracking_quality?: number;
  /** Slugs that were coached live by the camera during this session. */
  guided_exercises?: string[];
  perceived_difficulty?: "too_easy" | "just_right" | "too_hard";
};

/** A form check run against an uploaded video, outside a live session. */
export type FormAnalysisRecord = {
  id: string;
  user_id: string;
  exercise_slug: string;
  vision_kind: VisionKind;
  source: "upload" | "live";
  rep_count: number;
  average_depth: number | null;
  form_score: number | null;
  warnings: string[];
  metrics: Record<string, number | string | null>;
  created_at: string;
};

export type CoachingFeedback = {
  headline: string;
  summary: string;
  wins: string[];
  improvements: string[];
  difficulty_fit: string;
  suggestions: string[];
  next_time_focus: string;
  metrics?: Record<string, number | null>;
};

export type WorkoutSessionRecord = {
  id: string;
  user_id: string;
  workout_plan_id: string;
  status: "completed" | "skipped";
  duration_minutes: number | null;
  session_data: WorkoutSessionSummary | null;
  completed_at: string | null;
  created_at: string;
};

export type AiFeedbackRecord = {
  id: string;
  user_id: string;
  session_id: string;
  workout_plan_id: string | null;
  feedback: CoachingFeedback;
  feedback_text: string;
  suggestions: string[];
  source_payload: Record<string, unknown> | null;
  /** Which engine produced this feedback: "gemini" or "deterministic". */
  generator: string | null;
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
