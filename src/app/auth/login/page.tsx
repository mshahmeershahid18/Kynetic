import Link from "next/link";

import { signInWithEmail } from "@/app/auth/actions";
import { AuthMessage } from "@/components/auth/auth-message";
import { GoogleSignInButton } from "@/components/auth/oauth-button";

export default function LoginPage({ searchParams }: { searchParams: { message?: string } }) {
  return (
    <main className="container-shell grid min-h-[calc(100vh-4rem)] place-items-center py-12">
      <div className="w-full max-w-md rounded-[2rem] border border-border bg-card p-8 shadow-2xl">
        <p className="font-bold text-primary">Welcome back</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight">Sign in to Kynetic</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Your Supabase JWT session unlocks onboarding, dashboard data, and future workout plans protected by RLS.
        </p>
        <div className="mt-6 space-y-4">
          <AuthMessage message={searchParams.message} />
          <GoogleSignInButton />
          <div className="flex items-center gap-3 text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
            <span className="h-px flex-1 bg-border" /> or <span className="h-px flex-1 bg-border" />
          </div>
          <form action={signInWithEmail} className="space-y-4">
            <label className="block text-sm font-bold">
              Email
              <input className="focus-ring mt-2 min-h-12 w-full rounded-2xl border border-border bg-background px-4 font-normal" name="email" type="email" required />
            </label>
            <label className="block text-sm font-bold">
              Password
              <input className="focus-ring mt-2 min-h-12 w-full rounded-2xl border border-border bg-background px-4 font-normal" name="password" type="password" required />
            </label>
            <button className="focus-ring min-h-12 w-full rounded-full bg-primary px-5 font-black text-primary-foreground shadow-glow" type="submit">
              Sign in
            </button>
          </form>
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <Link className="font-bold text-primary" href="/auth/signup">Create account</Link>
            <Link className="font-bold text-primary" href="/auth/reset-password">Forgot password?</Link>
          </div>
        </div>
      </div>
    </main>
  );
}
