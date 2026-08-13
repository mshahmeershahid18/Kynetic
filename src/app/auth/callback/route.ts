import { NextResponse, type NextRequest } from "next/server";

import { providerFullName, providerPhotoUrl } from "@/lib/profiles/photo";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next") ?? "/dashboard";

  // Providers report a refusal here rather than by failing the exchange.
  const providerError =
    requestUrl.searchParams.get("error_description") ?? requestUrl.searchParams.get("error");
  if (providerError) {
    return NextResponse.redirect(
      new URL(`/auth/login?error=${encodeURIComponent(providerError)}`, requestUrl.origin)
    );
  }

  if (!code) {
    return NextResponse.redirect(
      new URL("/auth/login?error=Sign%20in%20link%20was%20missing%20its%20code", requestUrl.origin)
    );
  }

  const supabase = createServerSupabaseClient();
  if (!supabase) {
    return NextResponse.redirect(
      new URL("/auth/login?error=Supabase%20is%20not%20configured", requestUrl.origin)
    );
  }

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  // Previously this failure was swallowed and the user was sent to a protected
  // page, which bounced them back to sign-in with no explanation at all.
  if (error || !data.user) {
    return NextResponse.redirect(
      new URL(
        `/auth/login?error=${encodeURIComponent(error?.message ?? "Could not complete sign in")}`,
        requestUrl.origin
      )
    );
  }

  await seedProfileFromProvider(supabase, data.user);

  return NextResponse.redirect(new URL(next, requestUrl.origin));
}

/**
 * Carries the name and picture Google supplied into the profile row.
 *
 * Only fills gaps: a name or photo the user has since set in Kynetic is never
 * overwritten by the provider's version.
 */
async function seedProfileFromProvider(
  supabase: NonNullable<ReturnType<typeof createServerSupabaseClient>>,
  user: { id: string; email?: string | null; user_metadata?: Record<string, unknown> | null }
) {
  const { data: existing } = await supabase
    .from("profiles")
    .select("id, full_name, avatar_url")
    .eq("id", user.id)
    .maybeSingle();

  const patch: Record<string, unknown> = {};
  if (!existing?.full_name) {
    const name = providerFullName(user);
    if (name) patch.full_name = name;
  }
  if (!existing?.avatar_url) {
    const photo = providerPhotoUrl(user);
    if (photo) patch.avatar_url = photo;
  }

  if (!existing) {
    // First sign-in through a provider: create the row so the photo and name
    // survive, and let onboarding fill in the training fields.
    await supabase.from("profiles").insert({
      id: user.id,
      email: user.email ?? null,
      onboarding_completed: false,
      ...patch,
    });
    return;
  }

  if (Object.keys(patch).length) {
    await supabase.from("profiles").update(patch).eq("id", user.id);
  }
}
