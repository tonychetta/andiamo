-- ANDIAMO — 0015 avatars storage bucket
-- Public bucket for profile pictures. Uploads happen server-side via the admin
-- client (in a trusted server action), and public read serves the avatar URLs.

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;
