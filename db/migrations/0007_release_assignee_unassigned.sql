-- ANDIAMO — 0007 releases: tasks start UNASSIGNED
-- Assignment (artist vs producer) is a manual step done during a meeting, and
-- only for DWY-plan artists — never auto-applied from the template. Add an
-- 'unassigned' state and make it the default for release tasks.

alter type public.release_assignee add value if not exists 'unassigned';

alter table public.release_tasks
  alter column assigned_to set default 'unassigned';
