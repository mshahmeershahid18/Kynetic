# Kynetic

An AI-powered fitness coach. Kynetic builds a personalized profile and 3D avatar,
generates workouts with Google Gemini, coaches simple exercises live through your
webcam, checks your form from uploaded video, and adapts future sessions to how
your last ones actually went.

## Architecture

Three parts:

- **Next.js app** — the entire user-facing surface. Talks to Supabase directly
  for anything user-owned, protected by Row Level Security.
- **Supabase** — Postgres, Auth (JWT + Google OAuth), Storage for exercise demo
  media, and RLS for per-user isolation.
- **Python service** (`services/ai`) — FastAPI with two endpoints, `generate` and
  `feedback`, both Gemini-backed and both requiring a valid Supabase JWT.

**Computer vision runs in the browser**, not in Python. MediaPipe Pose Landmarker
detects landmarks on the client and the rep counting and form scoring run in
TypeScript. Only the numeric summary is ever persisted.

## Features

### AI workout generation
Gemini receives your goal, experience, equipment, limitations, available time,
and recent performance, plus the full exercise library, and returns a structured
plan. Every plan is **re-validated server side** against the library, so a
hallucinated or equipment-inappropriate exercise cannot reach you.

Three fallback layers guarantee you always get a plan: Gemini → deterministic
Python engine → local TypeScript generator. The `generator` column records which
one ran.

### 3D avatar
A greyscale humanoid built with Three.js. Two continuous parameters drive it —
body mass from BMI, muscularity from experience level — so the figure changes
gradually as your profile changes rather than snapping between tiers. Auto-rotates,
and can be dragged to orbit.

### Live guidance (simple exercises only)
Squats, push-ups, lunges, and glute bridges get real-time camera coaching: a
skeleton overlay, automatic rep counting, a depth bar, and spoken-style cues
("Lift your chest — you are leaning too far forward").

**This is deliberately limited.** Loaded and complex lifts — deadlifts, presses,
weighted work — get no live tracking, because a single webcam cannot judge them
safely. Those exercises show their demo and are logged manually, and the UI says
why.

### Video form check
Would rather film a set than run a live session? Upload a clip at `/form-check`.
It is decoded and analysed **entirely in your browser** using the same analyzers
the live coach uses — the video never leaves your device. Only the rep count and
form summary are saved.

### Adaptive coaching
After each session, Gemini reviews your completion rate, camera form data, and
recent history, and returns specific feedback. Completion rate and form scores
feed back into difficulty. Hitting 5 / 15 / 40 completed sessions raises your
experience level, which immediately changes your avatar.

## Getting started

```bash
npm install
cp .env.example .env.local   # fill in your Supabase values
npm run dev
```

Open http://localhost:3000.

### Supabase setup

1. Create a Supabase project.
2. In the SQL editor run **`supabase/schema.sql`**, then **`supabase/seed-exercises.sql`**.
3. Enable email/password auth. For Google OAuth, enable the provider and set the
   redirect URL to `http://localhost:3000/auth/callback` (add your production URL
   too, and set `NEXT_PUBLIC_SITE_URL`).
4. Optional but recommended: create a **public** Storage bucket named
   `exercise-media` and upload the demo clips referenced by the seed file. Until
   you do, exercises fall back to written coaching cues.

### Run the AI service

```bash
cd services/ai
python -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements.txt

export GEMINI_API_KEY=...          # omit to use the deterministic engine
export REQUIRE_AUTH=false          # local only; see below

uvicorn main:app --reload --port 8000
```

Health check: http://localhost:8000/health

See [services/ai/README.md](services/ai/README.md) for full configuration.

## Security

- Every user table is protected by RLS. `exercises` is read-only to authenticated
  users and writable only by the service role.
- **The AI service verifies the Supabase JWT on every request.** Next.js forwards
  the caller's access token. Auth fails closed: if `REQUIRE_AUTH` is on without a
  configured secret, the service returns 500 rather than serving traffic openly.
  Set `SUPABASE_JWT_SECRET` in production.
- Gemini and Gmail credentials live server side only, never in client code.
- Webcam frames and uploaded videos are processed in the browser and never
  transmitted.

## Scripts

```bash
npm run dev        # Dev server
npm run build      # Production build
npm run start      # Serve the production build
npm run lint       # ESLint
npm run typecheck  # tsc --noEmit
```

## Project status

See [status.md](status.md) for a phase-by-phase status, the design decisions
behind it, and the known gaps.
