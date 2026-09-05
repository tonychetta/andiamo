-- ANDIAMO — 0026 reminder settings
-- Per-artist reminder settings. The timezone is captured from the browser when
-- they turn notifications on, so "8am" means 8am where they actually are.
-- last_*_on hold the artist's LOCAL date of the last send, which is what makes
-- the hourly job idempotent (it can run 24x/day and still send once).
create table if not exists public.notification_prefs (
  artist_id uuid primary key references public.artists(id) on delete cascade,
  daily_enabled boolean not null default true,
  weekly_enabled boolean not null default true,
  reminder_hour int not null default 8 check (reminder_hour between 0 and 23),
  timezone text not null default 'UTC',
  last_daily_on date,
  last_weekly_on date,
  updated_at timestamptz not null default now()
);

alter table public.notification_prefs enable row level security;

create policy "notification_prefs_select_own" on public.notification_prefs
  for select to authenticated using (artist_id = public.current_artist_id());
create policy "notification_prefs_insert_own" on public.notification_prefs
  for insert to authenticated with check (artist_id = public.current_artist_id());
create policy "notification_prefs_update_own" on public.notification_prefs
  for update to authenticated
  using (artist_id = public.current_artist_id())
  with check (artist_id = public.current_artist_id());

grant select, insert, update on public.notification_prefs to authenticated;

create trigger trg_notification_prefs_updated
  before update on public.notification_prefs
  for each row execute function public.set_updated_at();
