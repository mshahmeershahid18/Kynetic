# Kynetic

Kynetic is an AI-powered fitness web app foundation. This phase bootstraps a runnable Next.js App Router frontend with Supabase-ready configuration, dark/light theming, GSAP animation helpers, and a separate FastAPI service scaffold for future AI workout generation.

## What is included in this phase

- Next.js 14 App Router project with TypeScript.
- Tailwind CSS design tokens for system-aware dark and light themes.
- Theme toggle with persisted user preference via `next-themes`.
- Marketing landing page with product positioning and email-capture placeholder.
- Supabase browser client factory and environment variable example.
- Shared GSAP entrance animation helper.
- FastAPI service under `services/ai` with `/health` and placeholder `/generate` endpoints.
- Linting, type checking, Prettier, and build scripts.

## Getting started

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open http://localhost:3000.

## Environment variables

Copy `.env.example` to `.env.local` and fill in values when available:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
AI_SERVICE_URL=http://localhost:8000
```

The app still runs without Supabase values; the landing page will show the integration as awaiting `.env.local`.

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

This repository currently implements Phase 0 / Project foundation only. Auth, onboarding, workout generation, exercise demos, rep counting, and adaptive coaching are intentionally left for later phases described in `plan.md`.