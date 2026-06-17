-- ANDIAMO — 0004 roadmap layer
-- Milestones (per Goal) and Tasks (per Milestone). Section 10 / 18.3.

-- Who a task belongs to (DWY tier splits work; DIY defaults to artist).
create type public.task_assignee as enum ('artist', 'coach', 'both');

-- ---------- milestones ----------
create table public.milestones (
  id uuid primary key default gen_random_uuid(),
  artist_id uuid not null references public.artists (id) on delete cascade,
  goal_id uuid not null references public.goals (id) on delete cascade,
  description text not null default '',
  display_order integer not null default 0,
  is_next_milestone boolean not null default false,
  is_completed boolean not null default false,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index milestones_goal_id_idx on public.milestones (goal_id);
create index milestones_artist_id_idx on public.milestones (artist_id);

-- ---------- tasks ----------
-- parent_task_id powers the dependency nesting (Section 10.6): a task with a
-- parent displays indented and stays locked until its parent is completed.
create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  artist_id uuid not null references public.artists (id) on delete cascade,
  milestone_id uuid references public.milestones (id) on delete cascade,
  parent_task_id uuid references public.tasks (id) on delete set null,
  description text not null default '',
  display_order integer not null default 0,
  assigned_to public.task_assignee not null default 'artist',
  is_recurring boolean not null default false,
  is_completed boolean not null default false,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index tasks_milestone_id_idx on public.tasks (milestone_id);
create index tasks_artist_id_idx on public.tasks (artist_id);
create index tasks_parent_task_id_idx on public.tasks (parent_task_id);

-- updated_at triggers
create trigger trg_milestones_updated before update on public.milestones
  for each row execute function public.set_updated_at();
create trigger trg_tasks_updated before update on public.tasks
  for each row execute function public.set_updated_at();

-- ---------- RLS: artist owns their own roadmap ----------
alter table public.milestones enable row level security;
alter table public.tasks enable row level security;

create policy "milestones_select_own" on public.milestones
  for select to authenticated using (artist_id = public.current_artist_id());
create policy "milestones_insert_own" on public.milestones
  for insert to authenticated with check (artist_id = public.current_artist_id());
create policy "milestones_update_own" on public.milestones
  for update to authenticated
  using (artist_id = public.current_artist_id())
  with check (artist_id = public.current_artist_id());
create policy "milestones_delete_own" on public.milestones
  for delete to authenticated using (artist_id = public.current_artist_id());

create policy "tasks_select_own" on public.tasks
  for select to authenticated using (artist_id = public.current_artist_id());
create policy "tasks_insert_own" on public.tasks
  for insert to authenticated with check (artist_id = public.current_artist_id());
create policy "tasks_update_own" on public.tasks
  for update to authenticated
  using (artist_id = public.current_artist_id())
  with check (artist_id = public.current_artist_id());
create policy "tasks_delete_own" on public.tasks
  for delete to authenticated using (artist_id = public.current_artist_id());

-- ---------- Grants ----------
grant select, insert, update, delete on public.milestones to authenticated;
grant select, insert, update, delete on public.tasks to authenticated;
