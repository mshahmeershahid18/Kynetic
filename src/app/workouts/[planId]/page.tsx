import type { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Camera, CheckCircle2, Play, Sparkles } from "lucide-react";

import { completeWorkoutAction } from "@/app/workouts/actions";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { supportsVision } from "@/lib/vision/exercise-analyzers";
import type { AiFeedbackRecord, WorkoutPlanRecord } from "@/lib/workouts/types";

export const dynamic = "force-dynamic";

export default async function WorkoutPlanPage({
  params,
  searchParams,
}: {
  params: { planId: string };
  searchParams?: { message?: string };
}) {
  const supabase = createServerSupabaseClient();
  if (!supabase) return null;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: plan, error } = await supabase
    .from("workout_plans")
    .select("*")
    .eq("id", params.planId)
    .eq("user_id", user.id)
    .single();

  if (error || !plan) redirect("/dashboard?message=Workout%20not%20found");

  const [sessionsResult, feedbackResult] = await Promise.all([
    supabase
      .from("workout_sessions")
      .select("*")
      .eq("workout_plan_id", params.planId)
      .eq("user_id", user.id)
      .order("completed_at", { ascending: false }),
    supabase
      .from("ai_feedback")
      .select("*")
      .eq("workout_plan_id", params.planId)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(3),
  ]);

  const workout = plan as WorkoutPlanRecord;
  const completed = Boolean(sessionsResult.data?.some((session) => session.status === "completed"));
  const feedbackRecords = (feedbackResult.data ?? []) as AiFeedbackRecord[];
  const guidedCount = workout.plan.blocks
    .flatMap((block) => block.exercises)
    .filter((exercise) => supportsVision(exercise.vision_kind)).length;

  return (
    <main className="min-h-screen bg-muted/20 pb-16 pt-8">
      <div className="container-shell max-w-4xl space-y-6">
        <Link
          href="/dashboard"
          className="focus-ring inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3.5 py-2 text-sm font-medium transition hover:bg-muted"
        >
          <ArrowLeft className="h-4 w-4" />
          Dashboard
        </Link>

        {searchParams?.message ? (
          <p className="rounded-xl border border-border bg-card px-4 py-3 text-sm">{searchParams.message}</p>
        ) : null}

        {/* Overview -------------------------------------------------------- */}
        <section className="rounded-2xl border border-border bg-card">
          <header className="flex flex-wrap items-start justify-between gap-4 px-6 py-6">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <Sparkles className="h-3.5 w-3.5 text-muted-foreground" />
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  {workout.generator === "gemini" ? "AI generated" : "Generated workout"}
                </p>
              </div>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">{workout.title}</h1>
              {workout.summary ? (
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                  {workout.summary}
                </p>
              ) : null}
            </div>

            <div className="flex w-full shrink-0 flex-col gap-2 sm:w-auto">
              <Link
                href={`/workouts/${workout.id}/play`}
                className="focus-ring inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition hover:opacity-90"
              >
                <Play className="h-4 w-4" />
                Start session
              </Link>
              <form action={completeWorkoutAction}>
                <input type="hidden" name="plan_id" value={workout.id} />
                <input
                  type="hidden"
                  name="duration_minutes"
                  value={workout.duration_minutes ?? workout.plan.duration_minutes}
                />
                <button
                  type="submit"
                  className="focus-ring inline-flex w-full items-center justify-center gap-2 rounded-lg border border-border px-5 py-2.5 text-sm font-medium transition hover:bg-muted"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  {completed ? "Log again" : "Log manually"}
                </button>
              </form>
            </div>
          </header>

          <div className="grid grid-cols-2 divide-x divide-y divide-border border-t border-border sm:grid-cols-4 sm:divide-y-0">
            <Cell label="Duration" value={`${workout.duration_minutes ?? workout.plan.duration_minutes} min`} />
            <Cell label="Goal" value={workout.goal ?? workout.plan.goal} />
            <Cell label="Difficulty" value={workout.difficulty ?? workout.plan.difficulty} />
            <Cell label="Status" value={completed ? "Completed" : "Ready"} />
          </div>

          {guidedCount ? (
            <p className="flex items-center gap-2 border-t border-border px-6 py-3.5 text-sm text-muted-foreground">
              <Camera className="h-3.5 w-3.5 shrink-0" />
              {guidedCount} of these exercises support live camera guidance during the session.
            </p>
          ) : null}
        </section>

        {/* Warmup ---------------------------------------------------------- */}
        <Panel title="Warm-up">
          <NumberedList items={workout.plan.warmup} />
        </Panel>

        {/* Blocks ---------------------------------------------------------- */}
        {workout.plan.blocks.map((block) => (
          <Panel key={block.name} title={block.name} eyebrow={block.focus}>
            <ul className="space-y-3">
              {block.exercises.map((exercise) => (
                <li
                  key={`${block.name}-${exercise.slug || exercise.name}`}
                  className="rounded-xl border border-border bg-background px-5 py-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm font-semibold">{exercise.name}</h3>
                        {supportsVision(exercise.vision_kind) ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                            <Camera className="h-3 w-3" />
                            Live guidance
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1 text-xs capitalize text-muted-foreground">
                        {exercise.muscle_group} · {exercise.equipment}
                      </p>
                    </div>
                    <p className="shrink-0 rounded-lg bg-muted px-3 py-1.5 text-xs font-medium tabular-nums">
                      {exercise.sets} × {exercise.reps} · {exercise.rest_seconds}s rest
                    </p>
                  </div>
                  <ol className="mt-3 space-y-1.5">
                    {exercise.instructions.map((item, index) => (
                      <li key={item} className="flex gap-2.5 text-sm leading-relaxed text-muted-foreground">
                        <span className="text-muted-foreground/50 tabular-nums">{index + 1}.</span>
                        {item}
                      </li>
                    ))}
                  </ol>
                </li>
              ))}
            </ul>
          </Panel>
        ))}

        <div className="grid gap-6 md:grid-cols-2">
          <Panel title="Cool-down">
            <NumberedList items={workout.plan.cooldown} />
          </Panel>
          <Panel title="Coaching notes">
            <NumberedList items={workout.plan.coaching_notes} />
          </Panel>
        </div>

        {/* Feedback -------------------------------------------------------- */}
        {feedbackRecords.length ? (
          <Panel title="Coach feedback for this plan">
            <div className="space-y-4">
              {feedbackRecords.map((record) => (
                <article key={record.id} className="rounded-xl border border-border bg-background px-5 py-4">
                  <h3 className="text-sm font-semibold">{record.feedback.headline}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {record.feedback.summary}
                  </p>
                  <div className="mt-4 grid gap-4 sm:grid-cols-3">
                    <MiniList title="Wins" items={record.feedback.wins} />
                    <MiniList title="Improve" items={record.feedback.improvements} />
                    <MiniList title="Next time" items={record.feedback.suggestions} />
                  </div>
                </article>
              ))}
            </div>
          </Panel>
        ) : null}
      </div>
    </main>
  );
}

