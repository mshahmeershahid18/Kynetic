import Link from "next/link";

import { signInWithEmail } from "@/app/auth/actions";
import { AuthMessage } from "@/components/auth/auth-message";
import { AuthDivider, AuthField, AuthShell } from "@/components/auth/auth-shell";
import { GoogleSignInButton } from "@/components/auth/oauth-button";
import { AuthSubmitButton } from "@/components/auth/submit-button";

export const metadata = {
  title: "Sign in · Kynetic",
};

export default function LoginPage({
  searchParams,
}: {
  searchParams: { message?: string; error?: string };
}) {
  return (
    <AuthShell
      eyebrow="Welcome back"
      title="Sign in to Kynetic"
      description="Pick up where you left off — your plans, history, and coaching are waiting."
      footer={
        <>
          New here?{" "}
          <Link className="font-medium text-primary hover:underline" href="/auth/signup">
            Create an account
          </Link>
        </>
      }
    >
      <AuthMessage message={searchParams.message} error={searchParams.error} />

      <GoogleSignInButton />
      <AuthDivider />

      <form action={signInWithEmail} className="space-y-4">
        <AuthField label="Email" name="email" type="email" autoComplete="email" placeholder="you@example.com" />
        <AuthField
          label="Password"
          name="password"
          type="password"
          autoComplete="current-password"
          placeholder="••••••••"
          action={
            <Link
              className="text-xs font-medium text-primary hover:underline"
              href="/auth/reset-password"
            >
              Forgot password?
            </Link>
          }
        />
        <AuthSubmitButton label="Sign in" pendingLabel="Signing in" />
      </form>
    </AuthShell>
  );
}
