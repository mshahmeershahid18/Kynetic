import { redirect } from "next/navigation";

import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import type { FitnessProfile } from "@/lib/profiles/types";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = createServerSupabaseClient();

  if (!supabase) {
    return (
      <main className="container-shell py-12">
        <div className="rounded-[2rem] border border-border bg-card p-8">
          <p className="font-bold text-primary">Supabase required</p>
          <h1 className="mt-2 text-3xl font-black">Dashboard is protected by Supabase Auth.</h1>
          <p className="mt-4 text-muted-foreground">Add Supabase environment values in .env.local to sign in and access this route.</p>
        </div>
      </main>
    );
  }

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    redirect("/auth/login?message=Please%20sign%20in%20to%20open%20your%20dashboard");
  }

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", userData.user.id).returns<FitnessProfile>().maybeSingle();

  if (!profile?.onboarding_completed) {
    redirect("/onboarding");
  }

  return <DashboardShell profile={profile} />;
}
