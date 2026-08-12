import Link from "next/link";

import { signOut } from "@/app/auth/actions";
import { AvatarCard } from "@/components/dashboard/avatar-card";
import { emptyDashboardSummary, starterNextActions, starterRecommendations } from "@/lib/dashboard/mock-data";
import type { FitnessProfile } from "@/lib/profiles/types";

export function DashboardShell({ profile }: { profile: FitnessProfile | null }) {
  const summary = emptyDashboardSummary;

  return (
    <main className="container-shell py-10">
      <div className="mb-8 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <p className="font-bold text-primary">Protected dashboard</p>
          <h1 className="mt-2 text-4xl font-black tracking-tight">Today&apos;s training command center</h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">Your profile, progress placeholders, recommendations, and next actions live here. Workout history connects in later phases.</p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Link href="/onboarding" className="focus-ring rounded-full border border-border bg-card px-5 py-3 text-center font-bold transition hover:border-primary/60">Edit profile</Link>
          <form action={signOut}>
            <button className="focus-ring w-full rounded-full bg-secondary px-5 py-3 text-center font-bold text-secondary-foreground transition hover:scale-[1.02]" type="submit">Sign out</button>
          </form>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <AvatarCard profile={profile} />
        <section className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <Metric label="Workouts" value={summary.workoutsCompleted} />
            <Metric label="Streak" value={`${summary.currentStreak} days`} />
            <Metric label="Minutes" value={summary.totalMinutes} />
          </div>

          <div className="rounded-[2rem] border border-border bg-card p-6">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-2xl font-black">Workout history</h2>
              <span className="rounded-full bg-muted px-3 py-1 text-xs font-black text-muted-foreground">No sessions yet</span>
            </div>
            <p className="mt-4 rounded-2xl bg-muted p-4 text-sm text-muted-foreground">
              Completed workouts, form scores, rep totals, and AI feedback will appear here once the workout system is implemented.
            </p>
          </div>

          <div className="rounded-[2rem] border border-border bg-card p-6">
            <h2 className="text-2xl font-black">Recommendations</h2>
            <div className="mt-4 space-y-3">
              {starterRecommendations.map((item) => <p key={item} className="rounded-2xl bg-muted p-4 text-sm text-muted-foreground">{item}</p>)}
            </div>
          </div>

          <div className="rounded-[2rem] border border-border bg-card p-6">
            <h2 className="text-2xl font-black">Next actions</h2>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              {starterNextActions.map((action) => (
                <Link key={action.title} href={action.href} className="rounded-2xl border border-border bg-background p-4 transition hover:border-primary/60">
                  <p className="font-black">{action.title}</p>
                  <p className="mt-2 text-sm text-muted-foreground">{action.detail}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return <div className="rounded-3xl border border-border bg-card p-5"><p className="text-sm font-bold text-muted-foreground">{label}</p><p className="mt-2 text-3xl font-black">{value}</p></div>;
}
