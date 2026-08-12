# Kynetic Project Status

_Last verified against `plan.md` and the current workspace source tree._

## Current status summary

Kynetic is currently an early MVP foundation for an AI fitness coach web app. The repository has a working Next.js 14 App Router scaffold with Tailwind CSS, Supabase Auth/Profile integration, onboarding, an avatar-state calculation, a protected dashboard, and a FastAPI AI service scaffold.

The implementation most closely covers **Phase 0** and a substantial portion of **Phase 1** from `plan.md`. Later workout, computer vision, AI coaching, adaptive fitness, and gamification phases remain to be built.

## Verified implemented items

### Phase 0 — Foundation and setup

Status: **Mostly complete**

Verified evidence:

- Next.js App Router, TypeScript, and Tailwind are present via `package.json`, `src/app`, `tailwind.config.ts`, and `tsconfig.json`.
- Supabase SSR client and middleware files exist under `src/lib/supabase/` and `middleware.ts`.
- Environment variable examples are documented in `.env.example` and `README.md`.
- Theme support is present through `next-themes`, `src/components/providers.tsx`, `src/components/theme-toggle.tsx`, and global CSS tokens.
- GSAP is installed and reusable animation helpers/components exist in `src/lib/animations.ts` and `src/components/landing/animated-section.tsx`.
- Base landing page, layout, and dashboard shell are implemented under `src/app` and `src/components`.
- FastAPI service scaffold exists under `services/ai/` with `/health` and placeholder `/generate` endpoints.
- Next.js has an AI service health helper in `src/lib/ai-service.ts`.

Open or partially verified:

- Deployment targets are described in `plan.md`, but no production deployment configuration is verified in the workspace.
- Supabase connectivity depends on runtime environment values and an external Supabase project.

### Phase 1 — Landing, auth, and onboarding

Status: **Partially complete / in progress**

Verified evidence:

- Landing page exists in `src/app/page.tsx` with value proposition, features, calls to action, and animated sections.
- Email/password signup and login server actions exist in `src/app/auth/actions.ts`.
- Google OAuth sign-in is wired through Supabase Auth in `src/app/auth/actions.ts`.
- Auth callback route exists at `src/app/auth/callback/route.ts`.
- Password reset request page and action exist under `src/app/auth/reset-password/page.tsx` and `src/app/auth/actions.ts`.
- Protected dashboard route exists at `src/app/dashboard/page.tsx` and redirects unauthenticated users to login.
- Onboarding route and server action exist under `src/app/onboarding/`.
- Onboarding persists profile data to Supabase and computes BMI in `src/app/onboarding/actions.ts`.
- Avatar state is computed from BMI bucket and experience level in `src/lib/profiles/avatar.ts`.
- `supabase/schema.sql` defines the `profiles` table and Row Level Security policies.

Remaining from Phase 1:

- Transactional email via a Nodemailer Next.js route handler is not present.
- Welcome email sending is not implemented.
- Custom verification/password reset email sending through Nodemailer is not implemented; the app currently relies on Supabase Auth email flows.
- Avatar v1 is represented as a computed `avatar_state` and dashboard card, but a full body asset matrix is not verified in the workspace.
- Email verification exists conceptually through Supabase signup redirect, but a fully customized verification UX/email pipeline is not implemented.

## Remaining phases from `plan.md`

### Phase 2 — Workout system

Status: **Not implemented beyond placeholders**

Remaining work:

- Implement real AI workout generation in the Python `/generate` endpoint.
- Define and create Supabase tables for `exercises`, `workout_plans`, and related records.
- Add an exercise library with instructions and demonstration media URLs.
- Build the workout plan UI and workout session player.
- Save generated plans and completed session records to Supabase.

Current evidence:

- `services/ai/main.py` contains a placeholder `/generate` endpoint only.
- Dashboard copy and next actions indicate workout history and sessions are future work.

### Phase 3 — Real time computer vision

Status: **Not implemented**

Remaining work:

- Add MediaPipe Pose Landmarker client integration.
- Request webcam access in the browser.
- Detect pose landmarks and calculate knee/hip angles.
- Implement squat phase detection and rep counting.
- Render skeleton overlay and real-time form feedback.
- Save compact session summaries to Supabase.

### Phase 4 — AI coach

Status: **Not implemented**

Remaining work:

- Add a Python `/feedback` endpoint.
- Send completed session summaries and recent history to the AI service.
- Store coaching feedback and suggestions in Supabase.
- Surface feedback on the dashboard or post-session UI.

### Phase 5 — Adaptive fitness system

Status: **Not implemented**

Remaining work:

- Persist richer workout history and performance metrics.
- Feed recent performance into workout generation.
- Adjust difficulty based on completion rate, form score, and user feedback.
- Maintain progress snapshots over time.
- Use progress and history to influence avatar/experience progression.

### Phase 6 — Dashboard and gamification

Status: **Partially scaffolded**

Verified evidence:

- A protected dashboard shell exists.
- The dashboard displays avatar state, placeholder metrics, recommendations, next actions, and an empty workout history state.

Remaining work:

- Replace placeholder metrics with real progress data.
- Add workout history and charts.
- Implement streaks, XP, levels, and achievements.
- Surface AI-generated insights from user history.
- Connect dashboard state to workout sessions, feedback, progress, and gamification tables.

## Data model status

Implemented in `supabase/schema.sql`:

- `profiles` table
- `profiles` Row Level Security policies
- `updated_at` trigger for profiles

Still remaining from the suggested data model:

- `exercises`
- `workout_plans`
- `workout_sessions`
- `ai_feedback`
- `progress`
- `gamification`
- Supabase Storage buckets/policies for avatar assets and exercise media

## MVP readiness assessment

The project is **not yet a full shippable MVP** as described in `plan.md`. It is ready as a foundation for the MVP because the core web app, auth/profile flow, onboarding, dashboard shell, Supabase profile schema, theming, animations, and Python service scaffold are in place.

To reach the shippable MVP described by the plan, the next highest-impact work should be:

1. Finish Phase 1 gaps: transactional email and full avatar asset presentation.
2. Build Phase 2: workout generation, exercise library, plan persistence, and session player.
3. Build Phase 3: browser-based rep counter.
4. Build Phase 4: AI coaching feedback.
5. Replace dashboard placeholders with real session, progress, and feedback data.

## Recommended next phase

Proceed with **Phase 2 — Workout system** after closing any required Phase 1 email/avatar polish. Phase 2 unlocks the first real training loop: generate a plan, show exercise demos, guide the user through a workout, and create session records that later phases can use for computer vision, feedback, and adaptation.
