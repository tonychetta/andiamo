-- ANDIAMO — 0017 fix RLS infinite recursion from 0016
-- The artists policy referenced artist_coaches and the artist_coaches policy
-- referenced artists, so each triggered the other's RLS → infinite recursion on
-- any query touching them. Move the membership lookups into SECURITY DEFINER
-- functions (which bypass RLS internally), so policies don't recurse. Each
-- function is scoped to auth.uid(), so it leaks nothing.

create or replace function public.my_coach_ids()
returns setof uuid language sql stable security definer set search_path = '' as $$
  select id from public.coaches where user_id = (select auth.uid())
$$;

create or replace function public.my_artist_ids()
returns setof uuid language sql stable security definer set search_path = '' as $$
  select id from public.artists where user_id = (select auth.uid())
$$;

create or replace function public.coach_artist_ids()
returns setof uuid language sql stable security definer set search_path = '' as $$
  select ac.artist_id
  from public.artist_coaches ac
  join public.coaches co on co.id = ac.coach_id
  where co.user_id = (select auth.uid())
$$;

create or replace function public.coached_user_ids()
returns setof uuid language sql stable security definer set search_path = '' as $$
  select a.user_id
  from public.artist_coaches ac
  join public.artists a on a.id = ac.artist_id
  join public.coaches co on co.id = ac.coach_id
  where co.user_id = (select auth.uid())
$$;

-- Only signed-in users may call these (they return data scoped to auth.uid(),
-- so anon would get nothing, but tighten the surface anyway).
grant execute on function public.my_coach_ids() to authenticated;
grant execute on function public.my_artist_ids() to authenticated;
grant execute on function public.coach_artist_ids() to authenticated;
grant execute on function public.coached_user_ids() to authenticated;
revoke execute on function public.my_coach_ids() from anon, public;
revoke execute on function public.my_artist_ids() from anon, public;
revoke execute on function public.coach_artist_ids() from anon, public;
revoke execute on function public.coached_user_ids() from anon, public;

-- Rewrite the recursive policies to use the helper functions.
drop policy if exists "ac_select_coach" on public.artist_coaches;
create policy "ac_select_coach" on public.artist_coaches
  for select to authenticated
  using (coach_id in (select public.my_coach_ids()));

drop policy if exists "ac_select_artist" on public.artist_coaches;
create policy "ac_select_artist" on public.artist_coaches
  for select to authenticated
  using (artist_id in (select public.my_artist_ids()));

drop policy if exists "artists_select_assigned" on public.artists;
create policy "artists_select_assigned" on public.artists
  for select to authenticated
  using (id in (select public.coach_artist_ids()));

drop policy if exists "artists_update_assigned" on public.artists;
create policy "artists_update_assigned" on public.artists
  for update to authenticated
  using (id in (select public.coach_artist_ids()))
  with check (id in (select public.coach_artist_ids()));

drop policy if exists "profiles_select_coached" on public.profiles;
create policy "profiles_select_coached" on public.profiles
  for select to authenticated
  using (id in (select public.coached_user_ids()));
