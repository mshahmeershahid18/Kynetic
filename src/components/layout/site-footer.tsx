import Link from "next/link";

import { Wordmark } from "@/components/brand/wordmark";

export function SiteFooter() {
  return (
    <footer className="border-t border-border">
      <div className="container-shell flex flex-col items-center justify-between gap-4 py-8 sm:flex-row">
        <div className="text-center sm:text-left">
          <Wordmark size="sm" />
          <p className="mt-1 text-xs text-muted-foreground">
            AI coaching with on-device form analysis.
          </p>
        </div>

        <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
          <Link className="transition hover:text-foreground" href="/#features">
            Features
          </Link>
          <Link className="transition hover:text-foreground" href="/form-check">
            Form check
          </Link>
          <Link className="transition hover:text-foreground" href="/auth/login">
            Sign in
          </Link>
        </nav>
      </div>

      <p className="container-shell pb-8 text-xs leading-relaxed text-muted-foreground">
        Kynetic offers general fitness guidance and is not medical advice. Talk to a qualified
        professional before starting a new exercise programme, especially if you have an injury
        or an existing health condition.
      </p>
    </footer>
  );
}
