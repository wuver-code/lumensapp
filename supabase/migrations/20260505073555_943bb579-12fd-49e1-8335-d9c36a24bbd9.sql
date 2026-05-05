
-- Profile fields
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone text UNIQUE,
  ADD COLUMN IF NOT EXISTS public_key text;

-- Contact requests
CREATE TABLE IF NOT EXISTS public.contact_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user uuid NOT NULL,
  to_user uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','declined','blocked')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (from_user, to_user)
);

ALTER TABLE public.contact_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users see own requests" ON public.contact_requests
  FOR SELECT TO authenticated
  USING (auth.uid() = from_user OR auth.uid() = to_user);

CREATE POLICY "users send requests" ON public.contact_requests
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = from_user);

CREATE POLICY "recipient updates request" ON public.contact_requests
  FOR UPDATE TO authenticated
  USING (auth.uid() = to_user OR auth.uid() = from_user);

CREATE POLICY "users delete own requests" ON public.contact_requests
  FOR DELETE TO authenticated
  USING (auth.uid() = from_user OR auth.uid() = to_user);

-- helper: are these two users accepted contacts?
CREATE OR REPLACE FUNCTION public.are_contacts(_a uuid, _b uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.contact_requests
    WHERE status = 'accepted'
      AND ((from_user = _a AND to_user = _b) OR (from_user = _b AND to_user = _a))
  )
$$;

-- Tighten profile visibility: only self + accepted contacts + people who have a pending request with you
DROP POLICY IF EXISTS "profiles readable by authenticated" ON public.profiles;

CREATE POLICY "profiles readable by self or contact" ON public.profiles
  FOR SELECT TO authenticated
  USING (
    auth.uid() = id
    OR public.are_contacts(auth.uid(), id)
    OR EXISTS (
      SELECT 1 FROM public.contact_requests cr
      WHERE (cr.from_user = auth.uid() AND cr.to_user = id)
         OR (cr.from_user = id AND cr.to_user = auth.uid())
    )
  );

-- Search RPC: find profile by exact phone / username / wallet_address (no fuzzy listing)
CREATE OR REPLACE FUNCTION public.search_profile(_q text)
RETURNS TABLE(id uuid, display_name text, username text, phone text, wallet_address text, avatar_url text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id, display_name, username, phone, wallet_address, avatar_url
  FROM public.profiles
  WHERE id <> auth.uid()
    AND (
      lower(username) = lower(_q)
      OR phone = _q
      OR wallet_address = _q
      OR lower(coalesce(display_name,'')) = lower(_q)
    )
  LIMIT 20
$$;

-- Bulk phone lookup for "find friends from contacts"
CREATE OR REPLACE FUNCTION public.find_by_phones(_phones text[])
RETURNS TABLE(id uuid, display_name text, username text, phone text, avatar_url text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id, display_name, username, phone, avatar_url
  FROM public.profiles
  WHERE id <> auth.uid() AND phone = ANY(_phones)
$$;
