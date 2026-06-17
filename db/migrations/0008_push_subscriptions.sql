-- ANDIAMO — 0008 web-push subscriptions
-- One row per device an artist has granted notification permission on. The MGMT
-- webhook (service role) reads these to deliver push notifications; the artist
-- manages their own rows under RLS.

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  artist_id uuid not null references public.artists (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now()
);
create index push_subscriptions_artist_id_idx on public.push_subscriptions (artist_id);

alter table public.push_subscriptions enable row level security;

create policy "push_subscriptions_select_own" on public.push_subscriptions
  for select to authenticated using (artist_id = public.current_artist_id());
create policy "push_subscriptions_insert_own" on public.push_subscriptions
  for insert to authenticated with check (artist_id = public.current_artist_id());
create policy "push_subscriptions_delete_own" on public.push_subscriptions
  for delete to authenticated using (artist_id = public.current_artist_id());

grant select, insert, update, delete on public.push_subscriptions to authenticated;
