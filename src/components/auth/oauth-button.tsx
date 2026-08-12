import { signInWithGoogle } from "@/app/auth/actions";

export function GoogleSignInButton() {
  return (
    <form action={signInWithGoogle}>
      <button
        type="submit"
        className="focus-ring flex min-h-12 w-full items-center justify-center gap-3 rounded-full border border-border bg-card px-5 font-bold transition hover:border-primary/60"
      >
        <span className="grid h-6 w-6 place-items-center rounded-full bg-background text-sm">G</span>
        Continue with Google
      </button>
    </form>
  );
}
