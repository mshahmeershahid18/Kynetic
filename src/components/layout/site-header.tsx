import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { signOut } from "@/app/auth/actions";

export async function SiteHeader() {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase?.auth.getUser() ?? { data: { user: null } };

  return (
    <header className="sticky top-0 z-50 border-b border-border/70 bg-background/80 backdrop-blur-xl">
      <div className="container-shell flex h-16 items-center justify-between">
        <Link href="/" className="focus-ring rounded-md text-lg font-black tracking-tight">
          Kynetic
        </Link>
        <nav className="hidden items-center gap-6 text-sm font-medium text-muted-foreground md:flex">
          <Link className="transition hover:text-foreground" href="/#features">
            Features
          </Link>
          {user && (
            <>
              <Link className="transition hover:text-foreground" href="/dashboard">
                Dashboard
              </Link>
              <Link className="transition hover:text-foreground" href="/form-check">
                Form check
              </Link>
            </>
          )}
        </nav>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          {user ? (
            <form action={signOut}>
              <button
                type="submit"
                className="focus-ring rounded-full border border-border bg-card px-4 py-2 text-sm font-bold transition hover:border-destructive/60 hover:text-destructive"
              >
                Sign out
              </button>
            </form>
          ) : (
            <>
              <Link className="hidden rounded-full border border-border px-4 py-2 text-sm font-bold transition hover:border-primary/60 sm:inline-flex" href="/auth/login">
                Sign in
              </Link>
              <Link
                className="focus-ring rounded-full bg-primary px-4 py-2 text-sm font-bold text-primary-foreground shadow-glow transition hover:scale-[1.02]"
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
