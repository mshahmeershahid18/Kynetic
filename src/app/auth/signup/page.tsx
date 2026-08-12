import Link from "next/link";

import { signUpWithEmail } from "@/app/auth/actions";
import { AuthMessage } from "@/components/auth/auth-message";
import { AuthDivider, AuthField, AuthShell } from "@/components/auth/auth-shell";
import { GoogleSignInButton } from "@/components/auth/oauth-button";
import { AuthSubmitButton } from "@/components/auth/submit-button";

export const metadata = {
  title: "Create your account · Kynetic",
};

export default function SignupPage({
  searchParams,
}: {
  searchParams: { message?: string; error?: string };
}) {
  return (
    <AuthShell
      eyebrow="Get started"
      title="Create your account"
      description="Set up your profile once and Kynetic builds every workout around it."
      footer={
        <>
          Already have an account?{" "}
          <Link className="font-medium text-primary hover:underline" href="/auth/login">
            Sign in
          </Link>
        </>
      }
    >
      <AuthMessage message={searchParams.message} error={searchParams.error} />

      <GoogleSignInButton />
      <AuthDivider />

      <form action={signUpWithEmail} className="space-y-4">
        <AuthField label="Full name" name="full_name" autoComplete="name" placeholder="Your name" />
        <AuthField label="Email" name="email" type="email" autoComplete="email" placeholder="you@example.com" />
        <AuthField
          label="Password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          placeholder="At least 8 characters"
        />
        <AuthSubmitButton label="Create account" pendingLabel="Creating account" />
      </form>

      <p className="text-xs leading-relaxed text-muted-foreground">
        We will email you a confirmation link. Camera and video analysis always run on your
        own device — footage is never uploaded.
      </p>
    </AuthShell>
  );
}
