-- ANDIAMO — 0001 identity & accounts
-- Core account model: profiles (1:1 with auth.users) + artist/coach extension tables.
-- Enforces per-user data isolation via Row Level Security (Sections 5 & 18.10).
-- Applied to Supabase project rzpsngsyheacduauuigo.

-- ---------- Enums ----------
create type public.account_type as enum ('artist', 'coach');
create type public.artist_tier as enum ('free', 'self_serve', 'diy', 'dwy');
create type public.artist_status as enum (
  'awaiting_match', 'active', 'graduated', 'paused', 'departed'
);

-- ---------- Shared helper: keep updated_at fresh ----------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------- profiles (base account record, keyed to the auth user) ----------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  name text not null default '',
  profile_picture_url text,
  account_type public.account_type not null default 'artist',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- coaches ----------
create table public.coaches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles (id) on delete cascade,
  bio text,
  genre_experience text[] not null default '{}',
  production_credits text,
  philosophy text,
  is_producer boolean not null default false,
  certified_at timestamptz,
  non_circumvention_agreement_signed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- artists ----------
create table public.artists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles (id) on delete cascade,
  artist_name text not null default '',
  city text,
  country text,
  tier public.artist_tier not null default 'free',
  subscription_status text,
  status public.artist_status not null default 'awaiting_match',
  coach_id uuid references public.coaches (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index artists_coach_id_idx on public.artists (coach_id);

-- updated_at triggers
create trigger trg_profiles_updated before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger trg_coaches_updated before update on public.coaches
  for each row execute function public.set_updated_at();
create trigger trg_artists_updated before update on public.artists
  for each row execute function public.set_updated_at();

-- ---------- Auto-provision profile + role row on signup ----------
-- SECURITY DEFINER so it can write to public tables during the auth signup flow.
-- search_path pinned to '' and every name fully-qualified (security best practice).
-- Role is seeded from signup metadata here; real onboarding will set it from the
-- invite code instead. RLS never reads role from the JWT — only from these tables.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role public.account_type;
begin
  v_role := case
    when new.raw_user_meta_data ->> 'account_type' = 'coach'
      then 'coach'::public.account_type
    else 'artist'::public.account_type
  end;

  insert into public.profiles (id, email, name, account_type)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'name', ''),
    v_role
  );

  if v_role = 'coach' then
    insert into public.coaches (user_id) values (new.id);
  else
    insert into public.artists (user_id, artist_name)
    values (new.id, coalesce(new.raw_user_meta_data ->> 'name', ''));
  end if;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- Row Level Security ----------
alter table public.profiles enable row level security;
alter table public.coaches enable row level security;
alter table public.artists enable row level security;

-- profiles: a user can see and edit only their own profile row
create policy "profiles_select_own" on public.profiles
  for select to authenticated using ((select auth.uid()) = id);
create policy "profiles_update_own" on public.profiles
  for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- coaches: own row only (coach access to assigned artists is added with the Coach Portal)
create policy "coaches_select_own" on public.coaches
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "coaches_update_own" on public.coaches
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- artists: own row only (coach access added later)
create policy "artists_select_own" on public.artists
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "artists_update_own" on public.artists
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- ---------- Grants (RLS still restricts WHICH rows; these restrict WHICH columns) ----------
-- Inserts happen only via the SECURITY DEFINER trigger, so no insert grant is given.
grant select on public.profiles to authenticated;
grant update (name, profile_picture_url) on public.profiles to authenticated;

grant select on public.artists to authenticated;
grant update (artist_name, city, country) on public.artists to authenticated;

grant select on public.coaches to authenticated;
grant update (bio, genre_experience, production_credits, philosophy, is_producer)
  on public.coaches to authenticated;
