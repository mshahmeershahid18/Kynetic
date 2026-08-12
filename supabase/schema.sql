-- Phase 2 auth/profile foundation schema for Supabase.
-- Run this in the Supabase SQL editor after enabling Google OAuth in Auth providers.

drop table if exists public.ai_feedback cascade;
drop table if exists public.workout_sessions cascade;
drop table if exists public.workout_plans cascade;
drop table if exists public.profiles cascade;
drop table if exists public.exercises cascade;

create table if not exists public.profiles (
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
  onboarding_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users can read their own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can insert their own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

-- Phase 3: AI-generated workout persistence.
create table if not exists public.workout_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  summary text,
  duration_minutes integer check (duration_minutes > 0),
  difficulty text,
  goal text,
  plan jsonb not null,
  source_profile_snapshot jsonb not null,
  created_at timestamptz not null default now()
);

alter table public.workout_plans enable row level security;

create policy "Users can read their own workout plans"
  on public.workout_plans for select
  using (auth.uid() = user_id);

create policy "Users can insert their own workout plans"
  on public.workout_plans for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own workout plans"
  on public.workout_plans for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own workout plans"
  on public.workout_plans for delete
  using (auth.uid() = user_id);

create index if not exists workout_plans_user_created_idx
  on public.workout_plans (user_id, created_at desc);

create table if not exists public.workout_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workout_plan_id uuid not null references public.workout_plans(id) on delete cascade,
  status text not null default 'completed' check (status in ('completed', 'skipped')),
  duration_minutes integer check (duration_minutes > 0),
  session_data jsonb default '{}'::jsonb,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.workout_sessions enable row level security;

create policy "Users can read their own workout sessions"
  on public.workout_sessions for select
  using (auth.uid() = user_id);

create policy "Users can insert their own workout sessions"
  on public.workout_sessions for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.workout_plans
      where workout_plans.id = workout_plan_id
      and workout_plans.user_id = auth.uid()
    )
  );

create policy "Users can update their own workout sessions"
  on public.workout_sessions for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists workout_sessions_user_completed_idx
  on public.workout_sessions (user_id, completed_at desc);

-- Phase 4/6: AI coaching feedback used by dashboard insights and gamification.
create table if not exists public.ai_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  session_id uuid not null references public.workout_sessions(id) on delete cascade,
  workout_plan_id uuid references public.workout_plans(id) on delete set null,
  feedback jsonb not null,
  feedback_text text not null,
  suggestions text[] default '{}',
  source_payload jsonb,
  created_at timestamptz not null default now()
);

alter table public.ai_feedback enable row level security;

create policy "Users can read their own AI feedback"
  on public.ai_feedback for select
  using (auth.uid() = user_id);

create policy "Users can insert their own AI feedback"
  on public.ai_feedback for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.workout_sessions
      where workout_sessions.id = session_id
      and workout_sessions.user_id = auth.uid()
    )
  );

create policy "Users can update their own AI feedback"
  on public.ai_feedback for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own AI feedback"
  on public.ai_feedback for delete
  using (auth.uid() = user_id);

create index if not exists ai_feedback_user_created_idx
  on public.ai_feedback (user_id, created_at desc);
