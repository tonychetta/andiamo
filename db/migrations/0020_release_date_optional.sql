-- ANDIAMO — 0020 optional release date
-- Let artists plan a release before its date is set. Tasks are still created
-- (so the strategy is visible), with null due dates until a date is added; then
-- changeReleaseDate computes every task's date from its stored offset.

alter table public.releases alter column release_date drop not null;
