import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { PlayClient } from "./play-client";
import type { WorkoutPlanRecord } from "@/lib/workouts/types";

export const dynamic = "force-dynamic";

export default async function PlayWorkoutPage({ params }: { params: { planId: string } }) {
  const supabase = createServerSupabaseClient();
  if (!supabase) return null;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: plan, error } = await supabase
    .from("workout_plans")
    .select("*")
    .eq("id", params.planId)
    .eq("user_id", user.id)
    .single();

  if (error || !plan) redirect("/dashboard?message=Workout%20not%20found");

  return (
    <main className="container-shell py-10 min-h-screen">
      <PlayClient plan={plan as WorkoutPlanRecord} />
    </main>
  );
}
