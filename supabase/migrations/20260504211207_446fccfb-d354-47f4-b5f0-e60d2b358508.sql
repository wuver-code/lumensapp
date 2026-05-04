create table public.stellar_contacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  label text not null,
  address text not null,
  memo text,
  is_favorite boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.stellar_contacts enable row level security;
create policy "owner read contacts" on public.stellar_contacts for select to authenticated using (auth.uid() = user_id);
create policy "owner insert contacts" on public.stellar_contacts for insert to authenticated with check (auth.uid() = user_id);
create policy "owner update contacts" on public.stellar_contacts for update to authenticated using (auth.uid() = user_id);
create policy "owner delete contacts" on public.stellar_contacts for delete to authenticated using (auth.uid() = user_id);
create index stellar_contacts_user_idx on public.stellar_contacts(user_id, is_favorite desc, created_at desc);