-- ANDIAMO — 0016 multiple coaches per artist
-- An artist can have several coaches (e.g. content specialist + point person).
-- Replace the single artists.coach_id link with an artist_coaches join table,
-- and let a Task be assigned to a specific coach (tasks.assigned_coach_id).

create table public.artist_coaches (
  artist_id uuid not null references public.artists (id) on delete cascade,
  coach_id uuid not null references public.coaches (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (artist_id, coach_id)
);
create index artist_coaches_coach_idx on public.artist_coaches (coach_id);

-- Carry existing single assignments into the join table.
insert into public.artist_coaches (artist_id, coach_id)
select id, coach_id from public.artists where coach_id is not null
on conflict do nothing;

alter table public.artist_coaches enable row level security;
-- A coach sees their memberships; an artist sees their own.
create policy "ac_select_coach" on public.artist_coaches
  for select to authenticated
  using (coach_id in (select id from public.coaches where user_id = (select auth.uid())));
create policy "ac_select_artist" on public.artist_coaches
  for select to authenticated
  using (artist_id in (select id from public.artists where user_id = (select auth.uid())));
grant select, insert, update, delete on public.artist_coaches to authenticated;

-- Per-coach task assignment (null = the artist's task).
alter table public.tasks
  add column if not exists assigned_coach_id uuid references public.coaches (id) on delete set null;

-- Replace coach_id-based artist policies with membership-based ones.
drop policy if exists "artists_select_assigned" on public.artists;
create policy "artists_select_assigned" on public.artists
  for select to authenticated
  using (
    id in (
      select ac.artist_id from public.artist_coaches ac
      join public.coaches co on co.id = ac.coach_id
      where co.user_id = (select auth.uid())
    )
  );
drop policy if exists "artists_update_assigned" on public.artists;
create policy "artists_update_assigned" on public.artists
  for update to authenticated
  using (
    id in (
      select ac.artist_id from public.artist_coaches ac
      join public.coaches co on co.id = ac.coach_id
      where co.user_id = (select auth.uid())
    )
  )
  with check (
    id in (
      select ac.artist_id from public.artist_coaches ac
      join public.coaches co on co.id = ac.coach_id
      where co.user_id = (select auth.uid())
    )
  );

-- Coaches read their assigned artists' profiles (avatars) via membership.
drop policy if exists "profiles_select_coached" on public.profiles;
create policy "profiles_select_coached" on public.profiles
  for select to authenticated
  using (
    id in (
      select a.user_id from public.artist_coaches ac
      join public.artists a on a.id = ac.artist_id
      join public.coaches co on co.id = ac.coach_id
      where co.user_id = (select auth.uid())
    )
  );

-- Coach's active artist resolves via membership now.
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
       join public.artist_coaches ac on ac.artist_id = caa.artist_id
       join public.coaches co on co.id = ac.coach_id
      where caa.coach_user_id = (select auth.uid())
        and co.user_id = (select auth.uid()))
  )
$$;
