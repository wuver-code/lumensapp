
REVOKE EXECUTE ON FUNCTION public.are_contacts(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.search_profile(text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.find_by_phones(text[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.are_contacts(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.search_profile(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.find_by_phones(text[]) TO authenticated;
