import Link from "next/link";

import { requestPasswordReset } from "@/app/auth/actions";
import { AuthMessage } from "@/components/auth/auth-message";

export default function ResetPasswordPage({ searchParams }: { searchParams: { message?: string } }) {
  return (
    <main className="container-shell grid min-h-[calc(100vh-4rem)] place-items-center py-12">
      <div className="w-full max-w-md rounded-[2rem] border border-border bg-card p-8 shadow-2xl">
        <p className="font-bold text-primary">Account recovery</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight">Reset your password</h1>
        <p className="mt-3 text-sm text-muted-foreground">Supabase will send a secure password reset link to your email.</p>
        <div className="mt-6 space-y-4">
          <AuthMessage message={searchParams.message} />
          <form action={requestPasswordReset} className="space-y-4">
            <label className="block text-sm font-bold">
              Email
              <input className="focus-ring mt-2 min-h-12 w-full rounded-2xl border border-border bg-background px-4 font-normal" name="email" type="email" required />
            </label>
            <button className="focus-ring min-h-12 w-full rounded-full bg-primary px-5 font-black text-primary-foreground shadow-glow" type="submit">
              Send reset link
            </button>
          </form>
          <Link className="block text-center text-sm font-bold text-primary" href="/auth/login">Back to sign in</Link>
        </div>
      </div>
    </main>
  );
}
