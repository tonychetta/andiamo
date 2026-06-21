-- ANDIAMO — 0014 invite codes, coach diagnostic, coach access to artist avatars

-- Coaches can read the profile rows of artists assigned to them (for avatars).
create policy "profiles_select_coached" on public.profiles
  for select to authenticated
  using (
    id in (
      select a.user_id
      from public.artists a
      join public.coaches co on co.id = a.coach_id
      where co.user_id = (select auth.uid())
    )
  );

-- Coach-only "why was this Task pushed?" diagnostic (Section 14.5). Never shown
-- to the artist (the UI gates it; the column just stores the note).
alter table public.tasks add column if not exists push_reason text;

-- Invite codes (Section 5.3): single-use, tier-bound, optional billing bypass.
create table public.invite_codes (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.coaches (id) on delete cascade,
  code text not null unique,
  tier public.artist_tier not null default 'diy',
  billing_bypass boolean not null default false,
  used_by uuid references auth.users (id) on delete set null,
  used_at timestamptz,
  expires_at timestamptz not null default (now() + interval '30 days'),
  created_at timestamptz not null default now()
);
create index invite_codes_coach_idx on public.invite_codes (coach_id);

alter table public.invite_codes enable row level security;

create policy "ic_select_own" on public.invite_codes
  for select to authenticated
  using (coach_id in (select id from public.coaches where user_id = (select auth.uid())));
create policy "ic_insert_own" on public.invite_codes
  for insert to authenticated
  with check (coach_id in (select id from public.coaches where user_id = (select auth.uid())));
create policy "ic_update_own" on public.invite_codes
  for update to authenticated
  using (coach_id in (select id from public.coaches where user_id = (select auth.uid())))
  with check (coach_id in (select id from public.coaches where user_id = (select auth.uid())));
create policy "ic_delete_own" on public.invite_codes
  for delete to authenticated
  using (coach_id in (select id from public.coaches where user_id = (select auth.uid())));

grant select, insert, update, delete on public.invite_codes to authenticated;
