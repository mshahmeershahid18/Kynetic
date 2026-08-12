import { AlertCircle, Info } from "lucide-react";

/**
 * Auth feedback banner. Errors arrive as `?error=`, informational notices as
 * `?message=`, so failures read as failures rather than neutral chrome.
 */
export function AuthMessage({ message, error }: { message?: string; error?: string }) {
  if (!message && !error) return null;

  if (error) {
    return (
      <p className="flex items-start gap-2 rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
        {error}
      </p>
    );
  }

  return (
    <p className="flex items-start gap-2 rounded-lg border border-border bg-muted/60 px-4 py-3 text-sm text-muted-foreground">
      <Info className="mt-0.5 h-4 w-4 shrink-0" />
      {message}
    </p>
  );
}
