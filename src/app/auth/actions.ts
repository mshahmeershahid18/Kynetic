"use server";

import { redirect } from "next/navigation";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { sendAuthEmail } from "@/lib/email/sender";

function getRequiredString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function getOrigin() {
  return process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
}

export async function signUpWithEmail(formData: FormData) {
  const admin = getSupabaseAdmin();
  if (!admin) {
    redirect("/auth/signup?error=Supabase%20Admin%20is%20not%20configured");
  }

  const email = getRequiredString(formData, "email");
  const password = getRequiredString(formData, "password");
  const fullName = getRequiredString(formData, "full_name");

  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type: "signup",
    email,
    password,
    options: {
      data: { full_name: fullName },
      redirectTo: `${getOrigin()}/auth/callback?next=/onboarding`,
    },
  });

  if (linkError || !linkData.properties?.action_link) {
    redirect(`/auth/signup?error=${encodeURIComponent(linkError?.message || "Could not create that account")}`);
  }

  await sendAuthEmail(email, "signup", linkData.properties.action_link);

  redirect("/auth/login?message=Check%20your%20email%20to%20confirm%20your%20account%2C%20then%20sign%20in.");
}

export async function signInWithEmail(formData: FormData) {
  const supabase = createServerSupabaseClient();
  if (!supabase) {
    redirect("/auth/login?error=Supabase%20is%20not%20configured");
  }

  const email = getRequiredString(formData, "email");
  const password = getRequiredString(formData, "password");

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirect(`/auth/login?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/dashboard");
}

export async function signInWithGoogle() {
  const supabase = createServerSupabaseClient();
  if (!supabase) {
    redirect("/auth/login?error=Supabase%20is%20not%20configured");
  }

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${getOrigin()}/auth/callback?next=/dashboard`,
      queryParams: { access_type: "offline", prompt: "consent" },
    },
  });

  if (error || !data.url) {
    redirect(`/auth/login?error=${encodeURIComponent(error?.message ?? "Could not start Google sign in")}`);
  }

  redirect(data.url);
}

export async function signOut() {
  const supabase = createServerSupabaseClient();
  if (supabase) {
    await supabase.auth.signOut();
  }
  redirect("/");
}

export async function requestPasswordReset(formData: FormData) {
  const admin = getSupabaseAdmin();
  if (!admin) {
    redirect("/auth/reset-password?error=Supabase%20Admin%20is%20not%20configured");
  }

  const email = getRequiredString(formData, "email");

  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type: "recovery",
    email,
    options: {
      redirectTo: `${getOrigin()}/auth/callback?next=/dashboard`,
    },
  });

  if (!linkError && linkData.properties?.action_link) {
    await sendAuthEmail(email, "recovery", linkData.properties.action_link);
  }

  // Always report the same outcome. Surfacing "user not found" here would let
  // anyone probe which email addresses have Kynetic accounts.
  redirect(
    "/auth/reset-password?message=If%20an%20account%20exists%20for%20that%20email%2C%20a%20reset%20link%20is%20on%20its%20way."
  );
}
