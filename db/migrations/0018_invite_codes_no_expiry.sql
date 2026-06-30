-- ANDIAMO — 0018 invite codes never expire
-- Coaches send codes ahead of time; artists often sign up days later. Make
-- expiry optional (NULL = never expires) and clear it on all existing codes so
-- outstanding test codes keep working.

alter table public.invite_codes alter column expires_at drop not null;
alter table public.invite_codes alter column expires_at drop default;
update public.invite_codes set expires_at = null;
