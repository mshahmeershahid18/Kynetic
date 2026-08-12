export function AuthMessage({ message }: { message?: string }) {
  if (!message) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-primary/30 bg-primary/10 px-4 py-3 text-sm font-medium text-primary">
      {message}
    </div>
  );
}
