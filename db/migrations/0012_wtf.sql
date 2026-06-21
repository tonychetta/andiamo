-- ANDIAMO — 0012 Weekly Task Form (Section 14)
-- Milestone Tasks are swiped onto the current week's WTF (on_wtf) and one is
-- named the Priority (wtf_priority). Generated WTFs are archived in `wtfs` for
-- history + email. Release/Content tasks auto-flow by date (computed live).

alter table public.tasks
  add column if not exists on_wtf boolean not null default false,
  add column if not exists wtf_priority boolean not null default false;

create table public.wtfs (
  id uuid primary key default gen_random_uuid(),
  artist_id uuid not null references public.artists (id) on delete cascade,
  week_start date not null,
  status text not null default 'generated',
  payload jsonb not null default '{}'::jsonb,
  generated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index wtfs_artist_idx on public.wtfs (artist_id);

alter table public.wtfs enable row level security;

create policy "wtfs_select_own" on public.wtfs
  for select to authenticated using (artist_id = public.current_artist_id());
create policy "wtfs_insert_own" on public.wtfs
  for insert to authenticated with check (artist_id = public.current_artist_id());
create policy "wtfs_delete_own" on public.wtfs
  for delete to authenticated using (artist_id = public.current_artist_id());

grant select, insert, update, delete on public.wtfs to authenticated;
