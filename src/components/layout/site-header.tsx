import Link from "next/link";

import { Wordmark } from "@/components/brand/wordmark";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserMenu } from "@/components/layout/user-menu";
import { resolveProfilePhoto, providerFullName } from "@/lib/profiles/photo";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function SiteHeader() {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = (await supabase?.auth.getUser()) ?? { data: { user: null } };

  // Only the two fields the menu renders — the header is on every page, so it
  // stays a narrow query rather than select('*').
  const { data: profile } = user
    ? await supabase!.from("profiles").select("full_name, avatar_url").eq("id", user.id).single()
    : { data: null };

  const name = profile?.full_name ?? providerFullName(user);
  const photoUrl = resolveProfilePhoto(profile?.avatar_url, user);

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl">
      <div className="container-shell flex h-16 items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link
            href={user ? "/dashboard" : "/"}
            className="focus-ring rounded-md"
          >
            <Wordmark size="md" />
          </Link>
        </div>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          {user ? (
            <UserMenu name={name} email={user.email ?? null} photoUrl={photoUrl} />
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
