-- Fix chat permission errors and add contact-safe profile view

-- 1. Grant EXECUTE on helper functions to authenticated (root cause of
--    "permission denied for function is_conversation_member")
GRANT EXECUTE ON FUNCTION public.is_conversation_member(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.are_contacts(uuid, uuid) TO authenticated;

-- 2. Contact-safe profile view (omits date_of_birth and email)
CREATE OR REPLACE VIEW public.contact_profile_view
WITH (security_invoker = on) AS
SELECT id, display_name, username, phone, wallet_address, avatar_url, public_key, created_at, updated_at
FROM public.profiles;

GRANT SELECT ON public.contact_profile_view TO authenticated;
