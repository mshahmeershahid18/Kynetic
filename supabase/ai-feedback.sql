-- AI feedback migration only.
-- Run after workout_plans and workout_sessions exist.

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

drop policy if exists "Users can read their own AI feedback" on public.ai_feedback;
create policy "Users can read their own AI feedback"
  on public.ai_feedback for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own AI feedback" on public.ai_feedback;
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

drop policy if exists "Users can update their own AI feedback" on public.ai_feedback;
create policy "Users can update their own AI feedback"
  on public.ai_feedback for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own AI feedback" on public.ai_feedback;
create policy "Users can delete their own AI feedback"
  on public.ai_feedback for delete
  using (auth.uid() = user_id);

create index if not exists ai_feedback_user_created_idx
  on public.ai_feedback (user_id, created_at desc);
