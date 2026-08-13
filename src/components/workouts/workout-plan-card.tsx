import Link from "next/link";
import { CheckCircle2, Clock, Dumbbell, Flame, Sparkles } from "lucide-react";

import { generateWorkoutAction } from "@/app/workouts/actions";
import type { WorkoutPlanRecord, WorkoutSessionRecord } from "@/lib/workouts/types";

export function GenerateWorkoutButton({ compact = false, pulse = false }: { compact?: boolean; pulse?: boolean }) {
  return (
    <form action={generateWorkoutAction} className={pulse ? "animate-pulse" : ""}>
      <button
        type="submit"
        className={`focus-ring inline-flex shrink-0 items-center gap-2 rounded-lg bg-primary font-medium text-primary-foreground transition hover:opacity-90 ${
          compact ? "px-4 py-2 text-sm" : "px-5 py-2.5 text-sm"
        }`}
      >
        <Sparkles className="h-4 w-4" />
        Generate workout
      </button>
    </form>
  );
}

export function WorkoutPlanCard({ plan, completed }: { plan: WorkoutPlanRecord; completed?: boolean }) {
  const exerciseCount = plan.plan.blocks.reduce((total, block) => total + block.exercises.length, 0);

  return (
    <Link
      href={`/workouts/${plan.id}`}
      className="focus-ring block rounded-xl border border-border bg-background px-5 py-4 transition hover:border-primary/50 hover:bg-muted/40"
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="min-w-0 flex-1 truncate text-sm font-semibold">{plan.title}</h3>
        {completed ? (
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
        ) : null}
      </div>
      {plan.summary ? (
        <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-muted-foreground">{plan.summary}</p>
      ) : null}
      <div className="mt-3.5 flex flex-wrap gap-3 text-xs text-muted-foreground">
        <Meta icon={<Clock className="h-3.5 w-3.5" />} label={`${plan.duration_minutes ?? plan.plan.duration_minutes} min`} />
        <Meta icon={<Flame className="h-3.5 w-3.5" />} label={plan.difficulty ?? plan.plan.difficulty} />
        <Meta icon={<Dumbbell className="h-3.5 w-3.5" />} label={`${exerciseCount} exercises`} />
      </div>
    </Link>
  );
}

export function WorkoutHistory({ plans, sessions }: { plans: WorkoutPlanRecord[]; sessions: WorkoutSessionRecord[] }) {
  const completedPlanIds = new Set(
    sessions.filter((session) => session.status === "completed").map((session) => session.workout_plan_id)
  );

  if (!plans.length) {
    return (
      <div className="rounded-xl border border-dashed border-border px-6 py-10 text-center">
        <Dumbbell className="mx-auto h-5 w-5 text-muted-foreground" />
        <p className="mt-3 text-sm font-medium">No workouts yet</p>
        <p className="mx-auto mt-1.5 max-w-sm text-sm leading-relaxed text-muted-foreground">
          Generate your first session from your profile. Kynetic saves it here so you can revisit it any time.
        </p>
        <div className="mt-5 flex justify-center">
          <GenerateWorkoutButton pulse />
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {plans.map((plan) => (
        <WorkoutPlanCard key={plan.id} plan={plan} completed={completedPlanIds.has(plan.id)} />
      ))}
    </div>
  );
}

function Meta({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 capitalize">
      {icon}
      {label}
    </span>
  );
}
