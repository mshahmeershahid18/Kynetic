# Kynetic Project Status

_Last verified against `plan.md` and the current workspace source tree after the AI workout generation implementation._

## Current status summary

Kynetic now has a working Next.js 14 App Router foundation with Supabase Auth/Profile onboarding, avatar-state calculation, a protected dashboard, and the first user-facing AI workout generation loop. Authenticated users can generate a personalized workout from their stored profile, persist the generated plan in Supabase under RLS, view the plan, mark it complete, and see saved plans/session counts on the dashboard.

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
- FastAPI service exists under `services/ai/` with `/health` and `/generate` endpoints.

Open or partially verified:

- Production deployment configuration is not verified in the workspace.
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

### AI workout generation phase

Status: **Implemented for generated plans and simple completion records**

Verified evidence:

- `services/ai/main.py` implements `POST /generate` and returns structured workout-plan JSON based on profile snapshot fields.
- `src/lib/ai-service.ts` calls the Python service and validates the plan shape.
- `src/lib/workouts/fallback-generator.ts` provides a deterministic fallback generator if the Python service is offline.
- `src/app/workouts/actions.ts` generates workouts server-side for the authenticated user and persists them to Supabase.
- `supabase/schema.sql` and `supabase/workouts.sql` define `workout_plans` and `workout_sessions` tables with user-owned RLS policies.
- `src/app/dashboard/page.tsx` shows generated plans, completion counts, total workout minutes, and a generate button.
- `src/app/workouts/[planId]/page.tsx` renders saved workout details and lets users mark a session complete.

Still remaining from the broader workout system:

- A normalized exercise library table with demonstration media is not implemented.
- The plan detail page is not yet a full timed workout player.
- Session data is basic completion metadata; later phases can enrich it with rep/form metrics.

## Remaining later phases from `plan.md`

### Real time computer vision

Status: **Not implemented**

Remaining work:

- Add MediaPipe Pose Landmarker client integration.
- Request webcam access in the browser.
- Detect pose landmarks and calculate knee/hip angles.
- Implement squat phase detection and rep counting.
- Render skeleton overlay and real-time form feedback.
- Save compact session summaries to Supabase.

### AI coach

Status: **Not implemented**

Remaining work:

- Add a Python `/feedback` endpoint.
- Send completed session summaries and recent history to the AI service.
- Store coaching feedback and suggestions in Supabase.
- Surface feedback on the dashboard or post-session UI.

### Adaptive fitness system

Status: **Not implemented**

Remaining work:

- Persist richer workout history and performance metrics.
- Feed recent performance into workout generation.
- Adjust difficulty based on completion rate, form score, and user feedback.
- Maintain progress snapshots over time.
- Use progress and history to influence avatar/experience progression.

### Dashboard and gamification

Status: **Partially scaffolded**

Verified evidence:

- A protected dashboard shell exists.
- The dashboard displays avatar state, generated workout plans, completion count, and total completed minutes.

Remaining work:

- Add workout charts.
- Implement streaks, XP, levels, and achievements.
- Surface AI-generated insights from user history.
- Connect dashboard state to feedback, progress, and gamification tables.

## Data model status

Implemented in `supabase/schema.sql`:

- `profiles`
- `workout_plans`
- `workout_sessions`
- Row Level Security policies for all implemented user-owned tables

Still remaining from the suggested data model:

- `exercises`
- `ai_feedback`
- `progress`
- `gamification`
- Supabase Storage buckets/policies for avatar assets and exercise media

## Recommended next phase

Proceed next with the workout player/exercise library polish or the real-time computer vision phase, depending on priority. The AI workout generation loop now produces persisted data that later player, vision, feedback, and adaptive coaching features can consume.
