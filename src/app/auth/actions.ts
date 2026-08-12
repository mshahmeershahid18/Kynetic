"use server";

import { redirect } from "next/navigation";

import { createServerSupabaseClient } from "@/lib/supabase/server";

function getRequiredString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function getOrigin() {
  return process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
}

export async function signUpWithEmail(formData: FormData) {
  const supabase = createServerSupabaseClient();
  if (!supabase) {
    redirect("/auth/signup?message=Supabase%20is%20not%20configured");
  }

  const email = getRequiredString(formData, "email");
  const password = getRequiredString(formData, "password");
  const fullName = getRequiredString(formData, "full_name");

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName },
      emailRedirectTo: `${getOrigin()}/auth/callback?next=/onboarding`,
    },
  });

  if (error) {
    redirect(`/auth/signup?message=${encodeURIComponent(error.message)}`);
  }

  redirect("/auth/login?message=Check%20your%20email%20to%20confirm%20your%20account%2C%20then%20sign%20in.");
}

export async function signInWithEmail(formData: FormData) {
  const supabase = createServerSupabaseClient();
  if (!supabase) {
    redirect("/auth/login?message=Supabase%20is%20not%20configured");
  }

  const email = getRequiredString(formData, "email");
  const password = getRequiredString(formData, "password");

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirect(`/auth/login?message=${encodeURIComponent(error.message)}`);
  }

  redirect("/dashboard");
}

export async function signInWithGoogle() {
  const supabase = createServerSupabaseClient();
  if (!supabase) {
    redirect("/auth/login?message=Supabase%20is%20not%20configured");
  }

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${getOrigin()}/auth/callback?next=/dashboard`,
      queryParams: { access_type: "offline", prompt: "consent" },
    },
  });

  if (error || !data.url) {
    redirect(`/auth/login?message=${encodeURIComponent(error?.message ?? "Could not start Google sign in")}`);
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
  const supabase = createServerSupabaseClient();
  if (!supabase) {
    redirect("/auth/reset-password?message=Supabase%20is%20not%20configured");
  }

  const email = getRequiredString(formData, "email");
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${getOrigin()}/auth/callback?next=/dashboard`,
  });

  if (error) {
    redirect(`/auth/reset-password?message=${encodeURIComponent(error.message)}`);
  }

  redirect("/auth/reset-password?message=Password%20reset%20link%20sent.%20Check%20your%20email.");
}