function Cell({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-4 py-4 text-center">
      <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 truncate text-sm font-semibold capitalize">{value}</p>
    </div>
  );
}

function Panel({ title, eyebrow, children }: { title: string; eyebrow?: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-border bg-card">
      <header className="border-b border-border px-6 py-4">
        {eyebrow ? (
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{eyebrow}</p>
        ) : null}
        <h2 className="text-sm font-semibold">{title}</h2>
      </header>
      <div className="px-6 py-5">{children}</div>
    </section>
  );
}

function NumberedList({ items }: { items: string[] }) {
  if (!items.length) {
    return <p className="text-sm text-muted-foreground">Nothing prescribed here.</p>;
  }
  return (
    <ol className="space-y-2">
      {items.map((item, index) => (
        <li key={item} className="flex gap-3 text-sm leading-relaxed text-muted-foreground">
          <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-semibold">
            {index + 1}
          </span>
          {item}
        </li>
      ))}
    </ol>
  );
}

function MiniList({ title, items }: { title: string; items: string[] }) {
  if (!items.length) return null;
  return (
    <div>
      <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{title}</p>
      <ul className="mt-2 space-y-1.5">
        {items.slice(0, 3).map((item) => (
          <li key={item} className="text-sm leading-relaxed text-muted-foreground">
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
