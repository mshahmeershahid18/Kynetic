# AI Fitness Coach â€” Phased Build Plan

## Overview

An AI powered fitness web app that builds a personalized profile and avatar, generates workouts with AI, demonstrates exercises, counts reps in real time using browser based computer vision, and returns AI coaching feedback that adapts over time.

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js (App Router), TypeScript |
| Database and auth | Supabase (Postgres, Auth, Storage, Row Level Security) |
| AI engine | Python service (FastAPI) for workout generation and coach feedback |
| Real time vision | MediaPipe Pose Landmarker, running in the browser as WebAssembly |
| Auth method | Supabase Auth (JWT plus Google OAuth) |
| Transactional email | Nodemailer on a Next.js route handler using a Gmail app password |
| Landing page email (optional) | EmailJS for a simple contact form |
| Animation | GSAP |
| Theming | Dark and light, system aware |

## Architecture at a glance

Three moving parts talk to each other.

The **Next.js app** is the whole user facing surface: landing page, auth, onboarding, dashboard, workout player, and the webcam based rep counter. It reads and writes to Supabase directly for anything user owned, protected by Row Level Security.

**Supabase** is the source of truth. It holds the Postgres database, handles login and signup with JWT and Google OAuth, stores avatar assets and exercise media in Storage, and enforces per user access with RLS policies.

The **Python engine** is a separate FastAPI service with two endpoints only: generate a workout plan from a profile, and produce coaching feedback from a completed session. Next.js calls it over HTTP. It does not handle auth, storage, or the webcam. This keeps Python doing the AI work and nothing else.

The **rep counter lives in the browser**, not in Python. MediaPipe Pose Landmarker detects body landmarks from the webcam feed on the client, and the squat counting plus form checks run in TypeScript. Only the finished session summary (reps, average depth, form score, duration) is saved to Supabase and later sent to the Python engine for feedback.

---

## Phase 0 â€” Foundation and setup

Get the skeleton standing before any feature work.

Deliverables:
1. Next.js project scaffolded with TypeScript, App Router, and Tailwind.
2. Supabase project created, connection wired into Next.js, environment variables in place.
3. Theme system working end to end: a dark and light toggle that respects the system preference and persists the user choice.
4. GSAP installed and a shared animation setup ready (a small helper for scroll and entrance animations so later phases reuse one pattern).
5. Base layout, navigation shell, and a design token pass so colors, spacing, and typography are consistent across both themes.
6. Python FastAPI service scaffolded and deployable, with a health check endpoint and a placeholder generate endpoint.
7. Deployment targets chosen and connected: Next.js on Vercel, the Python service on a container host (Render, Railway, or Fly), Supabase managed.

Exit criteria: a themed landing shell loads, the app connects to Supabase, and Next.js can reach the Python service.

---

## Phase 1 â€” Landing, auth, and onboarding (MVP priority 1 and 2)

This phase covers the landing page, the full auth flow, onboarding, and the first version of the avatar.

### Landing page
A marketing page with GSAP driven entrance and scroll animations, a clear value proposition, a features section, and calls to action into signup. This is a good place to lean into the animation work since it sets the tone.

### Auth (JWT plus Google OAuth)
Use Supabase Auth. It issues JWTs on login and supports Google OAuth natively.
1. Email and password signup and login.
2. Google OAuth sign in.
3. Session handling in Next.js using Supabase server side helpers, so protected routes and RLS both see the same user.
4. Password reset and email verification.

### Transactional email
Set up Nodemailer on a Next.js route handler using your Gmail app password. Wire it to send the welcome email, verification, and password reset messages. (EmailJS can optionally power a contact form on the landing page, but keep account mail on the server side route.)

### Onboarding
A guided multi step flow collecting age, gender, height, weight, fitness level, goal, available equipment, and gym experience. Persist this into the `profiles` table. Compute and store BMI on save.

### Avatar, version one
Show a full body avatar, head to legs, on the dashboard, driven by two inputs: the BMI bucket and the experience level.

BMI buckets: underweight (below 18.5), normal (18.5 to 24.9), overweight (25 to 29.9), obese (30 and above).

Experience buckets: none, beginner, intermediate, experienced. Experience drives muscularity.

The rule you described maps cleanly to a grid. Zero experience with a normal BMI gives a normal, non muscular body. Experience with a normal BMI gives a leaner, more muscular cut body. Higher BMI buckets shift the body shape heavier, and experience within a heavier bucket reads as a stronger, more solid build rather than lean cut.

Two ways to implement this, from simplest to richest:

**Asset matrix (recommended for MVP).** Prepare a set of full body illustrations for each combination of BMI bucket and muscle level. At runtime, compute the pair and pick the matching image. Simple, predictable, fast to ship, and easy to art direct. The `avatar_state` is just the resolved pair, stored on the profile.

**Parametric 3D (richer, more work).** A single rigged 3D model in Three.js with morph targets for body fat and muscle mass. BMI drives the fat morph, experience drives the muscle morph, so the avatar changes smoothly rather than snapping between tiers. Worth considering after MVP if you want continuous, more lifelike updates.

Either way, the avatar recomputes whenever the profile changes. When weight updates, BMI recalculates and the body shape shifts. As the user accumulates real training in later phases, their experience bucket can rise and the avatar gains muscle to match.

