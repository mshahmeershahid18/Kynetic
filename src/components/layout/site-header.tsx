import Link from "next/link";

import { ThemeToggle } from "@/components/theme-toggle";

export function SiteHeader() {
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
          <Link className="transition hover:text-foreground" href="/onboarding">
            Onboarding
          </Link>
          <Link className="transition hover:text-foreground" href="/dashboard">
            Dashboard
          </Link>
        </nav>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Link className="hidden rounded-full border border-border px-4 py-2 text-sm font-bold transition hover:border-primary/60 sm:inline-flex" href="/auth/login">
            Sign in
          </Link>
          <Link
            className="focus-ring rounded-full bg-primary px-4 py-2 text-sm font-bold text-primary-foreground shadow-glow transition hover:scale-[1.02]"
            href="/auth/signup"
          >
            Get started
          </Link>
        </div>
      </div>
    </header>
  );
}
