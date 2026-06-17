-- ANDIAMO — 0006 releases layer
-- Releases (per artist) and their auto-generated, dated task schedules. Section 11.

-- single vs project (EP/album/deluxe/re-release all fall under 'project').
create type public.release_type as enum ('single', 'project');

-- Who owns a release task. In a release context the split is artist vs producer
-- (distinct from the roadmap's artist/coach split), plus 'both'.
create type public.release_assignee as enum ('artist', 'producer', 'both');

-- ---------- releases ----------
create table public.releases (
  id uuid primary key default gen_random_uuid(),
  artist_id uuid not null references public.artists (id) on delete cascade,
  title text not null default '',
  release_type public.release_type not null default 'single',
  release_date date not null,
  notes text,
  mgmt_link text,
  -- For future project<->single linking (Option C). Unused in the core build.
  parent_release_id uuid references public.releases (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index releases_artist_id_idx on public.releases (artist_id);
create index releases_date_idx on public.releases (release_date);

-- ---------- release_tasks ----------
-- offset_days is the task's day relative to release day (negative = before,
-- 0 = release day, positive = after). due_date is the materialized date so we
-- can sort/query cheaply; on a date change we recompute it from offset_days.
create table public.release_tasks (
  id uuid primary key default gen_random_uuid(),
  artist_id uuid not null references public.artists (id) on delete cascade,
  release_id uuid not null references public.releases (id) on delete cascade,
  description text not null default '',
  assigned_to public.release_assignee not null default 'both',
  phase_label text not null default '',
  offset_days integer not null default 0,
  due_date date,
  is_completed boolean not null default false,
  completed_at timestamptz,
  display_order integer not null default 0,
  is_custom boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index release_tasks_release_id_idx on public.release_tasks (release_id);
create index release_tasks_artist_id_idx on public.release_tasks (artist_id);

-- updated_at triggers
create trigger trg_releases_updated before update on public.releases
  for each row execute function public.set_updated_at();
create trigger trg_release_tasks_updated before update on public.release_tasks
  for each row execute function public.set_updated_at();

-- ---------- RLS: artist owns their own releases ----------
alter table public.releases enable row level security;
alter table public.release_tasks enable row level security;

create policy "releases_select_own" on public.releases
  for select to authenticated using (artist_id = public.current_artist_id());
create policy "releases_insert_own" on public.releases
  for insert to authenticated with check (artist_id = public.current_artist_id());
create policy "releases_update_own" on public.releases
  for update to authenticated
  using (artist_id = public.current_artist_id())
  with check (artist_id = public.current_artist_id());
create policy "releases_delete_own" on public.releases
  for delete to authenticated using (artist_id = public.current_artist_id());

create policy "release_tasks_select_own" on public.release_tasks
  for select to authenticated using (artist_id = public.current_artist_id());
create policy "release_tasks_insert_own" on public.release_tasks
  for insert to authenticated with check (artist_id = public.current_artist_id());
create policy "release_tasks_update_own" on public.release_tasks
  for update to authenticated
  using (artist_id = public.current_artist_id())
  with check (artist_id = public.current_artist_id());
create policy "release_tasks_delete_own" on public.release_tasks
  for delete to authenticated using (artist_id = public.current_artist_id());

-- ---------- Grants ----------
grant select, insert, update, delete on public.releases to authenticated;
grant select, insert, update, delete on public.release_tasks to authenticated;
