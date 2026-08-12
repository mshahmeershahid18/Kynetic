-- Phase 3 workout generation migration only.
-- Run after the base profiles schema if your project already has Phase 1/2 tables.

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

drop policy if exists "Users can read their own workout plans" on public.workout_plans;
create policy "Users can read their own workout plans"
  on public.workout_plans for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own workout plans" on public.workout_plans;
create policy "Users can insert their own workout plans"
  on public.workout_plans for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own workout plans" on public.workout_plans;
create policy "Users can update their own workout plans"
  on public.workout_plans for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own workout plans" on public.workout_plans;
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

drop policy if exists "Users can read their own workout sessions" on public.workout_sessions;
create policy "Users can read their own workout sessions"
  on public.workout_sessions for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own workout sessions" on public.workout_sessions;
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

drop policy if exists "Users can update their own workout sessions" on public.workout_sessions;
create policy "Users can update their own workout sessions"
  on public.workout_sessions for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists workout_sessions_user_completed_idx
  on public.workout_sessions (user_id, completed_at desc);
