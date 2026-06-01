
create extension if not exists pgcrypto with schema extensions;

create or replace function public.find_by_phone_hashes(_hashes text[])
returns table(id uuid, display_name text, username text, phone text, avatar_url text)
language sql stable security definer set search_path = public, extensions as $$
  select id, display_name, username, phone, avatar_url
  from public.profiles
  where id <> auth.uid()
    and phone is not null
    and encode(extensions.digest(regexp_replace(phone, '\D', '', 'g'), 'sha256'), 'hex') = any(_hashes)
$$;

drop policy if exists "users can join (insert) themselves" on public.conversation_members;

create policy "members insert self or accepted contact"
on public.conversation_members
for insert to authenticated
with check (
  auth.uid() = user_id
  or public.is_conversation_member(conversation_id, auth.uid())
  or public.are_contacts(auth.uid(), user_id)
);
