-- ANDIAMO — 0005 task status
-- The four weekly statuses a Task can be marked with (Section 14.5).
-- 'pending' is the default (not yet marked).

create type public.task_status as enum (
  'pending', 'completed', 'pushed', 'complete_and_push'
);

alter table public.tasks
  add column status public.task_status not null default 'pending';
