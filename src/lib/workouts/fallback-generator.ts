import type { GeneratedWorkoutPlan, WorkoutExercise, WorkoutProfileSnapshot } from "@/lib/workouts/types";

const strengthPool: WorkoutExercise[] = [
  { name: "Goblet squat", muscle_group: "Lower body", equipment: "dumbbells", sets: 3, reps: "8-10", rest_seconds: 75, instructions: ["Hold one weight at chest height.", "Sit hips back and keep knees tracking over toes.", "Drive through the floor to stand tall."] },
  { name: "Push-up", muscle_group: "Chest", equipment: "bodyweight", sets: 3, reps: "6-12", rest_seconds: 60, instructions: ["Set hands under shoulders and brace your core.", "Lower as one unit until chest nears the floor.", "Press back up without flaring elbows wide."] },
  { name: "Bent-over row", muscle_group: "Back", equipment: "dumbbells", sets: 3, reps: "10-12", rest_seconds: 60, instructions: ["Hinge at the hips with a long spine.", "Pull weights toward your lower ribs.", "Control the lowering phase."] },
  { name: "Reverse lunge", muscle_group: "Lower body", equipment: "bodyweight", sets: 2, reps: "8 each side", rest_seconds: 60, instructions: ["Step one foot back into a split stance.", "Lower until both knees bend comfortably.", "Push through the front foot to return."] },
  { name: "Plank", muscle_group: "Core", equipment: "bodyweight", sets: 3, reps: "30-45 sec", rest_seconds: 45, instructions: ["Stack elbows under shoulders.", "Squeeze glutes and keep ribs tucked.", "Breathe steadily without sagging."] },
];

const endurancePool: WorkoutExercise[] = [
  { name: "Marching high knees", muscle_group: "Conditioning", equipment: "bodyweight", sets: 3, reps: "45 sec", rest_seconds: 30, instructions: ["Stand tall and alternate knee drives.", "Pump arms naturally.", "Keep the pace brisk but controlled."] },
  { name: "Step-back squat", muscle_group: "Lower body", equipment: "bodyweight", sets: 3, reps: "12-15", rest_seconds: 45, instructions: ["Squat to a comfortable depth.", "Step one foot back after each rep.", "Alternate sides while keeping the chest proud."] },
  { name: "Mountain climber", muscle_group: "Core", equipment: "bodyweight", sets: 3, reps: "30 sec", rest_seconds: 30, instructions: ["Start in a strong plank.", "Drive knees toward the chest one at a time.", "Keep hips steady."] },
  { name: "Glute bridge", muscle_group: "Posterior chain", equipment: "bodyweight", sets: 3, reps: "12-15", rest_seconds: 45, instructions: ["Lie on your back with feet planted.", "Lift hips by squeezing glutes.", "Pause at the top, then lower slowly."] },
];

function normalized(value: string | null | undefined) {
  return (value ?? "").toLowerCase();
}

function allowedExercise(exercise: WorkoutExercise, equipment: string[]) {
  const owned = equipment.map((item) => item.toLowerCase());
  return exercise.equipment === "bodyweight" || owned.some((item) => exercise.equipment.includes(item) || item.includes(exercise.equipment));
}

function pickExercises(profile: WorkoutProfileSnapshot) {
  const goal = normalized(profile.goal);
  const base = goal.includes("endurance") || goal.includes("fat") ? endurancePool : strengthPool;
  const available = base.filter((exercise) => allowedExercise(exercise, profile.equipment));
  const selected = (available.length >= 4 ? available : [...available, ...base.filter((exercise) => exercise.equipment === "bodyweight")]).slice(0, 5);
  return selected.length ? selected : strengthPool.filter((exercise) => exercise.equipment === "bodyweight").slice(0, 4);
}

function difficulty(profile: WorkoutProfileSnapshot) {
  const experience = normalized(profile.experience_level || profile.fitness_level);
  if (experience.includes("experienced") || experience.includes("athlete") || experience.includes("high")) return "advanced";
  if (experience.includes("intermediate") || experience.includes("moderate")) return "intermediate";
  return "beginner";
}

export function generateFallbackWorkout(profile: WorkoutProfileSnapshot): GeneratedWorkoutPlan {
  const minutes = profile.available_minutes ?? 35;
  const exercises = pickExercises(profile).map((exercise) => ({
    ...exercise,
    sets: difficulty(profile) === "beginner" ? Math.min(exercise.sets, 2) : exercise.sets,
  }));

  return {
    title: `${profile.goal ?? "Personalized"} session`,
    summary: `A ${minutes}-minute workout tailored to your goal, level, equipment, and schedule.`,
    duration_minutes: minutes,
    difficulty: difficulty(profile),
    goal: profile.goal ?? "General wellness",
    warmup: ["3 minutes easy cardio or marching in place", "10 bodyweight good mornings", "10 arm circles each direction"],
    blocks: [{ name: "Main training block", focus: profile.goal ?? "Full body fitness", exercises }],
    cooldown: ["Slow nasal breathing for 60 seconds", "Standing quad stretch", "Chest and lat stretch"],
    coaching_notes: [
      "Move with clean form before adding speed or load.",
      profile.limitations ? `Respect this limitation: ${profile.limitations}` : "Stop if pain appears and choose a gentler range of motion.",
      "Log how the session felt so future workouts can adapt.",
    ],
  };
}
