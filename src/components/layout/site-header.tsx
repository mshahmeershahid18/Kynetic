import Link from "next/link";

import { signOut } from "@/app/auth/actions";
import { ThemeToggle } from "@/components/theme-toggle";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function SiteHeader() {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = (await supabase?.auth.getUser()) ?? { data: { user: null } };

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl">
      <div className="container-shell flex h-16 items-center justify-between gap-4">
        <div className="flex items-center gap-8">
          <Link href={user ? "/dashboard" : "/"} className="focus-ring rounded-md text-lg font-semibold tracking-tight">
            Kynetic
          </Link>

          <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
            {user ? (
              <>
                <Link className="transition hover:text-foreground" href="/dashboard">
                  Dashboard
                </Link>
                <Link className="transition hover:text-foreground" href="/form-check">
                  Form check
                </Link>
                <Link className="transition hover:text-foreground" href="/onboarding">
                  Profile
                </Link>
              </>
            ) : (
              <Link className="transition hover:text-foreground" href="/#features">
                Features
              </Link>
            )}
          </nav>
        </div>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          {user ? (
            <form action={signOut}>
              <button
                type="submit"
                className="focus-ring rounded-lg border border-border px-3.5 py-2 text-sm font-medium transition hover:bg-muted"
              >
                Sign out
              </button>
            </form>
          ) : (
            <>
              <Link
                className="focus-ring hidden rounded-lg px-3.5 py-2 text-sm font-medium text-muted-foreground transition hover:text-foreground sm:inline-flex"
                href="/auth/login"
              >
                Sign in
              </Link>
              <Link
                className="focus-ring rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90"
                href="/auth/signup"
              >
                Get started
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
