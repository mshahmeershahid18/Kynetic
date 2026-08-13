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
A real human base mesh (24,461 vertices) rendered in greyscale with Three.js.

There is exactly **one** source model, `FinalBaseMesh.obj`. Every body — male or
female, at any BMI and any training level — is that same mesh reshaped at runtime
by `src/lib/avatar/deform.ts`. An OBJ carries no blend shapes, so the reshaping is
done by moving vertices according to which part of the body they belong to.

Three continuous inputs drive it:

- **mass** (from BMI) widens and deepens the abdomen most, hips and chest less,
  head and extremities least — so a heavier figure reads as heavier rather than
  uniformly scaled up.
- **muscle** (from experience level) broadens the shoulders and upper back and
  slightly narrows the waist. That contrast, not raw size, is what reads as trained.
- **sex** applies female shaping on the same mesh: wider hips, narrower shoulders
  and ribcage, a more defined waist, a bust, and slightly shorter stature.

The anatomical landmarks (crotch, waist, shoulder joint, hand positions) were
measured off the actual source mesh, so the deformation lands on the right body
parts rather than on guessed heights. Region weights are smooth, so there are no
seams where the arms meet the shoulders.

The mesh is precompiled to a compact binary (2.5 MB of ASCII OBJ → 430 KB):

```bash
npm run build:avatar   # FinalBaseMesh.obj -> public/models/human-base.bin
```

Only re-run this if the source model changes; the output is committed.

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
Windows: .venv\Scripts\activate
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

## AI and Reuse Disclosure

This project was built with the assistance of Artificial Intelligence (AI) tools for coding, design, and content generation. Portions of this codebase, including but not limited to the AI service integrations and UI layout, rely on existing libraries and frameworks as documented. 
The 3D base mesh and underlying logic for computer vision (MediaPipe) incorporate open-source models and resources that have been adapted for this specific use case. All AI interactions and generated code have been reviewed and tested.
