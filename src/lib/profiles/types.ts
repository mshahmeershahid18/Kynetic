export const fitnessGoals = [
  "Lose fat",
  "Build muscle",
  "Improve strength",
  "Increase endurance",
  "Mobility and recovery",
  "General wellness",
] as const;

export const experienceLevels = ["none", "beginner", "intermediate", "experienced"] as const;
export const activityLevels = ["sedentary", "light", "moderate", "high", "athlete"] as const;

export type ExperienceLevel = (typeof experienceLevels)[number];
export type ActivityLevel = (typeof activityLevels)[number];

export type FitnessProfile = {
  id: string;
  email: string | null;
  full_name: string | null;
  age: number | null;
  gender: string | null;
  height_cm: number | null;
  weight_kg: number | null;
  goal: string | null;
  fitness_level: ActivityLevel | null;
  experience_level: ExperienceLevel | null;
  limitations: string | null;
  equipment: string[] | null;
  workout_preferences: string[] | null;
  available_days_per_week: number | null;
  preferred_session_minutes: number | null;
  bmi: number | null;
  avatar_state: string | null;
  /** Profile photo: an uploaded file, or the picture from an OAuth provider. */
  avatar_url: string | null;
  onboarding_completed: boolean;
  updated_at: string | null;
};

export type DashboardSummary = {
  workoutsCompleted: number;
  currentStreak: number;
  totalMinutes: number;
  latestWorkoutName: string | null;
};
