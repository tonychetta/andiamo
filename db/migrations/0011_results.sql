-- ANDIAMO — 0011 Results page (Section 13)
-- One time-series table for every Results metric. metric_key identifies the
-- graph (e.g. instagram_followers, spotify_monthly_listeners, song_streams).
-- For song_streams, song_id points at the tracked song. Manual entry in Phase 1
-- (API integrations are Phase 5); each row is one weekly data point.

create table public.results_entries (
  id uuid primary key default gen_random_uuid(),
  artist_id uuid not null references public.artists (id) on delete cascade,
  metric_key text not null,
  song_id uuid references public.songs (id) on delete cascade,
  entry_date date not null,
  value bigint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index results_entries_artist_idx on public.results_entries (artist_id);
create index results_entries_lookup_idx
  on public.results_entries (artist_id, metric_key, song_id, entry_date);

create trigger trg_results_entries_updated before update on public.results_entries
  for each row execute function public.set_updated_at();

alter table public.results_entries enable row level security;

create policy "results_select_own" on public.results_entries
  for select to authenticated using (artist_id = public.current_artist_id());
create policy "results_insert_own" on public.results_entries
  for insert to authenticated with check (artist_id = public.current_artist_id());
create policy "results_update_own" on public.results_entries
  for update to authenticated using (artist_id = public.current_artist_id())
  with check (artist_id = public.current_artist_id());
create policy "results_delete_own" on public.results_entries
  for delete to authenticated using (artist_id = public.current_artist_id());

grant select, insert, update, delete on public.results_entries to authenticated;
