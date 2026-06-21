-- ANDIAMO — 0013 Coach Portal (Section 5.3)
-- A coach "enters" an assigned artist by setting their active artist. From then
-- on current_artist_id() resolves to that artist (only if assigned), so every
-- existing page + RLS policy works for the coach with no per-table changes.

create table public.coach_active_artist (
  coach_user_id uuid primary key references auth.users (id) on delete cascade,
  artist_id uuid not null references public.artists (id) on delete cascade,
  updated_at timestamptz not null default now()
);

alter table public.coach_active_artist enable row level security;

create policy "caa_select_own" on public.coach_active_artist
  for select to authenticated using (coach_user_id = (select auth.uid()));
create policy "caa_insert_own" on public.coach_active_artist
  for insert to authenticated with check (coach_user_id = (select auth.uid()));
create policy "caa_update_own" on public.coach_active_artist
  for update to authenticated
  using (coach_user_id = (select auth.uid()))
  with check (coach_user_id = (select auth.uid()));
create policy "caa_delete_own" on public.coach_active_artist
  for delete to authenticated using (coach_user_id = (select auth.uid()));

grant select, insert, update, delete on public.coach_active_artist to authenticated;

-- Coaches can read + update the artists assigned to them (for the roster and
-- status changes). No reference to current_artist_id() here, so no recursion.
create policy "artists_select_assigned" on public.artists
  for select to authenticated
  using (
    coach_id in (select id from public.coaches where user_id = (select auth.uid()))
  );
create policy "artists_update_assigned" on public.artists
  for update to authenticated
  using (
    coach_id in (select id from public.coaches where user_id = (select auth.uid()))
  )
  with check (
    coach_id in (select id from public.coaches where user_id = (select auth.uid()))
  );

-- Coach-aware: own artist row if an artist; else the coach's active+assigned artist.
create or replace function public.current_artist_id()
returns uuid
language sql
stable
security invoker
set search_path = ''
as $$
  select coalesce(
    (select id from public.artists where user_id = (select auth.uid())),
    (select caa.artist_id
       from public.coach_active_artist caa
       join public.artists a on a.id = caa.artist_id
       join public.coaches co on co.id = a.coach_id
      where caa.coach_user_id = (select auth.uid())
        and co.user_id = (select auth.uid()))
  )
$$;
