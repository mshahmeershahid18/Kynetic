-- Kynetic — full database schema.
-- Single authoritative migration. Run in the Supabase SQL editor.
-- Enable Google OAuth in Auth providers before using the app.

-- ---------------------------------------------------------------------------
-- Reset (safe to re-run)
-- ---------------------------------------------------------------------------
drop table if exists public.form_analyses cascade;
drop table if exists public.ai_feedback cascade;
drop table if exists public.workout_sessions cascade;
drop table if exists public.workout_plans cascade;
drop table if exists public.progress cascade;
drop table if exists public.profiles cascade;
drop table if exists public.exercises cascade;

-- ---------------------------------------------------------------------------
-- Shared trigger
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  age integer check (age between 13 and 100),
  gender text,
  height_cm numeric check (height_cm > 0),
  weight_kg numeric check (weight_kg > 0),
  goal text,
  fitness_level text,
  experience_level text,
  limitations text,
  equipment text[] default '{}',
  workout_preferences text[] default '{}',
  available_days_per_week integer check (available_days_per_week between 1 and 7),
  preferred_session_minutes integer check (preferred_session_minutes between 10 and 180),
  bmi numeric,
  avatar_state text,
  -- Profile photo. Either a public URL in the `avatars` storage bucket, or the
  -- picture supplied by an OAuth provider on first sign-in.
  avatar_url text,
  onboarding_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);
create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- exercises — shared read-only library referenced by generated plans.
--
-- vision_kind gates live camera guidance. It is deliberately NULL for complex
-- or loaded movements (deadlift, clean, snatch, weighted bench) where a single
-- webcam cannot judge safety. Only simple, self-evident bodyweight patterns
-- get a live rep counter; everything else is demo + manual logging.
-- ---------------------------------------------------------------------------
create table public.exercises (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  muscle_group text not null,
  equipment text not null default 'bodyweight',
  difficulty text not null default 'beginner'
    check (difficulty in ('beginner', 'intermediate', 'advanced')),
  instructions text[] not null default '{}',
  cues text[] not null default '{}',
  demo_media_url text,
  demo_poster_url text,
  vision_kind text
    check (vision_kind is null or vision_kind in ('squat', 'pushup', 'lunge', 'glute_bridge')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.exercises enable row level security;

-- Library is common reference data: readable by any signed-in user, writable
-- only by the service role (which bypasses RLS).
create policy "exercises_select_authenticated" on public.exercises
  for select to authenticated using (true);

create trigger exercises_set_updated_at
before update on public.exercises
for each row execute function public.set_updated_at();

create index exercises_vision_kind_idx on public.exercises (vision_kind);

-- ---------------------------------------------------------------------------
-- workout_plans
-- ---------------------------------------------------------------------------
create table public.workout_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  summary text,
  duration_minutes integer check (duration_minutes > 0),
  difficulty text,
  goal text,
  plan jsonb not null,
  source_profile_snapshot jsonb not null,
  generator text not null default 'fallback',
  created_at timestamptz not null default now()
);

alter table public.workout_plans enable row level security;

create policy "workout_plans_select_own" on public.workout_plans
  for select using (auth.uid() = user_id);
create policy "workout_plans_insert_own" on public.workout_plans
  for insert with check (auth.uid() = user_id);
create policy "workout_plans_update_own" on public.workout_plans
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "workout_plans_delete_own" on public.workout_plans
  for delete using (auth.uid() = user_id);

create index workout_plans_user_created_idx
  on public.workout_plans (user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- workout_sessions
-- ---------------------------------------------------------------------------
create table public.workout_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workout_plan_id uuid not null references public.workout_plans(id) on delete cascade,
  status text not null default 'completed'
    check (status in ('completed', 'skipped')),
  duration_minutes integer check (duration_minutes > 0),
  session_data jsonb default '{}'::jsonb,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.workout_sessions enable row level security;

create policy "workout_sessions_select_own" on public.workout_sessions
  for select using (auth.uid() = user_id);
create policy "workout_sessions_insert_own" on public.workout_sessions
  for insert with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.workout_plans
      where workout_plans.id = workout_plan_id
        and workout_plans.user_id = auth.uid()
    )
  );
