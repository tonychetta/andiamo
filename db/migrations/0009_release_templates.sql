-- ANDIAMO — 0009 per-artist editable release templates (Section 11.7)
-- When an artist customizes their Single/Project strategy template, the edited
-- version is stored here and used for all FUTURE releases. Releases already
-- created keep their own materialized tasks (edits don't reach in-flight ones).
-- No row for a (artist, type) = they use the canonical code default.

create table public.release_templates (
  id uuid primary key default gen_random_uuid(),
  artist_id uuid not null references public.artists (id) on delete cascade,
  template_type text not null, -- 'single' | 'project' (room for day/week later)
  phases jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (artist_id, template_type)
);
create index release_templates_artist_id_idx on public.release_templates (artist_id);

create trigger trg_release_templates_updated before update on public.release_templates
  for each row execute function public.set_updated_at();

alter table public.release_templates enable row level security;

create policy "release_templates_select_own" on public.release_templates
  for select to authenticated using (artist_id = public.current_artist_id());
create policy "release_templates_insert_own" on public.release_templates
  for insert to authenticated with check (artist_id = public.current_artist_id());
create policy "release_templates_update_own" on public.release_templates
  for update to authenticated
  using (artist_id = public.current_artist_id())
  with check (artist_id = public.current_artist_id());
create policy "release_templates_delete_own" on public.release_templates
  for delete to authenticated using (artist_id = public.current_artist_id());

grant select, insert, update, delete on public.release_templates to authenticated;
