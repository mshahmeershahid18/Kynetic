import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { ExerciseLibraryEntry } from "@/lib/workouts/types";

/**
 * The exercise library is shared reference data. Every generated plan draws
 * from it, which is what guarantees each prescribed movement has instructions,
 * a demo, and a known live-tracking capability.
 *
 * BUILTIN_LIBRARY mirrors the seed rows so the product still works before
 * `supabase/seed-exercises.sql` has been run.
 */
export const BUILTIN_LIBRARY: ExerciseLibraryEntry[] = [
  {
    id: "builtin-bodyweight-squat",
    slug: "bodyweight-squat",
    name: "Bodyweight squat",
    muscle_group: "Lower body",
    equipment: "bodyweight",
    difficulty: "beginner",
    instructions: [
      "Stand with feet shoulder width apart, toes turned slightly out.",
      "Push your hips back and bend your knees to lower down.",
      "Descend until your thighs are at least parallel to the floor.",
      "Drive through your whole foot to stand back up.",
    ],
    cues: ["Chest stays proud", "Knees track over toes", "Heels stay planted"],
    demo_media_url: null,
    demo_poster_url: null,
    vision_kind: "squat",
  },
  {
    id: "builtin-push-up",
    slug: "push-up",
    name: "Push-up",
    muscle_group: "Chest",
    equipment: "bodyweight",
    difficulty: "beginner",
    instructions: [
      "Set your hands slightly wider than your shoulders.",
      "Brace your core so your body forms one straight line.",
      "Lower until your chest is just above the floor.",
      "Press back up without letting your hips sag.",
    ],
    cues: ["Body in one line", "Elbows about 45 degrees", "Full lockout at the top"],
    demo_media_url: null,
    demo_poster_url: null,
    vision_kind: "pushup",
  },
  {
    id: "builtin-reverse-lunge",
    slug: "reverse-lunge",
    name: "Reverse lunge",
    muscle_group: "Lower body",
    equipment: "bodyweight",
    difficulty: "beginner",
    instructions: [
      "Stand tall with your feet hip width apart.",
      "Step one foot back and lower until both knees bend about 90 degrees.",
      "Keep your torso upright throughout.",
      "Push through the front foot to return to standing.",
    ],
    cues: ["Torso upright", "Front knee over ankle", "Control the step back"],
    demo_media_url: null,
    demo_poster_url: null,
    vision_kind: "lunge",
  },
  {
    id: "builtin-glute-bridge",
    slug: "glute-bridge",
    name: "Glute bridge",
    muscle_group: "Glutes",
    equipment: "bodyweight",
    difficulty: "beginner",
    instructions: [
      "Lie on your back with knees bent and feet flat on the floor.",
      "Squeeze your glutes and lift your hips toward the ceiling.",
      "Pause at the top with your body in a straight line.",
      "Lower with control without resting fully between reps.",
    ],
    cues: ["Squeeze at the top", "Ribs stay down", "Push through the heels"],
    demo_media_url: null,
    demo_poster_url: null,
    vision_kind: "glute_bridge",
  },
  {
    id: "builtin-plank",
    slug: "plank",
    name: "Plank",
    muscle_group: "Core",
    equipment: "bodyweight",
    difficulty: "beginner",
    instructions: [
      "Set your elbows directly under your shoulders.",
      "Extend your legs so your body forms one straight line.",
      "Tuck your ribs and squeeze your glutes.",
      "Hold for the prescribed time while breathing steadily.",
    ],
    cues: ["Hips level", "Ribs tucked", "Breathe steadily"],
    demo_media_url: null,
    demo_poster_url: null,
    vision_kind: null,
  },
  {
    id: "builtin-marching-high-knees",
    slug: "marching-high-knees",
    name: "Marching high knees",
    muscle_group: "Conditioning",
    equipment: "bodyweight",
    difficulty: "beginner",
    instructions: [
      "Stand tall with your core braced.",
      "Drive one knee up toward hip height.",
      "Alternate legs at a brisk, sustainable rhythm.",
      "Land softly on the ball of your foot.",
    ],
    cues: ["Stay tall", "Land softly", "Steady rhythm"],
    demo_media_url: null,
    demo_poster_url: null,
    vision_kind: null,
  },
];

/**
 * Supabase Storage paths are stored relative to the bucket. Turn them into
 * URLs the browser can load, leaving absolute URLs untouched.
 */
export function resolveDemoUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (path.startsWith("http://") || path.startsWith("https://")) return path;

  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return null;
  return `${base.replace(/\/$/, "")}/storage/v1/object/public/${path.replace(/^\//, "")}`;
}

export async function fetchExerciseLibrary(): Promise<ExerciseLibraryEntry[]> {
  const supabase = createServerSupabaseClient();
  if (!supabase) return BUILTIN_LIBRARY;

  const { data, error } = await supabase
    .from("exercises")
    .select("id, slug, name, muscle_group, equipment, difficulty, instructions, cues, demo_media_url, demo_poster_url, vision_kind")
    .order("muscle_group", { ascending: true });

  if (error || !data?.length) {
    // Table not seeded yet, or unreachable — the built-in set keeps the app working.
    return BUILTIN_LIBRARY;
  }

  return data as ExerciseLibraryEntry[];
}

export async function fetchExerciseBySlug(slug: string): Promise<ExerciseLibraryEntry | null> {
  const library = await fetchExerciseLibrary();
  return library.find((entry) => entry.slug === slug) ?? null;
}

/** Only these can be coached live; everything else is demo + manual logging. */
export function visionCapableExercises(library: ExerciseLibraryEntry[]) {
  return library.filter((entry) => entry.vision_kind !== null);
}
