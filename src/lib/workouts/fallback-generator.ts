import { BUILTIN_LIBRARY } from "@/lib/exercises/library";
import type { ExerciseLibraryEntry, GeneratedWorkoutPlan, WorkoutExercise, WorkoutProfileSnapshot } from "@/lib/workouts/types";

/**
 * Client-side safety net used when the Python service cannot be reached at all.
 * It mirrors `services/ai/fallback_generator.py` so a user always gets the same
 * shape of plan, drawn from the same library, regardless of which layer failed.
 */

const REP_SCHEMES = {
  strength: { sets: 4, reps: "5-6", rest: 120 },
  muscle: { sets: 3, reps: "8-12", rest: 75 },
  endurance: { sets: 3, reps: "15-20", rest: 45 },
  general: { sets: 3, reps: "10-12", rest: 60 },
} as const;

const MUSCLE_ORDER = ["Lower body", "Chest", "Back", "Shoulders", "Glutes", "Hamstrings", "Core", "Conditioning"];

function goalFamily(goal: string | null): keyof typeof REP_SCHEMES {
  const text = (goal ?? "").toLowerCase();
  if (text.includes("strength")) return "strength";
  if (text.includes("muscle") || text.includes("build")) return "muscle";
  if (text.includes("endurance") || text.includes("fat") || text.includes("lose")) return "endurance";
  return "general";
}

function baseDifficulty(profile: WorkoutProfileSnapshot) {
  const level = `${profile.experience_level ?? ""} ${profile.fitness_level ?? ""}`.toLowerCase();
  if (/experienced|athlete|high/.test(level)) return "advanced";
  if (/intermediate|moderate/.test(level)) return "intermediate";
  return "beginner";
}

function isAvailable(entry: ExerciseLibraryEntry, equipment: string[]) {
  const required = entry.equipment.toLowerCase();
  if (required === "bodyweight") return true;
  return equipment.some((item) => {
    const owned = item.toLowerCase();
    return required.includes(owned) || owned.includes(required);
  });
}

/** Conservative keyword screen so stated injuries are respected. */
function avoidsLimitations(entry: ExerciseLibraryEntry, limitations: string | null) {
  if (!limitations) return true;
  const text = limitations.toLowerCase();
  const group = entry.muscle_group.toLowerCase();

  if (text.includes("knee") && (group === "lower body" || group === "glutes")) return false;
  if (text.includes("shoulder") && (group === "shoulders" || group === "chest")) return false;
  if (/back|spine|disc/.test(text) && (group === "back" || group === "hamstrings")) return false;
  if (text.includes("wrist") && group === "chest") return false;
  return true;
}

export function generateFallbackWorkout(
  profile: WorkoutProfileSnapshot,
  library: ExerciseLibraryEntry[] = BUILTIN_LIBRARY
): GeneratedWorkoutPlan {
  const minutes = profile.available_minutes ?? 35;
  const goal = profile.goal ?? "General wellness";
  const scheme = REP_SCHEMES[goalFamily(profile.goal)];
  const difficulty = baseDifficulty(profile);

  let candidates = (library.length ? library : BUILTIN_LIBRARY).filter(
    (entry) => isAvailable(entry, profile.equipment) && avoidsLimitations(entry, profile.limitations)
  );
  if (!candidates.length) {
    candidates = BUILTIN_LIBRARY.filter((entry) => avoidsLimitations(entry, profile.limitations));
  }
  if (!candidates.length) candidates = BUILTIN_LIBRARY;

  // One movement per muscle group first, so the session covers the body.
  const selected: ExerciseLibraryEntry[] = [];
  const usedGroups = new Set<string>();
  for (const group of MUSCLE_ORDER) {
    const match = candidates.find((entry) => entry.muscle_group === group && !usedGroups.has(group));
    if (match) {
      selected.push(match);
      usedGroups.add(group);
    }
  }
  for (const entry of candidates) {
    if (selected.length >= 5) break;
    if (!selected.includes(entry)) selected.push(entry);
  }

  const limit = minutes <= 20 ? 3 : minutes <= 35 ? 4 : 5;
  const sets = difficulty === "beginner" ? Math.max(2, scheme.sets - 1) : scheme.sets;

  const exercises: WorkoutExercise[] = selected.slice(0, limit).map((entry) => ({
    slug: entry.slug,
    name: entry.name,
    muscle_group: entry.muscle_group,
    equipment: entry.equipment,
    sets,
    reps: scheme.reps,
    rest_seconds: scheme.rest,
    instructions: entry.instructions,
    cues: entry.cues,
    demo_media_url: entry.demo_media_url,
    vision_kind: entry.vision_kind,
  }));

  const notes = [
    "Move with clean form before adding speed or load.",
    "Stop a set if your technique breaks down rather than grinding it out.",
  ];
  if (profile.limitations) {
    notes.unshift(`Working around your stated limitation: ${profile.limitations}.`);
  }

  return {
    title: `${goal} session`,
    summary: `A ${minutes}-minute ${difficulty} workout built from your goal, equipment, and available time.`,
    duration_minutes: minutes,
    difficulty,
    goal,
    warmup: [
      "3 minutes of easy movement to raise your temperature",
      "10 bodyweight good mornings",
      "10 arm circles in each direction",
    ],
    blocks: [{ name: "Main training block", focus: goal, exercises }],
    cooldown: [
      "60 seconds of slow nasal breathing",
      "Standing quad stretch, 30 seconds per side",
      "Chest and lat stretch, 30 seconds per side",
    ],
    coaching_notes: notes,
 