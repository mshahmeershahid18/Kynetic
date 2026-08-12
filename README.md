# Kynetic

Kynetic is an AI-powered fitness web app foundation. The current implementation adds Supabase authentication, guided onboarding for a personalized fitness profile/avatar state, and a protected dashboard shell for progress, recommendations, and next actions.

## What is included

- Next.js 14 App Router project with TypeScript and Tailwind CSS.
- System-aware dark/light themes with `next-themes`.
- Supabase Auth session handling with SSR cookies.
- Email/password signup and login.
- Google OAuth sign-in route using Supabase Auth.
- Password reset request flow through Supabase.
- Protected `/onboarding` route that collects goals, body metrics, experience, limitations, equipment, and preferences.
- `profiles` table SQL with Row Level Security policies in `supabase/schema.sql`.
- Protected `/dashboard` route with profile avatar state, starter progress metrics, recommendations, and next actions.
- FastAPI service scaffold under `services/ai` retained for later AI workout generation.

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
2. In the SQL editor, run `supabase/schema.sql` to create the `profiles` table and RLS policies.
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

## Useful scripts

```bash
npm run dev        # Start the Next.js dev server
npm run build      # Build the production Next.js app
npm run start      # Start the production server after build
npm run lint       # Run Next.js ESLint
npm run typecheck  # Run TypeScript without emitting files
```

## Roadmap alignment

This repository now implements the auth and profile foundation phase. AI workout generation, exercise demos, workout player, rep counting, and adaptive coaching remain for later phases described in `plan.md`.
