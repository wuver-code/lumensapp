
-- Auto-fill created_by from auth.uid() so the INSERT WITH CHECK always matches
CREATE OR REPLACE FUNCTION public.set_conversation_creator()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.created_by IS NULL THEN
    NEW.created_by := auth.uid();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_conversation_creator ON public.conversations;
CREATE TRIGGER trg_set_conversation_creator
BEFORE INSERT ON public.conversations
FOR EACH ROW EXECUTE FUNCTION public.set_conversation_creator();

-- Loosen INSERT WITH CHECK: any authenticated user, with optional created_by guard
DROP POLICY IF EXISTS "authenticated can create conversation" ON public.conversations;
CREATE POLICY "authenticated can create conversation"
ON public.conversations FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL
  AND (created_by IS NULL OR created_by = auth.uid())
);

-- Let the creator read & update the conversation they just made (before members exist)
DROP POLICY IF EXISTS "creator can read own conversation" ON public.conversations;
CREATE POLICY "creator can read own conversation"
ON public.conversations FOR SELECT TO authenticated
USING (created_by = auth.uid() OR is_conversation_member(id, auth.uid()));

DROP POLICY IF EXISTS "members can read conversations" ON public.conversations;

DROP POLICY IF EXISTS "creator can update own conversation" ON public.conversations;
CREATE POLICY "creator can update own conversation"
ON public.conversations FOR UPDATE TO authenticated
USING (created_by = auth.uid() OR is_conversation_member(id, auth.uid()));

DROP POLICY IF EXISTS "members can update conversation" ON public.conversations;
