import Link from "next/link";
import { ArrowRight, Camera, LineChart, ShieldCheck, Sparkles, Upload, User } from "lucide-react";

import { AnimatedSection } from "@/components/landing/animated-section";

const FEATURES = [
  {
    icon: Sparkles,
    title: "Workouts written for you",
    body: "Gemini programs each session from your goal, equipment, injuries, and available time — then every plan is re-checked against our exercise library before you see it.",
  },
  {
    icon: Camera,
    title: "Live form coaching",
    body: "Point your camera at yourself and Kynetic counts reps, measures depth, and calls out technique in real time for squats, push-ups, lunges, and bridges.",
  },
  {
    icon: Upload,
    title: "Or just upload a video",
    body: "Not in the mood for a live session? Film one set, drop it in, and get the same rep count and form score back.",
  },
  {
    icon: User,
    title: "An avatar that changes",
    body: "A 3D figure whose proportions track your BMI and training level, so progress is something you can actually see.",
  },
  {
    icon: LineChart,
    title: "It adapts to you",
    body: "Complete your sets and the next workout gets harder. Struggle and it eases off. Your coach reads your history before writing anything.",
  },
  {
    icon: ShieldCheck,
    title: "Your video stays yours",
    body: "All pose analysis runs in your browser. Camera frames and uploaded clips never leave your device — only the numbers are saved.",
  },
];

const STEPS = [
  { step: "01", title: "Build your profile", body: "Body metrics, goal, experience, equipment, and anything we need to work around." },
  { step: "02", title: "Generate a workout", body: "A structured session with sets, reps, rest, and demonstrations for every movement." },
  { step: "03", title: "Train with guidance", body: "Live camera coaching on the simple lifts, manual logging on the rest." },
  { step: "04", title: "Get coached", body: "Specific feedback on your reps, form, and whether the difficulty actually fit." },
];

export default function Home() {
  return (
    <main>
      {/* Hero ---------------------------------------------------------------- */}
      <section className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 -z-10 bg-grid bg-[length:48px_48px] opacity-[0.25]" />
        <div className="absolute left-1/2 top-0 -z-10 h-64 w-[36rem] -translate-x-1/2 rounded-full bg-primary/15 blur-3xl" />

        <AnimatedSection>
          <div className="container-shell max-w-5xl py-20 text-center sm:py-28">
            <p
              data-animate
              className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3.5 py-1.5 text-xs font-medium text-muted-foreground"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Powered by Google Gemini
            </p>

            <h1
              data-animate
              className="mx-auto mt-6 max-w-3xl text-4xl font-semibold leading-[1.1] tracking-tight sm:text-5xl lg:text-6xl"
            >
              An AI fitness coach that actually watches you train.
            </h1>

            <p
              data-animate
              className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg"
            >
              Kynetic writes your workouts, counts your reps through your camera, checks your
              technique, and adjusts every session based on how the last one really went.
            </p>

            <div data-animate className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
              <Link
                href="/auth/signup"
                className="focus-ring inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition hover:opacity-90"
              >
                Get started free
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/auth/login"
                className="focus-ring inline-flex items-center justify-center rounded-lg border border-border bg-card px-6 py-3 text-sm font-medium transition hover:bg-muted"
              >
                Sign in
              </Link>
            </div>

            <p data-animate className="mt-5 text-xs text-muted-foreground">
              No credit card required · Camera analysis runs entirely on your device
            </p>
          </div>
        </AnimatedSection>
      </section>

      {/* Features ------------------------------------------------------------ */}
      <section id="features" className="border-b border-border bg-muted/20">
        <AnimatedSection>
          <div className="container-shell max-w-6xl py-20 sm:py-24">
            <div className="max-w-2xl">
              <p data-animate className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                What you get
              </p>
              <h2 data-animate className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
                The whole coaching loop, in one place.
              </h2>
            </div>

            <div className="mt-12 grid gap-px overflow-hidden rounded-2xl border border-border bg-border sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((feature) => (
                <article key={feature.title} data-animate className="bg-card px-6 py-7">
                  <span className="grid h-9 w-9 place-items-center rounded-lg border border-border bg-background">
                    <feature.icon className="h-4 w-4 text-muted-foreground" />
                  </span>
                  <h3 className="mt-4 text-sm font-semibold">{feature.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{feature.body}</p>
                </article>
              ))}
            </div>
          </div>
        </AnimatedSection>
      </section>

      {/* How it works -------------------------------------------------------- */}
      <section className="border-b border-border">
        <AnimatedSection>
          <div className="container-shell max-w-6xl py-20 sm:py-24">
            <div className="max-w-2xl">
              <p data-animate className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                How it works
              </p>
              <h2 data-animate className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
                From sign-up to your first coached session.
              </h2>
            </div>

            <ol className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
              {STEPS.map((item) => (
                <li key={item.step} data-animate>
                  <p className="text-xs font-medium tabular-nums text-muted-foreground">{item.step}</p>
                  <div className="mt-3 h-px w-full bg-border" />
                  <h3 className="mt-4 text-sm font-semibold">{item.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </AnimatedSection>
      </section>

      {/* Honest scope -------------------------------------------------------- */}
      <section className="border-b border-border bg-muted/20">
        <AnimatedSection>
          <div className="container-shell max-w-3xl py-20 text-center sm:py-24">
            <h2 data-animate className="text-2xl font-semibold tracking-tight sm:text-3xl">
              We only coach what a camera can actually judge.
            </h2>
            <p data-animate className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
              Live rep counting covers simple bodyweight movements — squats, push-ups, lunges,
              and glute bridges — where a single camera can read the movement reliably. Loaded
              and complex lifts get demonstrations and manual logging instead, because pretending
              otherwise would be worse than useless.
            </p>
          </div>
        </AnimatedSection>
      </section>

      {/* CTA ----------------------------------------------------------------- */}
      <section>
        <AnimatedSection>
          <div className="container-shell max-w-3xl py-20 text-center sm:py-28">
            <h2 data-animate className="text-2xl font-semibold tracking-tight sm:text-4xl">
              Start training with a coach that adapts.
            </h2>
            <p data-animate className="mx-auto mt-4 max-w-lg text-sm leading-relaxed text-muted-foreground sm:text-base">
              Set up your profile in about a minute and generate your first personalized workout.
            </p>
            <div data-animate className="mt-8 flex justify-center">
              <Link
                href="/auth/signup"
                className="focus-ring inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition hover:opacity-90"
              >
                Create your profile
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </AnimatedSection>
      </section>
    </main>
  );
}
