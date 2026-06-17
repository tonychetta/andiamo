-- ANDIAMO — 0003 vision layer
-- Vision Statement (versioned), 3 Goals, and the Vision Builder transcript.

-- Goal categories (Section 10.2)
create type public.goal_category as enum (
  'revenue_generating', 'audience_size', 'team', 'catalog', 'recognition_awards'
);

-- Reusable RLS helper: the artist row owned by the current user (null for coaches).
-- SECURITY INVOKER so it reads through the caller's own artists RLS — no escalation.
create or replace function public.current_artist_id()
returns uuid
language sql
stable
security invoker
set search_path = ''
as $$
  select id from public.artists where user_id = (select auth.uid())
$$;

-- ---------- visions (versioned; one current per artist) ----------
create table public.visions (
  id uuid primary key default gen_random_uuid(),
  artist_id uuid not null references public.artists (id) on delete cascade,
  version integer not null default 1,
  is_current boolean not null default true,
  statement_text text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index visions_artist_id_idx on public.visions (artist_id);

-- ---------- goals (3 per vision) ----------
create table public.goals (
  id uuid primary key default gen_random_uuid(),
  artist_id uuid not null references public.artists (id) on delete cascade,
  vision_id uuid not null references public.visions (id) on delete cascade,
  category public.goal_category not null,
  description text not null default '',
  display_order integer not null default 0,
  is_completed boolean not null default false,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index goals_vision_id_idx on public.goals (vision_id);
create index goals_artist_id_idx on public.goals (artist_id);

-- ---------- vision builder transcript (coach-readable later) ----------
create table public.vision_builder_transcripts (
  id uuid primary key default gen_random_uuid(),
  artist_id uuid not null references public.artists (id) on delete cascade,
  vision_id uuid references public.visions (id) on delete set null,
  messages jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);
create index vbt_artist_id_idx on public.vision_builder_transcripts (artist_id);

-- updated_at triggers
create trigger trg_visions_updated before update on public.visions
  for each row execute function public.set_updated_at();
create trigger trg_goals_updated before update on public.goals
  for each row execute function public.set_updated_at();

-- ---------- RLS: artist owns their own vision data ----------
alter table public.visions enable row level security;
alter table public.goals enable row level security;
alter table public.vision_builder_transcripts enable row level security;

create policy "visions_select_own" on public.visions
  for select to authenticated using (artist_id = public.current_artist_id());
create policy "visions_insert_own" on public.visions
  for insert to authenticated with check (artist_id = public.current_artist_id());
create policy "visions_update_own" on public.visions
  for update to authenticated
  using (artist_id = public.current_artist_id())
  with check (artist_id = public.current_artist_id());

create policy "goals_select_own" on public.goals
  for select to authenticated using (artist_id = public.current_artist_id());
create policy "goals_insert_own" on public.goals
  for insert to authenticated with check (artist_id = public.current_artist_id());
create policy "goals_update_own" on public.goals
  for update to authenticated
  using (artist_id = public.current_artist_id())
  with check (artist_id = public.current_artist_id());

create policy "vbt_select_own" on public.vision_builder_transcripts
  for select to authenticated using (artist_id = public.current_artist_id());
create policy "vbt_insert_own" on public.vision_builder_transcripts
  for insert to authenticated with check (artist_id = public.current_artist_id());

-- ---------- Grants ----------
grant select, insert, update on public.visions to authenticated;
grant select, insert, update on public.goals to authenticated;
grant select, insert on public.vision_builder_transcripts to authenticated;
