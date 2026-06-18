-- ANDIAMO — 0010 Content page (Section 12)
-- Songs registry (shared by Content tagging + Results stream tracking), content
-- pieces on the calendar, their Content-Type tags, song sections, and posted
-- links with manually-entered metrics.

-- ---------- songs registry ----------
-- Every single from Releases gets a song row (auto-created on release); artists
-- can also add older catalog songs manually. Content is tagged to a song here.
create table public.songs (
  id uuid primary key default gen_random_uuid(),
  artist_id uuid not null references public.artists (id) on delete cascade,
  title text not null,
  release_id uuid references public.releases (id) on delete set null,
  original_release_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index songs_artist_id_idx on public.songs (artist_id);
create unique index songs_release_id_key on public.songs (release_id)
  where release_id is not null;

-- ---------- content type tags (artist-customizable, auto-colored) ----------
create table public.content_type_tags (
  id uuid primary key default gen_random_uuid(),
  artist_id uuid not null references public.artists (id) on delete cascade,
  name text not null,
  color text not null default '#5ff5f5',
  created_at timestamptz not null default now(),
  unique (artist_id, name)
);
create index content_type_tags_artist_id_idx on public.content_type_tags (artist_id);

-- ---------- content pieces (a planned/posted piece on a calendar day) ----------
create table public.content_pieces (
  id uuid primary key default gen_random_uuid(),
  artist_id uuid not null references public.artists (id) on delete cascade,
  scheduled_date date not null,
  song_id uuid references public.songs (id) on delete set null,
  notes text,
  song_sections text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index content_pieces_artist_id_idx on public.content_pieces (artist_id);
create index content_pieces_date_idx on public.content_pieces (scheduled_date);

-- ---------- piece <-> content type tags (a piece can have several) ----------
create table public.content_piece_types (
  content_piece_id uuid not null references public.content_pieces (id) on delete cascade,
  tag_id uuid not null references public.content_type_tags (id) on delete cascade,
  artist_id uuid not null references public.artists (id) on delete cascade,
  primary key (content_piece_id, tag_id)
);
create index content_piece_types_artist_id_idx on public.content_piece_types (artist_id);

-- ---------- posted links + metrics (manual entry in Phase 1) ----------
create table public.content_links (
  id uuid primary key default gen_random_uuid(),
  artist_id uuid not null references public.artists (id) on delete cascade,
  content_piece_id uuid not null references public.content_pieces (id) on delete cascade,
  platform text not null default '',
  url text not null default '',
  views integer,
  likes integer,
  comments integer,
  shares integer,
  saves integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index content_links_piece_idx on public.content_links (content_piece_id);
create index content_links_artist_id_idx on public.content_links (artist_id);

-- updated_at triggers
create trigger trg_songs_updated before update on public.songs
  for each row execute function public.set_updated_at();
create trigger trg_content_pieces_updated before update on public.content_pieces
  for each row execute function public.set_updated_at();
create trigger trg_content_links_updated before update on public.content_links
  for each row execute function public.set_updated_at();

-- Backfill: a song for every existing single release.
insert into public.songs (artist_id, title, release_id, original_release_date)
select artist_id, title, id, release_date
from public.releases
where release_type = 'single';

-- ---------- RLS: artist owns their own content ----------
alter table public.songs enable row level security;
alter table public.content_type_tags enable row level security;
alter table public.content_pieces enable row level security;
alter table public.content_piece_types enable row level security;
alter table public.content_links enable row level security;

create policy "songs_select_own" on public.songs
  for select to authenticated using (artist_id = public.current_artist_id());
create policy "songs_insert_own" on public.songs
  for insert to authenticated with check (artist_id = public.current_artist_id());
create policy "songs_update_own" on public.songs
  for update to authenticated using (artist_id = public.current_artist_id())
  with check (artist_id = public.current_artist_id());
create policy "songs_delete_own" on public.songs
  for delete to authenticated using (artist_id = public.current_artist_id());

create policy "ctt_select_own" on public.content_type_tags
  for select to authenticated using (artist_id = public.current_artist_id());
create policy "ctt_insert_own" on public.content_type_tags
  for insert to authenticated with check (artist_id = public.current_artist_id());
create policy "ctt_update_own" on public.content_type_tags
  for update to authenticated using (artist_id = public.current_artist_id())
  with check (artist_id = public.current_artist_id());
create policy "ctt_delete_own" on public.content_type_tags
  for delete to authenticated using (artist_id = public.current_artist_id());

create policy "cp_select_own" on public.content_pieces
  for select to authenticated using (artist_id = public.current_artist_id());
create policy "cp_insert_own" on public.content_pieces
  for insert to authenticated with check (artist_id = public.current_artist_id());
create policy "cp_update_own" on public.content_pieces
  for update to authenticated using (artist_id = public.current_artist_id())
  with check (artist_id = public.current_artist_id());
create policy "cp_delete_own" on public.content_pieces
  for delete to authenticated using (artist_id = public.current_artist_id());

create policy "cpt_select_own" on public.content_piece_types
  for select to authenticated using (artist_id = public.current_artist_id());
create policy "cpt_insert_own" on public.content_piece_types
  for insert to authenticated with check (artist_id = public.current_artist_id());
create policy "cpt_delete_own" on public.content_piece_types
  for delete to authenticated using (artist_id = public.current_artist_id());

create policy "cl_select_own" on public.content_links
  for select to authenticated using (artist_id = public.current_artist_id());
create policy "cl_insert_own" on public.content_links
  for insert to authenticated with check (artist_id = public.current_artist_id());
create policy "cl_update_own" on public.content_links
  for update to authenticated using (artist_id = public.current_artist_id())
  with check (artist_id = public.current_artist_id());
create policy "cl_delete_own" on public.content_links
  for delete to authenticated using (artist_id = public.current_artist_id());

grant select, insert, update, delete on public.songs to authenticated;
grant select, insert, update, delete on public.content_type_tags to authenticated;
grant select, insert, update, delete on public.content_pieces to authenticated;
grant select, insert, update, delete on public.content_piece_types to authenticated;
grant select, insert, update, delete on public.content_links to authenticated;
