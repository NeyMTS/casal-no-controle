REVOKE ALL ON FUNCTION public.is_household_member(UUID, UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.create_household(TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.join_household(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_household(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.join_household(TEXT) TO authenticated;