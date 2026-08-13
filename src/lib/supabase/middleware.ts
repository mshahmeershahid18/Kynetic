import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { env, hasSupabaseConfig } from "@/lib/config/env";

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request: { headers: request.headers } });

  if (!hasSupabaseConfig()) {
    return response;
  }

  const supabase = createServerClient(env.supabaseUrl, env.supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return request.cookies.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        request.cookies.set({ name, value, ...options });
        response.cookies.set({ name, value, ...options });
      },
      remove(name: string, options: CookieOptions) {
        request.cookies.set({ name, value: "", ...options });
        response.cookies.set({ name, value: "", ...options });
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Define protected and auth-only routes
  const isProtectedRoute = ["/dashboard", "/onboarding", "/settings", "/form-check", "/workouts"].some(
    (route) => request.nextUrl.pathname.startsWith(route)
  );
  const isAuthRoute = request.nextUrl.pathname.startsWith("/auth/login") || request.nextUrl.pathname.startsWith("/auth/signup");

  if (isProtectedRoute && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/login";
    return NextResponse.redirect(url);
  }

  // Second factor. `nextLevel` is aal2 whenever the account has a verified
  // authenticator, so a session that has only presented a password is held at
  // the challenge screen rather than being let through to the app.
  if (isProtectedRoute && user) {
    const { data: assurance } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

    if (assurance?.nextLevel === "aal2" && assurance.currentLevel !== "aal2") {
      const url = request.nextUrl.clone();
      url.pathname = "/auth/mfa";
      url.search = `?next=${encodeURIComponent(request.nextUrl.pathname)}`;
      return NextResponse.redirect(url);
    }
  }

  if (isAuthRoute && user) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return response;
}
