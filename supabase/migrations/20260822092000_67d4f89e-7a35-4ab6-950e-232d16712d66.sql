-- Remove execução pública/anônima das funções SECURITY DEFINER
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.create_household(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.join_household(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_household_member(uuid, uuid) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.create_household(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.join_household(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_household_member(uuid, uuid) TO authenticated;