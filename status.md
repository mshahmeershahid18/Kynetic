# Kynetic Project Status

Status of the codebase against `plan.md`, verified against the source rather
than assumed. Last verified: 2026-08-13.

## Phase 0 — Foundation (Complete)
Next.js 14 App Router + TypeScript + Tailwind, Supabase wired through
`src/lib/supabase`, dark/light theming via `next-themes`, GSAP helper in
`src/lib/animations.ts`, and a FastAPI service in `services/ai` with a
Dockerfile and health check.

## Phase 1 — Landing, auth, onboarding, avatar (Complete)
Email/password and Google OAuth via Supabase Auth, middleware route protection,
password reset, Nodemailer welcome email, and a multi-step onboarding flow that
computes BMI and resolves the avatar state.

**Avatar is a real human mesh.** `FinalBaseMesh.obj` (24,461 vertices) is
precompiled to a 430 KB binary by `scripts/build-avatar-mesh.mjs` and reshaped at
runtime by `src/lib/avatar/deform.ts`. One mesh serves every body: mass from BMI,
muscularity from experience, and female shaping are all vertex deformations
applied to the same source geometry, with anatomical landmarks measured off the
model itself. Rendered by `src/components/dashboard/avatar-3d.tsx` with
three-point neutral lighting, a contact shadow, idle rotation, and drag-to-orbit.
This is the parametric option `plan.md` described, not the asset matrix.

Verified with a headless harness that measures hip, waist, chest, and shoulder
widths across eight body configurations: mass widens and deepens the waist,
training raises the shoulder-to-waist ratio, mass lowers it, and the female form
carries a higher hip-to-waist ratio with narrower shoulders.

## Phase 2 — Workout system (Complete)
**Generation is Gemini-backed.** `services/ai/gemini_client.py` prompts Gemini
with the user's profile, recent performance, and the exercise library, using
structured JSON output. Every returned plan is re-validated server side against
the library (`_sanitize_plan`) so a hallucinated or equipment-inappropriate
exercise can never reach the user.

**Exercise library is real.** The `exercises` table is created and seeded by
`supabase/seed-exercises.sql` with instructions, coaching cues, demo media paths,
and a `vision_kind` capability flag. Generated plans reference library slugs, so
every prescribed movement carries its demo and its tracking capability.

Session player at `/workouts/[planId]/play` handles warm-up, sets, rest timing,
demos, and completion.

## Phase 3 — Computer vision (Complete, deliberately scoped)
`src/lib/vision/exercise-analyzers.ts` is a pure state machine supporting four
simple bodyweight movements: **squat, push-up, lunge, glute bridge**. It measures
joint angles, counts reps, scores form, and emits live cues.

**Complex and loaded lifts are intentionally excluded.** Deadlifts, presses, and
weighted work have `vision_kind = NULL` and the UI explains why rather than
pretending to coach them — a single webcam cannot judge them safely.

Two entry points share the exact same analyzers:
- **Live guidance** (`live-form-coach.tsx`) — camera, skeleton overlay, live rep
  count, depth bar, and coaching cues during a session.
- **Video upload** (`video-form-check.tsx`, page at `/form-check`) — for people
  who would rather film a set than run a live session. Decoded and analysed
  entirely in the browser; the video never leaves the device, only the summary
  is saved to `form_analyses`.

## Phase 4 — AI coach (Complete)
`/feedback` prompts Gemini with the session summary, camera form data, and recent
history, returning structured coaching. The deterministic `feedback_engine.py`
remains as a fallback so completion never fails.

## Phase 5 — Adaptive loop (Complete)
Recent sessions and feedback are passed into generation. Completion rate and form
scores adjust difficulty. Completing 5 / 15 / 40 sessions raises the experience
level, which immediately changes the 3D avatar's musculature and is snapshotted
into `progress`.

## Phase 6 — Dashboard (Complete)
Rebuilt on a single restrained visual system: consistent 2xl radii, semibold
weights, and a two-column layout. XP, levels, streaks, achievements, a 7-day
chart, and insights are all derived from `workout_sessions` at read time.

---

## Security

- All user tables are protected by RLS; `exercises` is read-only to authenticated
  users and writable only by the service role.
- **The AI service verifies the Supabase JWT** (`services/ai/security.py`). Next.js
  forwards the caller's access token on every request. It fails closed: if
  `REQUIRE_AUTH` is on without a configured secret, it returns 500 rather than
  serving traffic unauthenticated.
- Gemini and Gmail credentials are server side only.

## Deliberate design decisions

- **No `gamification` table.** XP, levels, streaks and achievements are pure
  functions of `workout_sessions`, derived at read time in
  `src/lib/dashboard/gamification.ts` so they cannot drift out of sync with the
  underlying data. `progress` *is* a table, because body metrics over time are
  genuine history that cannot be recomputed.
- **Three fallback layers.** Gemini → deterministic Python → local TypeScript.
  A plan is always produced; `generator` on each row records which path ran.

## What still needs doing

- **Demo media is not uploaded.** `seed-exercises.sql` references paths in a
  public `exercise-media` Supabase Storage bucket that must be created and
  populated. Until then the UI falls back to written coaching cues — functional,
  but the demonstrations `plan.md` calls for are not yet there.
- **No automated test suite.** The vision analyzers and generators were verified
  with synthetic-input scripts during development, but nothing is checked in.
- Gemini output quality has not been evaluated against real users.

## Setup

1. Run `supabase/schema.sql`, then `supabase/seed-exercises.sql`.
2. Copy `.env.example` to `.env.local` and fill in the Supabase values.
3. Set `GEMINI_API_KEY` and `SUPABASE_JWT_SECRET` on the Python service.
4. `npm install && npm run dev`; `cd services/ai && uvicorn main:app --reload`.
