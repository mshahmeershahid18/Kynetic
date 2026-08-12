# Kynetic

Kynetic is an AI-powered fitness coach web app. The current implementation adds Supabase authentication, guided onboarding for a personalized fitness profile/avatar state, AI workout generation, persisted workout plans/session completions, AI coaching feedback, browser rep counting, and a Phase 6 protected dashboard with progress charts and gamification.

## What is included

- Next.js 14 App Router project with TypeScript and Tailwind CSS.
- System-aware dark/light themes with `next-themes`.
- Supabase Auth session handling with SSR cookies.
- Email/password signup and login.
- Google OAuth sign-in route using Supabase Auth.
- Password reset request flow through Supabase.
- Protected `/onboarding` route that collects goals, body metrics, experience, limitations, equipment, and preferences.
- `profiles`, `workout_plans`, and `workout_sessions` SQL with Row Level Security policies in `supabase/schema.sql`.
- FastAPI `/generate` endpoint that returns strict workout-plan JSON from profile data.
- Server-side workout generation flow that uses goal, fitness level, experience, equipment, limitations, and available time.
- Fallback TypeScript workout generator so the dashboard remains usable if the local Python service is offline.
- Protected `/dashboard` route with profile avatar state, headline fitness stats, generated workout cards, saved plan history, workout history, 7-day progress charts, XP, levels, streaks, achievements, and AI history insights.
- Protected `/workouts/[planId]` route to view a generated plan and mark a session complete.
- Protected `/workouts/[planId]/play` guided session player with exercise/set progression, rest timer, elapsed time, perceived difficulty capture, and saved session summaries.
- Browser-only MediaPipe Tasks Vision pose tracker for squat/lunge-style movements with webcam skeleton overlay, rep counting, depth/form scoring, and compact metrics persisted in `workout_sessions.session_data`.

## Getting started

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open http://localhost:3000.

## Environment variables

Copy `.env.example` to `.env.local` and fill in values:

```bash
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
AI_SERVICE_URL=http://localhost:8000
```

`/auth`, `/onboarding`, and `/dashboard` require Supabase values. The landing page still renders without them.

## Supabase setup

1. Create a Supabase project.
2. In the SQL editor, run `supabase/schema.sql` to create the profile, workout, and AI feedback tables with RLS policies. If your project already has the profile schema from an earlier phase, you can run `supabase/workouts.sql` for only the workout tables/policies and `supabase/ai-feedback.sql` for coaching feedback persistence.
3. In Auth settings, enable email/password authentication.
4. To use Google OAuth, enable the Google provider and set the redirect URL to:

```text
http://localhost:3000/auth/callback
```

For production, also add your deployed site callback URL and set `NEXT_PUBLIC_SITE_URL` accordingly.

## Run the FastAPI AI service

```bash
cd services/ai
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

Health check: http://localhost:8000/health

Generate endpoint: `POST http://localhost:8000/generate` with a profile snapshot. The Next.js app calls this endpoint from a server action and persists the returned plan in Supabase.

## Guided workout and rep counting notes

The play route uses `@mediapipe/tasks-vision` dynamically on the client. Webcam frames never leave the browser; only summary fields such as `rep_count`, `average_depth`, `form_score`, form warnings, set logs, elapsed time, and perceived difficulty are sent to the existing session completion action. MediaPipe model/WASM files are loaded from the official CDN, so rep counting requires network access and camera permission. Non squat/lunge-style exercises remain manually advanced.

## Useful scripts

```bash
npm run dev        # Start the Next.js dev server
npm run build      # Build the production Next.js app
npm run start      # Start the production server after build
npm run lint       # Run Next.js ESLint
npm run typecheck  # Run TypeScript without emitting files
```

## Roadmap alignment

This repository now implements the auth/profile foundation, AI workout generation, AI coaching feedback, the guided workout player with browser-based MediaPipe rep counting, and the Phase 6 dashboard/gamification layer. Full exercise media demos and deeper adaptive progression rules remain for later phases described in `plan.md`.
