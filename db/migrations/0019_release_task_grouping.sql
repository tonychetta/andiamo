-- ANDIAMO — 0019 release task grouping
-- The single-release strategy now organizes weeks under 4 named Phases, and each
-- week carries a title. Carry both onto materialized release tasks so a real
-- release renders the same Phase separators + week titles as the template.

alter table public.release_tasks add column if not exists phase_group text not null default '';
alter table public.release_tasks add column if not exists week_title text not null default '';
