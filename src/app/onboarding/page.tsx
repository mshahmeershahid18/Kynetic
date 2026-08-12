import { redirect } from "next/navigation";

import { AuthMessage } from "@/components/auth/auth-message";
import { ProfileForm } from "@/components/onboarding/profile-form";
import type { FitnessProfile } from "@/lib/profiles/types";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export default async function OnboardingPage({ searchParams }: { searchParams: { message?: string } }) {
  const supabase = createServerSupabaseClient();

  if (!supabase) {
    return <OnboardingShell message="Supabase is not configured. Add .env.local values before saving profiles." />;
  }

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    redirect("/auth/login?message=Please%20sign%20in%20to%20complete%20onboarding");
  }

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", userData.user.id).returns<FitnessProfile>().maybeSingle();

  return (
    <OnboardingShell message={searchParams.message}>
      <ProfileForm profile={profile} email={userData.user.email} />
    </OnboardingShell>
  );
}

function OnboardingShell({ children, message }: { children?: React.ReactNode; message?: string }) {
  return (
    <main className="container-shell py-12">
      <div className="mb-8 max-w-3xl">
        <p className="font-bold text-primary">Onboarding profile</p>
        <h1 className="mt-3 text-4xl font-black tracking-tight">Tell Kynetic how to coach you.</h1>
        <p className="mt-4 text-muted-foreground">
          These profile fields power personalized AI workout generation in the next phase and keep recommendations safe around limitations.
        </p>
      </div>
      <div className="rounded-[2rem] border border-border bg-card p-6 shadow-2xl sm:p-8">
        <AuthMessage message={message} />
        {children ? <div className="mt-6">{children}</div> : null}
      </div>
    </main>
  );
}
