-- ANDIAMO — 0027 task notifications only
-- Reminders simplify to one thing: Task Notifications on Mon/Wed/Fri at 9am.
-- No per-artist time, no weekly "build your WTF" nudge (that's the coach's job
-- after each meeting, not the artist's).
alter table public.notification_prefs
  rename column daily_enabled to tasks_enabled;
alter table public.notification_prefs
  rename column last_daily_on to last_sent_on;

alter table public.notification_prefs drop column if exists weekly_enabled;
alter table public.notification_prefs drop column if exists reminder_hour;
alter table public.notification_prefs drop column if exists last_weekly_on;
