import type { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, CheckCircle2, Clock, Dumbbell, Target, Play } from "lucide-react";

import { completeWorkoutAction } from "@/app/workouts/actions";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { AiFeedbackRecord, WorkoutPlanRecord } from "@/lib/workouts/types";

export default async function WorkoutPlanPage({ params, searchParams }: { params: { planId: string }; searchParams?: { message?: string } }) {
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

  const { data: sessions } = await supabase
    .from("workout_sessions")
    .select("*")
    .eq("workout_plan_id", params.planId)
    .eq("user_id", user.id)
    .order("completed_at", { ascending: false });

  const { data: feedback } = await supabase
    .from("ai_feedback")
    .select("*")
    .eq("workout_plan_id", params.planId)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(3);

  const workout = plan as WorkoutPlanRecord;
  const completed = Boolean(sessions?.some((session) => session.status === "completed"));
  const feedbackRecords = (feedback ?? []) as AiFeedbackRecord[];

  return (
    <main className="container-shell py-10">
      <Link href="/dashboard" className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-bold transition hover:border-primary/60">
        <ArrowLeft className="h-4 w-4" /> Dashboard
      </Link>

      {searchParams?.message ? <p className="mt-6 rounded-2xl border border-border bg-card p-4 text-sm font-bold text-muted-foreground">{searchParams.message}</p> : null}

      <section className="mt-8 rounded-[2.5rem] border border-border bg-card p-6 md:p-8">
        <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-start">
          <div>
            <p className="font-black uppercase tracking-[0.25em] text-primary">Generated workout</p>
            <h1 className="mt-3 text-4xl font-black tracking-tight md:text-5xl">{workout.title}</h1>
            <p className="mt-4 max-w-3xl leading-7 text-muted-foreground">{workout.summary}</p>
          </div>
          <div className="flex flex-col gap-3 rounded-[2rem] bg-muted p-4 sm:min-w-[300px]">
            <Link href={`/workouts/${workout.id}/play`} className="focus-ring inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-6 py-4 font-black text-primary-foreground transition hover:scale-[1.02]">
              <Play className="h-5 w-5 fill-primary-foreground" /> Start Session
            </Link>
            <form action={completeWorkoutAction}>
              <input type="hidden" name="plan_id" value={workout.id} />
              <input type="hidden" name="duration_minutes" value={workout.duration_minutes ?? workout.plan.duration_minutes} />
              <button type="submit" className="focus-ring inline-flex w-full items-center justify-center gap-2 rounded-full border border-border bg-background px-6 py-4 font-black transition hover:bg-muted">
                <CheckCircle2 className="h-5 w-5" /> {completed ? "Complete again" : "Mark complete manually"}
              </button>
            </form>
          </div>
        </div>

        <div className="mt-8 grid gap-3 md:grid-cols-4">
          <Metric icon={<Clock className="h-5 w-5" />} label="Duration" value={`${workout.duration_minutes ?? workout.plan.duration_minutes} min`} />
          <Metric icon={<Target className="h-5 w-5" />} label="Goal" value={workout.goal ?? workout.plan.goal} />
          <Metric icon={<Dumbbell className="h-5 w-5" />} label="Difficulty" value={workout.difficulty ?? workout.plan.difficulty} />
          <Metric icon={<CheckCircle2 className="h-5 w-5" />} label="Status" value={completed ? "Completed" : "Ready"} />
        </div>
      </section>

      <section className="mt-8 grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
        <Panel title="Warmup">
          <OrderedList items={workout.plan.warmup} />
        </Panel>
        <div className="space-y-6">
          {workout.plan.blocks.map((block) => (
            <Panel key={block.name} title={block.name} eyebrow={block.focus}>
              <div className="space-y-4">
                {block.exercises.map((exercise) => (
                  <article key={`${block.name}-${exercise.name}`} className="rounded-2xl border border-border bg-background p-5">
                    <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                      <div>
                        <h3 className="text-xl font-black">{exercise.name}</h3>
                        <p className="mt-1 text-sm font-bold text-muted-foreground">{exercise.muscle_group} • {exercise.equipment}</p>
                      </div>
                      <p className="rounded-full bg-primary/10 px-3 py-1 text-sm font-black text-primary">
                        {exercise.sets} sets × {exercise.reps} • {exercise.rest_seconds}s rest
                      </p>
                    </div>
                    <ul className="mt-4 space-y-2 text-sm leading-6 text-muted-foreground">
                      {exercise.instructions.map((item) => <li key={item}>• {item}</li>)}
                    </ul>
                  </article>
                ))}
              </div>
            </Panel>
          ))}
        </div>
      </section>

      <section className="mt-6 grid gap-6 lg:grid-cols-2">
        <Panel title="Cooldown"><OrderedList items={workout.plan.cooldown} /></Panel>
        <Panel title="AI coaching notes"><OrderedList items={workout.plan.coaching_notes} /></Panel>
      </section>

      {feedbackRecords.length ? (
        <section className="mt-6 rounded-[2rem] border border-border bg-card p-6">
          <p className="text-sm font-black uppercase tracking-[0.2em] text-primary">Post-session coach</p>
          <h2 className="mt-2 text-2xl font-black">Saved feedback for this plan</h2>
          <div className="mt-5 space-y-4">
            {feedbackRecords.map((record) => (
              <article key={record.id} className="rounded-2xl bg-background p-5">
                <h3 className="font-black">{record.feedback.headline}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{record.feedback.summary}</p>
                <div className="mt-4 grid gap-4 md:grid-cols-3">
                  <MiniList title="Wins" items={record.feedback.wins} />
                  <MiniList title="Improve" items={record.feedback.improvements} />
                  <MiniList title="Next" items={record.feedback.suggestions} />
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}
    </main>
  );
}

function Metric({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return <div className="rounded-2xl bg-muted p-4"><div className="mb-3 text-primary">{icon}</div><p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{label}</p><p className="mt-1 font-black capitalize">{value}</p></div>;
}

function Panel({ title, eyebrow, children }: { title: string; eyebrow?: string; children: ReactNode }) {
  return <div className="rounded-[2rem] border border-border bg-card p-6">{eyebrow ? <p className="text-sm font-black text-primary">{eyebrow}</p> : null}<h2 className="text-2xl font-black">{title}</h2><div className="mt-4">{children}</div></div>;
}

function OrderedList({ items }: { items: string[] }) {
  return <ol className="space-y-3 text-sm leading-6 text-muted-foreground">{items.map((item, index) => <li key={item} className="rounded-2xl bg-background p-4"><span className="mr-2 font-black text-primary">{index + 1}.</span>{item}</li>)}</ol>;
}

function MiniList({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <p className="text-xs font-black uppercase tracking-widest text-primary">{title}</p>
      <ul className="mt-2 space-y-2 text-sm leading-6 text-muted-foreground">
        {items.slice(0, 3).map((item) => <li key={item}>• {item}</li>)}
      </ul>
    </div>
  );
}
