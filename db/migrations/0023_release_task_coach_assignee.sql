-- ANDIAMO — 0023 release task coach assignee
-- Release tasks can be assigned to a specific coach (null = the artist),
-- mirroring milestone/WTF task assignment.
alter table public.release_tasks
  add column if not exists assigned_coach_id uuid references public.coaches(id) on delete set null;
