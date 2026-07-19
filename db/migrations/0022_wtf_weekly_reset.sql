-- ANDIAMO — 0022 WTF weekly reset
-- WTF membership becomes week-scoped: a task is on a given week's WTF only if
-- its wtf_week matches that week. New weeks start blank; "Push to Next Week" and
-- "Complete and Push" advance a task's wtf_week forward so those (and only
-- those) carry into the next week.
alter table public.tasks add column if not exists wtf_week date;

-- Reset the current board to blank (this is a fresh-start feature; existing
-- on_wtf flags predate week-scoping and would otherwise linger).
update public.tasks set on_wtf = false, wtf_priority = false where on_wtf = true;
