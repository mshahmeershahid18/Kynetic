import type { ReactNode } from "react";
import Link from "next/link";
import { CheckCircle2, Clock, Dumbbell, Flame } from "lucide-react";

import { generateWorkoutAction } from "@/app/workouts/actions";
import type { WorkoutPlanRecord, WorkoutSessionRecord } from "@/lib/workouts/types";

export function GenerateWorkoutButton({ compact = false }: { compact?: boolean }) {
  return (
    <form action={generateWorkoutAction}>
      <button
        type="submit"
        className={compact ? "focus-ring rounded-full bg-primary px-5 py-3 text-sm font-black text-primary-foreground transition hover:scale-[1.02]" : "focus-ring rounded-full bg-primary px-6 py-4 font-black text-primary-foreground shadow-glow transition hover:scale-[1.02]"}
      >
        Generate AI workout
      </button>
    </form>
  );
}

export function WorkoutPlanCard({ plan, completed }: { plan: WorkoutPlanRecord; completed?: boolean }) {
  const exerciseCount = plan.plan.blocks.reduce((total, block) => total + block.exercises.length, 0);

  return (
    <Link href={`/workouts/${plan.id}`} className="block rounded-[2rem] border border-border bg-background p-5 transition hover:-translate-y-1 hover:border-primary/60 hover:shadow-lg">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-primary">AI plan</p>
          <h3 className="mt-2 text-xl font-black tracking-tight">{plan.title}</h3>
        </div>
        {completed ? <CheckCircle2 className="h-6 w-6 shrink-0 text-green-500" /> : <Dumbbell className="h-6 w-6 shrink-0 text-primary" />}
      </div>
      <p className="mt-3 line-clamp-2 text-sm leading-6 text-muted-foreground">{plan.summary}</p>
      <div className="mt-5 grid grid-cols-3 gap-2 text-sm">
        <Meta icon={<Clock className="h-4 w-4" />} label={`${plan.duration_minutes ?? plan.plan.duration_minutes} min`} />
        <Meta icon={<Flame className="h-4 w-4" />} label={plan.difficulty ?? plan.plan.difficulty} />
        <Meta icon={<Dumbbell className="h-4 w-4" />} label={`${exerciseCount} moves`} />
      </div>
    </Link>
  );
}

export function WorkoutHistory({ plans, sessions }: { plans: WorkoutPlanRecord[]; sessions: WorkoutSessionRecord[] }) {
  const completedPlanIds = new Set(sessions.filter((session) => session.status === "completed").map((session) => session.workout_plan_id));

  if (!plans.length) {
    return (
      <div className="rounded-[2rem] border border-dashed border-border bg-muted/40 p-8 text-center">
        <Dumbbell className="mx-auto h-10 w-10 text-primary" />
        <h3 className="mt-4 text-2xl font-black">No generated workouts yet</h3>
        <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-muted-foreground">
          Generate your first personalized session from your onboarding profile. Kynetic will save it here so you can revisit and complete it.
        </p>
        <div className="mt-6 flex justify-center"><GenerateWorkoutButton /></div>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {plans.map((plan) => <WorkoutPlanCard key={plan.id} plan={plan} completed={completedPlanIds.has(plan.id)} />)}
    </div>
  );
}

function Meta({ icon, label }: { icon: ReactNode; label: string }) {
  return <span className="flex items-center justify-center gap-1 rounded-full bg-muted px-2 py-2 font-bold capitalize text-muted-foreground">{icon}{label}</span>;
}
