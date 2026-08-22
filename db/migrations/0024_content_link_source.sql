-- ANDIAMO — 0024 content link source metadata
-- Imported posts carry their source identity so we can (a) mark already-imported
-- covers in the picker, (b) refresh their metrics later, and (c) show a preview
-- inside Andiamo without opening the platform.
alter table public.content_links add column if not exists external_post_id text;
alter table public.content_links add column if not exists thumbnail_url text;
alter table public.content_links add column if not exists caption text;
alter table public.content_links add column if not exists posted_at timestamptz;

-- One artist can't import the same post twice (guards the picker + dedupe).
create unique index if not exists content_links_artist_post_idx
  on public.content_links (artist_id, platform, external_post_id)
  where external_post_id is not null;
