-- ANDIAMO — 0002 harden helper functions
-- Addresses security advisor warnings on the identity migration.
-- Trigger functions are only meant to run from triggers, so they should not be
-- callable as public REST RPC endpoints. Revoking EXECUTE does NOT disable the
-- triggers (trigger invocation does not check EXECUTE privilege).

alter function public.set_updated_at() set search_path = '';

revoke execute on function public.set_updated_at() from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
