-- Phase 2 auth/profile foundation schema for Supabase.
-- Run this in the Supabase SQL editor after enabling Google OAuth in Auth providers.

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
