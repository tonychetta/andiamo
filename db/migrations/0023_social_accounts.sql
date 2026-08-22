-- ANDIAMO — 0023 connected social accounts
-- Connected social platform accounts (Instagram first). Holds OAuth tokens, so
-- RLS is enabled with NO policies: the client can never read this table at all.
-- Every access goes through the service-role admin client in trusted server code.
create table if not exists public.social_accounts (
  id uuid primary key default gen_random_uuid(),
  artist_id uuid not null references public.artists(id) on delete cascade,
  platform text not null,
  external_user_id text not null,
  username text,
  access_token text not null,
  token_expires_at timestamptz,
  scopes text,
  last_synced_at timestamptz,
  connected_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (artist_id, platform)
);

create index if not exists social_accounts_artist_idx on public.social_accounts(artist_id);

alter table public.social_accounts enable row level security;
-- Intentionally no policies and no grants to anon/authenticated.
revoke all on public.social_accounts from anon, authenticated;

create trigger trg_social_accounts_updated
  before update on public.social_accounts
  for each row execute function public.set_updated_at();
