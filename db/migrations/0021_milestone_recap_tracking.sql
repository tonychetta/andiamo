-- ANDIAMO — 0021 Milestone Recap tracking
-- The Wrapped-style recap sorts a milestone's tasks into buckets that need
-- history the app didn't keep: how many times a task was pushed, how many times
-- it was completed-and-pushed (recurring cadence), and which tasks were deleted.

alter table public.tasks add column if not exists push_count int not null default 0;
alter table public.tasks add column if not exists cp_count int not null default 0;

-- Deleted milestone tasks are logged (not lost) so the recap can show what
-- "wasn't useful" for a milestone. Only deletions via the trash action log here;
-- promotions to a new milestone do not.
create table if not exists public.deleted_tasks (
  id uuid primary key default gen_random_uuid(),
  artist_id uuid not null references public.artists(id) on delete cascade,
  milestone_id uuid references public.milestones(id) on delete cascade,
  description text not null,
  deleted_at timestamptz not null default now()
);
create index if not exists deleted_tasks_milestone_idx on public.deleted_tasks(milestone_id);
alter table public.deleted_tasks enable row level security;

create policy "deleted_tasks_select_own" on public.deleted_tasks
  for select to authenticated using (artist_id = public.current_artist_id());
create policy "deleted_tasks_insert_own" on public.deleted_tasks
  for insert to authenticated with check (artist_id = public.current_artist_id());
create policy "deleted_tasks_delete_own" on public.deleted_tasks
  for delete to authenticated using (artist_id = public.current_artist_id());

grant select, insert, delete on public.deleted_tasks to authenticated;
