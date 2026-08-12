import { AnimatedSection } from "@/components/landing/animated-section";
import Link from "next/link";

const features = [
  "AI-generated workout plans tailored to your profile and goals.",
  "Browser-based pose tracking for private, real-time rep counting.",
  "Adaptive coaching feedback that improves with every session.",
  "Avatar progress designed to make fitness changes visible.",
];

export default async function Home() {
  return (
    <main className="overflow-hidden">
      <section className="relative border-b border-border/60 py-20 sm:py-32">
        <div className="absolute inset-0 -z-10 bg-grid bg-[length:48px_48px] opacity-40" />
        <div className="absolute left-1/2 top-20 -z-10 h-72 w-72 -translate-x-1/2 rounded-full bg-primary/25 blur-3xl" />
        <AnimatedSection>
          <div className="container-shell grid items-center gap-12 lg:grid-cols-[1.1fr_0.9fr]">
            <div>
              <p data-animate className="mb-5 inline-flex rounded-full border border-primary/30 bg-primary/10 px-4 py-2 text-sm font-bold text-primary">
                The future of adaptive fitness
              </p>
              <h1 data-animate className="max-w-4xl text-5xl font-black tracking-tight sm:text-6xl lg:text-7xl">
                Your AI fitness coach that sees progress, not excuses.
              </h1>
              <p data-animate className="mt-6 max-w-2xl text-lg leading-8 text-muted-foreground">
                Kynetic is your personalized training companion. Experience profile-aware workouts, visible avatar progress, private browser-based rep counting, and adaptive coaching.
              </p>
              <div data-animate className="mt-9 flex flex-col gap-3 sm:flex-row">
                <Link href="/auth/signup" className="focus-ring rounded-full bg-primary px-6 py-3 text-center font-bold text-primary-foreground shadow-glow transition hover:scale-[1.02]">
                  Start training
                </Link>
                <Link href="/auth/login" className="focus-ring rounded-full border border-border bg-card px-6 py-3 text-center font-bold transition hover:border-primary/60">
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
                        <p className="text-sm text-muted-foreground">Block {index + 1} · Kynetic AI</p>
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

      <section id="features" className="container-shell py-24 sm:py-32">
        <div className="max-w-2xl">
          <p className="font-bold text-primary">Intelligent Tracking</p>
          <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">One foundation for the full coaching loop.</h2>
        </div>
        <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {features.map((feature) => (
            <div key={feature} className="rounded-3xl border border-border bg-card p-6 text-card-foreground shadow-sm">
              <div className="mb-5 h-2 w-16 rounded-full bg-primary" />
              <p className="leading-7 text-muted-foreground">{feature}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="container-shell pb-24 sm:pb-32">
        <div className="rounded-[3rem] border border-border bg-primary/5 p-8 sm:p-16 text-center">
          <h2 className="text-3xl font-black tracking-tight sm:text-5xl">Ready to transform?</h2>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
            Join Kynetic today and unlock your personalized AI fitness coach. Track your reps, level up your avatar, and reach your goals.
          </p>
          <div className="mt-10 flex justify-center">
            <Link href="/auth/signup" className="focus-ring rounded-full bg-primary px-8 py-4 text-center font-bold text-primary-foreground shadow-glow transition hover:scale-[1.02] text-lg">
              Create your profile
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
