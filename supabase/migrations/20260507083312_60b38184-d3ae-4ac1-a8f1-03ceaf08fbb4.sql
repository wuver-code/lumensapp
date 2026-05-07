
-- Profile additions
alter table public.profiles add column if not exists date_of_birth date;
alter table public.profiles add column if not exists email text;

-- PIN table
create table if not exists public.user_pins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  pin_hash text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.user_pins enable row level security;
drop policy if exists "owner manages pin" on public.user_pins;
create policy "owner manages pin" on public.user_pins
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Avatars bucket
insert into storage.buckets (id, name, public)
values ('avatars','avatars', true)
on conflict (id) do nothing;

drop policy if exists "avatars public read" on storage.objects;
create policy "avatars public read" on storage.objects
  for select using (bucket_id = 'avatars');

drop policy if exists "users upload own avatar" on storage.objects;
create policy "users upload own avatar" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);

drop policy if exists "users update own avatar" on storage.objects;
create policy "users update own avatar" on storage.objects
  for update to authenticated
  using (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);

drop policy if exists "users delete own avatar" on storage.objects;
create policy "users delete own avatar" on storage.objects
  for delete to authenticated
  using (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);

-- Revoke from anon on sensitive tables
revoke all on public.contact_requests from anon;
revoke all on public.conversations from anon;
revoke all on public.conversation_members from anon;
revoke all on public.messages from anon;
revoke all on public.stellar_contacts from anon;
revoke all on public.wallet_transactions from anon;
revoke all on public.profiles from anon;
revoke all on public.user_pins from anon;