Exit criteria: a user can sign up with email or Google, complete onboarding, receive a welcome email, and land on a dashboard showing a full body avatar that matches their BMI and experience.

---

## Phase 2 â€” Workout system (MVP priority 3 and 4)

### AI workout generation (Python engine)
The `generate` endpoint takes the user profile (goal, fitness level, equipment, available time) and returns a structured workout plan: exercises, sets, reps, and rest. Return strict JSON so the frontend can render it directly and you can store it in Supabase. Next.js calls this endpoint and saves the result under the user.

### Exercise library
A catalog of exercises in Supabase, each with instructions and a demonstration video or animation stored in Supabase Storage. The generated plan references library entries so demonstrations are always available.

### Workout session player
The interface that walks a user through a session: current exercise, set and rep targets, a rest timer between sets, and progression to the next exercise. GSAP handles transitions between sets and exercises. Completing a session writes a session record.

Exit criteria: a user gets an AI generated plan tailored to their profile, can view demonstrations, and can run a full session with sets, reps, and rest timing.

---

## Phase 3 â€” Real time computer vision (MVP priority 5)

All client side, in the browser.

1. Load MediaPipe Pose Landmarker (WebAssembly) and access the webcam directly from the browser.
2. Detect body landmarks on the live feed and compute joint angles (knee and hip angles for squats).
3. Implement squat detection and rep counting from the angle pattern (a down phase past a depth threshold followed by a return counts as one rep).
4. Give basic form feedback in real time, such as depth reached and posture cues.
5. Draw the skeleton overlay on top of the camera feed so the user sees themselves being tracked.
6. On session end, save the summary (rep count, average depth, form score, duration) to Supabase.

Keep the heavy lifting on the client for low latency. Only the compact summary leaves the browser.

Exit criteria: a user can start the camera, do squats, see their skeleton and live rep count with depth feedback, and have the session summary saved.

---

## Phase 4 â€” AI coach (MVP priority 6)

### Coaching feedback (Python engine)
A `feedback` endpoint takes the completed session summary plus recent history and returns personalized feedback: how the reps and form went, whether the difficulty fit, and concrete suggestions for next time. Because it receives history, feedback improves as data accumulates. Store each feedback record so the dashboard can show it and the next generation call can reference it.

Exit criteria: after a session, the user receives specific, personalized feedback that reflects their actual performance and past sessions.

---

## Phase 5 â€” Adaptive fitness system

Close the loop so workouts evolve with the user.

1. Persist workout history and performance metrics per session.
2. Feed recent performance into the generate endpoint so new plans account for how the last ones went.
3. Adjust difficulty up or down based on progress (completion rate, form scores, reported difficulty).
4. Track progress over time as a queryable history, which also feeds the dashboard and can bump the experience bucket that drives the avatar.

Exit criteria: a user who consistently completes sessions gets harder workouts, and someone struggling gets eased off, both automatically.

---

## Phase 6 â€” Dashboard and gamification (MVP priority 7)

1. A personalized dashboard leading with the full body avatar and headline fitness stats.
2. Workout history and progress charts.
3. Streaks, XP, levels, and achievements.
4. AI generated insights surfaced from the history.

The avatar on this dashboard is the emotional payoff: it visibly reflects the user, updates as BMI changes, and gains muscle as experience climbs, so progress is something they can see.

Exit criteria: a dashboard that feels personal, shows real progress, and rewards consistency.

---

## Suggested data model (Supabase)

Core tables, all protected by Row Level Security so each user only sees their own rows.

- `profiles`: user id, age, gender, height, weight, fitness_level, goal, equipment, experience_level, bmi, avatar_state.
- `exercises`: name, instructions, muscle group, equipment, demo_media_url.
- `workout_plans`: user id, generated plan JSON, source profile snapshot, created_at.
- `workout_sessions`: user id, plan id, reps, average_depth, form_score, duration, completed_at.
- `ai_feedback`: user id, session id, feedback text, suggestions, created_at.
- `progress`: user id, metric snapshots over time.
- `gamification`: user id, xp, level, current_streak, achievements.

---

## Cross cutting concerns

**Theming.** Establish the dark and light token set in Phase 0 and use those tokens everywhere, so no phase hardcodes a color.

**GSAP.** Set the animation helper up once in Phase 0 and reuse it. Highest impact spots: landing page, onboarding step transitions, workout session transitions, and dashboard entrance.

**Security.** Rely on Supabase RLS for data isolation. Keep the Gmail app password and any AI API keys server side only, never in client code. The Python engine should verify the Supabase JWT on incoming requests so only signed in users can call it.

**Deployment.** Next.js on Vercel, Python engine on a container host, Supabase managed. Wire environment variables per environment early.

---

## Rough sequencing

- Phase 0: foundation.
- Phase 1: landing, auth, onboarding, avatar v1. This is the largest MVP chunk.
- Phase 2: workout generation, library, session player.
- Phase 3: browser rep counter.
- Phase 4: AI coach feedback.
- Phase 5: adaptation loop.
- Phase 6: dashboard and gamification.

Phases 1 through 4 plus the dashboard from Phase 6 together form the shippable MVP that matches your priority list. Phase 5 and the gamification depth can follow once the core loop is proven.