import type { DashboardSummary } from "@/lib/profiles/types";

export const emptyDashboardSummary: DashboardSummary = {
  workoutsCompleted: 0,
  currentStreak: 0,
  totalMinutes: 0,
  latestWorkoutName: null,
};

export const starterRecommendations = [
  "Complete your fitness profile so generated workouts can match your goals.",
  "Set a realistic weekly training target before AI generation is enabled.",
  "Add limitations or injuries now so future plans can avoid unsafe movements.",
];

export const starterNextActions = [
  { title: "Review profile", href: "/onboarding", detail: "Update goals, metrics, equipment, and limitations." },
  { title: "Workout generation", href: "/dashboard", detail: "Coming in the next phase: AI generated plans." },
  { title: "Progress tracking", href: "/dashboard", detail: "Session history will appear here after workouts launch." },
];
