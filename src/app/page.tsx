import { AnimatedSection } from "@/components/landing/animated-section";
import { getAiServiceHealth } from "@/lib/ai-service";
import { hasSupabaseConfig } from "@/lib/config/env";
import Link from "next/link";

const features = [
  "AI-generated workout plans tailored to your profile and goals.",
  "Browser-based pose tracking for private, real-time rep counting.",
  "Adaptive coaching feedback that improves with every session.",
  "Avatar progress designed to make fitness changes visible.",
];

const foundation = [
  { label: "Auth", status: "Email/password and Google OAuth routes" },
  { label: "Profiles", status: "Onboarding profile writes to Supabase" },
  { label: "Dashboard", status: "Protected profile, progress, and next actions" },
  { label: "Theme", status: "System-aware dark/light tokens" },
];

export default async function Home() {
  const aiHealth = await getAiServiceHealth();
  const supabaseReady = hasSupabaseConfig();

  return (
    <main className="overflow-hidden">
      <section className="relative border-b border-border/60 py-20 sm:py-28">
        <div className="absolute inset-0 -z-10 bg-grid bg-[length:48px_48px] opacity-40" />
        <div className="absolute left-1/2 top-20 -z-10 h-72 w-72 -translate-x-1/2 rounded-full bg-primary/25 blur-3xl" />
        <AnimatedSection>
          <div className="container-shell grid items-center gap-12 lg:grid-cols-[1.1fr_0.9fr]">
            <div>
              <p data-animate className="mb-5 inline-flex rounded-full border border-primary/30 bg-primary/10 px-4 py-2 text-sm font-bold text-primary">
                Auth and profile foundation live
              </p>
              <h1 data-animate className="max-w-4xl text-5xl font-black tracking-tight sm:text-6xl lg:text-7xl">
                Your AI fitness coach that sees progress, not excuses.
              </h1>
              <p data-animate className="mt-6 max-w-2xl text-lg leading-8 text-muted-foreground">
                Kynetic is being built as a personalized training companion: profile-aware workouts, avatar progress, exercise demos, private browser rep counting, and adaptive coaching.
              </p>
              <div data-animate className="mt-9 flex flex-col gap-3 sm:flex-row">
                <Link href="/signup" className="focus-ring rounded-full bg-primary px-6 py-3 text-center font-bold text-primary-foreground shadow-glow transition hover:scale-[1.02]">
                  Start training
                </Link>
                <Link href="/login" className="focus-ring rounded-full border border-border bg-card px-6 py-3 text-center font-bold transition hover:border-primary/60">
                  Log in
                </Link>
              </div>
            </div>
            <div data-animate className="rounded-[2rem] border border-border bg-card/80 p-6 shadow-2xl backdrop-blur">
              <div className="rounded-[1.5rem] bg-muted p-6">
                <div className="mb-6 flex items-center justify-between">
                  <span className="text-sm font-bold text-muted-foreground">Today&apos;s adaptive plan</span>
                  <span className="rounded-full bg-primary px-3 py-1 text-xs font-black text-primary-foreground">AI</span>
                </div>
                <div className="space-y-4">
                  {['Mobility primer', 'Strength circuit', 'Squat form scan'].map((item, index) => (
                    <div key={item} className="flex items-center justify-between rounded-2xl bg-card p-4">
                      <div>
                        <p className="font-bold">{item}</p>
                        <p className="text-sm text-muted-foreground">Block {index + 1} · foundation preview</p>
                      </div>
                      <div className="h-10 w-10 rounded-full bg-primary/15" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </AnimatedSection>
      </section>

      <section id="features" className="container-shell py-20">
        <div className="max-w-2xl">
          <p className="font-bold text-primary">What Kynetic will do</p>
          <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">One foundation for the full coaching loop.</h2>
        </div>
        <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {features.map((feature) => (
            <div key={feature} className="rounded-3xl border border-border bg-card p-6 text-card-foreground">
              <div className="mb-5 h-2 w-16 rounded-full bg-primary" />
              <p className="leading-7 text-muted-foreground">{feature}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="foundation" className="border-y border-border/60 bg-muted/40 py-20">
        <div className="container-shell grid gap-8 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <p className="font-bold text-primary">Phase 2 status</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight">Authenticated, personalized, and dashboard-ready.</h2>
            <p className="mt-4 text-muted-foreground">
              Users can sign up, complete a fitness profile, and reach a protected dashboard that is ready for AI workout generation in the next phase.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {foundation.map((item) => (
              <div key={item.label} className="rounded-3xl border border-border bg-card p-5">
                <p className="text-sm font-bold text-muted-foreground">{item.label}</p>
                <p className="mt-2 text-lg font-black">{item.status}</p>
              </div>
            ))}
            <div className="rounded-3xl border border-border bg-card p-5">
              <p className="text-sm font-bold text-muted-foreground">Supabase env</p>
              <p className="mt-2 text-lg font-black">{supabaseReady ? "Configured" : "Awaiting .env.local"}</p>
            </div>
            <div className="rounded-3xl border border-border bg-card p-5">
              <p className="text-sm font-bold text-muted-foreground">AI service</p>
              <p className="mt-2 text-lg font-black">{aiHealth ? `${aiHealth.status}: ${aiHealth.service}` : "Offline until FastAPI runs"}</p>
            </div>
          </div>
        </div>
      </section>

      <section id="contact" className="container-shell py-20">
        <div className="rounded-[2rem] border border-border bg-card p-8 sm:p-10">
          <div className="grid gap-8 lg:grid-cols-[1fr_0.9fr] lg:items-center">
            <div>
              <p className="font-bold text-primary">Stay close to launch</p>
              <h2 className="mt-3 text-3xl font-black tracking-tight">Want the first training beta?</h2>
              <p className="mt-4 text-muted-foreground">
                This non-submitting capture is ready to connect to EmailJS or an API route in a later phase.
              </p>
            </div>
            <form className="flex flex-col gap-3 sm:flex-row">
              <input className="focus-ring min-h-12 flex-1 rounded-full border border-border bg-background px-5" type="email" placeholder="you@example.com" aria-label="Email address" />
              <button className="focus-ring rounded-full bg-secondary px-6 py-3 font-bold text-secondary-foreground" type="button">
                Notify me
              </button>
            </form>
          </div>
        </div>
      </section>
    </main>
  );
}