create policy "workout_sessions_update_own" on public.workout_sessions
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index workout_sessions_user_completed_idx
  on public.workout_sessions (user_id, completed_at desc);

-- ---------------------------------------------------------------------------
-- ai_feedback
-- ---------------------------------------------------------------------------
create table public.ai_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  session_id uuid not null references public.workout_sessions(id) on delete cascade,
  workout_plan_id uuid references public.workout_plans(id) on delete set null,
  feedback jsonb not null,
  feedback_text text not null,
  suggestions text[] default '{}',
  source_payload jsonb,
  generator text not null default 'fallback',
  created_at timestamptz not null default now()
);

alter table public.ai_feedback enable row level security;

create policy "ai_feedback_select_own" on public.ai_feedback
  for select using (auth.uid() = user_id);
create policy "ai_feedback_insert_own" on public.ai_feedback
  for insert with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.workout_sessions
      where workout_sessions.id = session_id
        and workout_sessions.user_id = auth.uid()
    )
  );
create policy "ai_feedback_delete_own" on public.ai_feedback
  for delete using (auth.uid() = user_id);

create index ai_feedback_user_created_idx
  on public.ai_feedback (user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- form_analyses — results of uploaded-video form checks (no live session).
-- Video is analysed in the browser; only the numeric summary is persisted.
-- ---------------------------------------------------------------------------
create table public.form_analyses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  exercise_slug text not null,
  vision_kind text not null
    check (vision_kind in ('squat', 'pushup', 'lunge', 'glute_bridge')),
  source text not null default 'upload' check (source in ('upload', 'live')),
  rep_count integer not null default 0,
  average_depth numeric,
  form_score numeric,
  warnings text[] default '{}',
  metrics jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.form_analyses enable row level security;

create policy "form_analyses_select_own" on public.form_analyses
  for select using (auth.uid() = user_id);
create policy "form_analyses_insert_own" on public.form_analyses
  for insert with check (auth.uid() = user_id);
create policy "form_analyses_delete_own" on public.form_analyses
  for delete using (auth.uid() = user_id);

create index form_analyses_user_created_idx
  on public.form_analyses (user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- progress — body metric snapshots over time (drives the avatar + charts).
--
-- Note: XP, levels, streaks and achievements are intentionally NOT stored.
-- They are pure functions of workout_sessions and are derived at read time in
-- src/lib/dashboard/gamification.ts, so they can never drift out of sync.
-- ---------------------------------------------------------------------------
create table public.progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  weight_kg numeric check (weight_kg > 0),
  bmi numeric,
  experience_level text,
  avatar_state text,
  note text,
  recorded_at timestamptz not null default now()
);

alter table public.progress enable row level security;

create policy "progress_select_own" on public.progress
  for select using (auth.uid() = user_id);
create policy "progress_insert_own" on public.progress
  for insert with check (auth.uid() = user_id);
create policy "progress_delete_own" on public.progress
  for delete using (auth.uid() = user_id);

create index progress_user_recorded_idx
  on public.progress (user_id, recorded_at desc);

-- ---------------------------------------------------------------------------
-- Storage: profile photos
--
-- Public bucket so an <img> can load the photo without a signed URL, but write
-- access is restricted: a user may only touch objects under a folder named
-- after their own uid, which is what the policies below check.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  true,
  5242880, -- 5 MB
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "avatars_public_read" on storage.objects;
create policy "avatars_public_read" on storage.objects
  for select using (bucket_id = 'avatars');

drop policy if exists "avatars_insert_own" on storage.objects;
create policy "avatars_insert_own" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "avatars_update_own" on storage.objects;
create policy "avatars_update_own" on storage.objects
  for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "avatars_delete_own" on storage.objects;
create policy "avatars_delete_own" on storage.objects
  for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
