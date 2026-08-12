import { saveOnboardingProfile } from "@/app/onboarding/actions";
import { activityLevels, experienceLevels, fitnessGoals, type FitnessProfile } from "@/lib/profiles/types";

const equipmentOptions = ["Bodyweight", "Dumbbells", "Kettlebells", "Resistance bands", "Barbell", "Machines", "Cardio machine"];
const preferenceOptions = ["Strength", "Hypertrophy", "HIIT", "Low impact", "Mobility", "Home workouts", "Gym workouts"];

export function ProfileForm({ profile, email }: { profile?: Partial<FitnessProfile> | null; email?: string | null }) {
  const selectedEquipment = new Set(profile?.equipment ?? []);
  const selectedPreferences = new Set(profile?.workout_preferences ?? []);

  return (
    <form action={saveOnboardingProfile} className="space-y-8">
      <section className="grid gap-4 md:grid-cols-2">
        <label className="block text-sm font-bold">Full name<input className="focus-ring mt-2 min-h-12 w-full rounded-2xl border border-border bg-background px-4 font-normal" name="full_name" defaultValue={profile?.full_name ?? ""} required /></label>
        <label className="block text-sm font-bold">Age<input className="focus-ring mt-2 min-h-12 w-full rounded-2xl border border-border bg-background px-4 font-normal" name="age" type="number" min="13" max="100" defaultValue={profile?.age ?? ""} required /></label>
        <label className="block text-sm font-bold">Gender<input className="focus-ring mt-2 min-h-12 w-full rounded-2xl border border-border bg-background px-4 font-normal" name="gender" placeholder="Optional" defaultValue={profile?.gender ?? ""} /></label>
        <label className="block text-sm font-bold">Account email<input className="mt-2 min-h-12 w-full rounded-2xl border border-border bg-muted px-4 font-normal text-muted-foreground" value={email ?? profile?.email ?? ""} readOnly /></label>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <label className="block text-sm font-bold">Height (cm)<input className="focus-ring mt-2 min-h-12 w-full rounded-2xl border border-border bg-background px-4 font-normal" name="height_cm" type="number" min="90" max="250" defaultValue={profile?.height_cm ?? ""} required /></label>
        <label className="block text-sm font-bold">Weight (kg)<input className="focus-ring mt-2 min-h-12 w-full rounded-2xl border border-border bg-background px-4 font-normal" name="weight_kg" type="number" min="25" max="350" step="0.1" defaultValue={profile?.weight_kg ?? ""} required /></label>
        <label className="block text-sm font-bold">Days available / week<input className="focus-ring mt-2 min-h-12 w-full rounded-2xl border border-border bg-background px-4 font-normal" name="available_days_per_week" type="number" min="1" max="7" defaultValue={profile?.available_days_per_week ?? 3} required /></label>
        <label className="block text-sm font-bold">Preferred session minutes<input className="focus-ring mt-2 min-h-12 w-full rounded-2xl border border-border bg-background px-4 font-normal" name="preferred_session_minutes" type="number" min="10" max="180" defaultValue={profile?.preferred_session_minutes ?? 45} required /></label>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <label className="block text-sm font-bold">Primary goal<select className="focus-ring mt-2 min-h-12 w-full rounded-2xl border border-border bg-background px-4 font-normal" name="goal" defaultValue={profile?.goal ?? ""} required><option value="" disabled>Select goal</option>{fitnessGoals.map((goal) => <option key={goal}>{goal}</option>)}</select></label>
        <label className="block text-sm font-bold">Current activity<select className="focus-ring mt-2 min-h-12 w-full rounded-2xl border border-border bg-background px-4 font-normal" name="fitness_level" defaultValue={profile?.fitness_level ?? ""} required><option value="" disabled>Select level</option>{activityLevels.map((level) => <option key={level} value={level}>{level}</option>)}</select></label>
        <label className="block text-sm font-bold">Training experience<select className="focus-ring mt-2 min-h-12 w-full rounded-2xl border border-border bg-background px-4 font-normal" name="experience_level" defaultValue={profile?.experience_level ?? ""} required><option value="" disabled>Select experience</option>{experienceLevels.map((level) => <option key={level} value={level}>{level}</option>)}</select></label>
      </section>

      <CheckboxGroup title="Available equipment" name="equipment" options={equipmentOptions} selected={selectedEquipment} />
      <CheckboxGroup title="Workout preferences" name="workout_preferences" options={preferenceOptions} selected={selectedPreferences} />

      <label className="block text-sm font-bold">Limitations, injuries, or movements to avoid<textarea className="focus-ring mt-2 min-h-28 w-full rounded-2xl border border-border bg-background px-4 py-3 font-normal" name="limitations" defaultValue={profile?.limitations ?? ""} placeholder="Example: knee sensitivity, no jumping, shoulder impingement..." /></label>

      <button className="focus-ring min-h-12 w-full rounded-full bg-primary px-6 font-black text-primary-foreground shadow-glow md:w-auto" type="submit">Save profile and open dashboard</button>
    </form>
  );
}

function CheckboxGroup({ title, name, options, selected }: { title: string; name: string; options: string[]; selected: Set<string> }) {
  return (
    <section>
      <h2 className="text-sm font-bold">{title}</h2>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {options.map((option) => (
          <label key={option} className="flex items-center gap-3 rounded-2xl border border-border bg-background px-4 py-3 text-sm font-medium">
            <input name={name} type="checkbox" value={option} defaultChecked={selected.has(option)} className="h-4 w-4 accent-primary" />
            {option}
          </label>
        ))}
      </div>
    </section>
  );
}
