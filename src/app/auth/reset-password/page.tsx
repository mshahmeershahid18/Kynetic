import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { requestPasswordReset } from "@/app/auth/actions";
import { AuthMessage } from "@/components/auth/auth-message";
import { AuthField, AuthShell } from "@/components/auth/auth-shell";
import { AuthSubmitButton } from "@/components/auth/submit-button";

export const metadata = {
  title: "Reset password · Kynetic",
};

export default function ResetPasswordPage({
  searchParams,
}: {
  searchParams: { message?: string; error?: string };
}) {
  return (
    <AuthShell
      eyebrow="Account recovery"
      title="Reset your password"
      description="Enter the email on your account and we will send you a secure link to set a new password."
      footer={
        <Link
          className="inline-flex items-center gap-2 font-medium text-primary hover:underline"
          href="/auth/login"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to sign in
        </Link>
      }
    >
      <AuthMessage message={searchParams.message} error={searchParams.error} />

      <form action={requestPasswordReset} className="space-y-4">
        <AuthField label="Email" name="email" type="email" autoComplete="email" placeholder="you@example.com" />
        <AuthSubmitButton label="Send reset link" pendingLabel="Sending" />
      </form>
    </AuthShell>
  );
}
