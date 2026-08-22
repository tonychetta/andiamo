-- ANDIAMO — 0025 fix content_links upsert index
-- The partial predicate made this index unusable for ON CONFLICT (PostgREST
-- can't express the WHERE clause), so imports failed with "no unique or
-- exclusion constraint matching the ON CONFLICT specification". A plain unique
-- index still allows unlimited rows with a NULL external_post_id, because NULLs
-- compare as distinct — so we lose nothing by dropping the predicate.
drop index if exists public.content_links_artist_post_idx;
create unique index content_links_artist_post_idx
  on public.content_links (artist_id, platform, external_post_id);
