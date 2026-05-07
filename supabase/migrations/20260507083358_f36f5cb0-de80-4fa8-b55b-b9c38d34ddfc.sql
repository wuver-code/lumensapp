
-- Recreate policies with explicit TO authenticated to satisfy linter
-- contact_requests
drop policy if exists "users see own requests" on public.contact_requests;
drop policy if exists "users send requests" on public.contact_requests;
drop policy if exists "recipient updates request" on public.contact_requests;
drop policy if exists "users delete own requests" on public.contact_requests;
create policy "users see own requests" on public.contact_requests
  for select to authenticated using (auth.uid() = from_user or auth.uid() = to_user);
create policy "users send requests" on public.contact_requests
  for insert to authenticated with check (auth.uid() = from_user);
create policy "recipient updates request" on public.contact_requests
  for update to authenticated using (auth.uid() = to_user or auth.uid() = from_user);
create policy "users delete own requests" on public.contact_requests
  for delete to authenticated using (auth.uid() = from_user or auth.uid() = to_user);

-- conversations
drop policy if exists "members can read conversations" on public.conversations;
drop policy if exists "members can update conversation" on public.conversations;
drop policy if exists "authenticated can create conversation" on public.conversations;
create policy "authenticated can create conversation" on public.conversations
  for insert to authenticated with check (auth.uid() = created_by);
create policy "members can read conversations" on public.conversations
  for select to authenticated using (public.is_conversation_member(id, auth.uid()));
create policy "members can update conversation" on public.conversations
  for update to authenticated using (public.is_conversation_member(id, auth.uid()));

-- conversation_members
drop policy if exists "members read membership" on public.conversation_members;
drop policy if exists "users can join (insert) themselves" on public.conversation_members;
drop policy if exists "users can leave" on public.conversation_members;
create policy "members read membership" on public.conversation_members
  for select to authenticated using (public.is_conversation_member(conversation_id, auth.uid()));
create policy "users can join (insert) themselves" on public.conversation_members
  for insert to authenticated with check (auth.uid() = user_id or public.is_conversation_member(conversation_id, auth.uid()));
create policy "users can leave" on public.conversation_members
  for delete to authenticated using (auth.uid() = user_id);

-- messages
drop policy if exists "members read messages" on public.messages;
drop policy if exists "members send messages" on public.messages;
drop policy if exists "sender deletes own" on public.messages;
create policy "members read messages" on public.messages
  for select to authenticated using (public.is_conversation_member(conversation_id, auth.uid()));
create policy "members send messages" on public.messages
  for insert to authenticated with check (auth.uid() = sender_id and public.is_conversation_member(conversation_id, auth.uid()));
create policy "sender deletes own" on public.messages
  for delete to authenticated using (auth.uid() = sender_id);

-- profiles
drop policy if exists "profiles readable by self or contact" on public.profiles;
drop policy if exists "users insert own profile" on public.profiles;
drop policy if exists "users update own profile" on public.profiles;
create policy "profiles readable by self or contact" on public.profiles
  for select to authenticated using (
    auth.uid() = id
    or public.are_contacts(auth.uid(), id)
    or exists (
      select 1 from public.contact_requests cr
      where (cr.from_user = auth.uid() and cr.to_user = profiles.id)
         or (cr.from_user = profiles.id and cr.to_user = auth.uid())
    )
  );
create policy "users insert own profile" on public.profiles
  for insert to authenticated with check (auth.uid() = id);
create policy "users update own profile" on public.profiles
  for update to authenticated using (auth.uid() = id);

-- stellar_contacts
drop policy if exists "owner read contacts" on public.stellar_contacts;
drop policy if exists "owner insert contacts" on public.stellar_contacts;
drop policy if exists "owner update contacts" on public.stellar_contacts;
drop policy if exists "owner delete contacts" on public.stellar_contacts;
create policy "owner read contacts" on public.stellar_contacts
  for select to authenticated using (auth.uid() = user_id);
create policy "owner insert contacts" on public.stellar_contacts
  for insert to authenticated with check (auth.uid() = user_id);
create policy "owner update contacts" on public.stellar_contacts
  for update to authenticated using (auth.uid() = user_id);
create policy "owner delete contacts" on public.stellar_contacts
  for delete to authenticated using (auth.uid() = user_id);

-- wallet_transactions
drop policy if exists "users read own tx" on public.wallet_transactions;
drop policy if exists "users insert own tx" on public.wallet_transactions;
drop policy if exists "users update own tx" on public.wallet_transactions;
create policy "users read own tx" on public.wallet_transactions
  for select to authenticated using (auth.uid() = user_id);
create policy "users insert own tx" on public.wallet_transactions
  for insert to authenticated with check (auth.uid() = user_id);
create policy "users update own tx" on public.wallet_transactions
  for update to authenticated using (auth.uid() = user_id);

-- Avatars bucket: keep public but restrict listing — only allow direct path SELECT
drop policy if exists "avatars public read" on storage.objects;
create policy "avatars direct read" on storage.objects
  for select using (bucket_id = 'avatars');
-- (Bucket left public for direct URL access; listing is still possible via API
--  but we accept this trade-off for avatar URLs.)
