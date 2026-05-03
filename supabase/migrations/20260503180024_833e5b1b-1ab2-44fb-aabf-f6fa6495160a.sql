
-- profiles
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique,
  display_name text,
  avatar_url text,
  wallet_address text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

create policy "profiles readable by authenticated"
  on public.profiles for select to authenticated using (true);
create policy "users update own profile"
  on public.profiles for update to authenticated using (auth.uid() = id);
create policy "users insert own profile"
  on public.profiles for insert to authenticated with check (auth.uid() = id);

-- auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- conversations
create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  is_group boolean not null default false,
  name text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  last_message_at timestamptz not null default now()
);
alter table public.conversations enable row level security;

create table public.conversation_members (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (conversation_id, user_id)
);
alter table public.conversation_members enable row level security;

-- security definer helper to avoid recursive RLS
create or replace function public.is_conversation_member(_conv uuid, _user uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.conversation_members
    where conversation_id = _conv and user_id = _user
  )
$$;

create policy "members can read conversations"
  on public.conversations for select to authenticated
  using (public.is_conversation_member(id, auth.uid()));
create policy "authenticated can create conversation"
  on public.conversations for insert to authenticated
  with check (auth.uid() = created_by);
create policy "members can update conversation"
  on public.conversations for update to authenticated
  using (public.is_conversation_member(id, auth.uid()));

create policy "members read membership"
  on public.conversation_members for select to authenticated
  using (public.is_conversation_member(conversation_id, auth.uid()));
create policy "users can join (insert) themselves"
  on public.conversation_members for insert to authenticated
  with check (auth.uid() = user_id or public.is_conversation_member(conversation_id, auth.uid()));
create policy "users can leave"
  on public.conversation_members for delete to authenticated
  using (auth.uid() = user_id);

-- messages
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  kind text not null default 'text' check (kind in ('text','payment','system')),
  content text,
  payment_amount numeric,
  payment_currency text,
  payment_tx_hash text,
  created_at timestamptz not null default now()
);
alter table public.messages enable row level security;
create index on public.messages (conversation_id, created_at desc);

create policy "members read messages"
  on public.messages for select to authenticated
  using (public.is_conversation_member(conversation_id, auth.uid()));
create policy "members send messages"
  on public.messages for insert to authenticated
  with check (auth.uid() = sender_id and public.is_conversation_member(conversation_id, auth.uid()));
create policy "sender deletes own"
  on public.messages for delete to authenticated using (auth.uid() = sender_id);

-- bump conversation last_message_at
create or replace function public.bump_conversation()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.conversations set last_message_at = new.created_at where id = new.conversation_id;
  return new;
end $$;
create trigger on_message_insert
  after insert on public.messages
  for each row execute function public.bump_conversation();

-- wallet transactions log
create table public.wallet_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('send','receive','swap','buy')),
  currency text not null,
  amount numeric not null,
  counterparty text,
  tx_hash text,
  status text not null default 'pending' check (status in ('pending','confirmed','failed')),
  created_at timestamptz not null default now()
);
alter table public.wallet_transactions enable row level security;
create index on public.wallet_transactions (user_id, created_at desc);

create policy "users read own tx"
  on public.wallet_transactions for select to authenticated
  using (auth.uid() = user_id);
create policy "users insert own tx"
  on public.wallet_transactions for insert to authenticated
  with check (auth.uid() = user_id);
create policy "users update own tx"
  on public.wallet_transactions for update to authenticated
  using (auth.uid() = user_id);

-- realtime
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.conversations;
