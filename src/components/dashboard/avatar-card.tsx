import { getAvatarDescription, getBmiBucket } from "@/lib/profiles/avatar";
import type { FitnessProfile } from "@/lib/profiles/types";

export function AvatarCard({ profile }: { profile: FitnessProfile | null }) {
  const bmi = profile?.bmi ?? null;
  const bmiBucket = getBmiBucket(bmi);

  return (
    <div className="rounded-[2rem] border border-border bg-card p-6 shadow-2xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-bold text-primary">Profile avatar v1</p>
          <h2 className="mt-2 text-2xl font-black">{profile?.full_name ?? "Kynetic athlete"}</h2>
        </div>
        <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-black text-primary">{profile?.experience_level ?? "new"}</span>
      </div>
      <div className="mt-6 grid place-items-center rounded-[1.5rem] bg-muted p-8">
        <div className="relative h-64 w-32 rounded-full bg-gradient-to-b from-primary/80 via-secondary/50 to-accent/70 shadow-glow">
          <div className="absolute left-1/2 top-5 h-16 w-16 -translate-x-1/2 rounded-full bg-card shadow-lg" />
          <div className="absolute left-1/2 top-24 h-24 w-24 -translate-x-1/2 rounded-[45%] border-4 border-background/70 bg-card/80" />
          <div className="absolute bottom-7 left-7 h-28 w-6 rounded-full bg-card/90" />
          <div className="absolute bottom-7 right-7 h-28 w-6 rounded-full bg-card/90" />
        </div>
      </div>
      <dl className="mt-6 grid grid-cols-2 gap-3 text-sm">
        <Stat label="BMI" value={bmi ? String(bmi) : "Not set"} />
        <Stat label="BMI bucket" value={bmiBucket} />
        <Stat label="Goal" value={profile?.goal ?? "Not set"} />
        <Stat label="Avatar state" value={profile?.avatar_state ?? "pending"} />
      </dl>
      <p className="mt-4 text-sm leading-6 text-muted-foreground">{getAvatarDescription(profile?.avatar_state ?? null)}</p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl bg-muted p-3"><dt className="text-xs font-bold text-muted-foreground">{label}</dt><dd className="mt-1 font-black">{value}</dd></div>;
}
