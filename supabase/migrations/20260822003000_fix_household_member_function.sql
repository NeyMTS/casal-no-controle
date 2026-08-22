CREATE OR REPLACE FUNCTION public.is_household_member(
  _household_id UUID,
  _user_id UUID
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.household_members
    WHERE household_id = _household_id
      AND user_id = _user_id
  )
$$;

REVOKE ALL ON FUNCTION public.is_household_member(UUID, UUID)
FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.is_household_member(UUID, UUID)
TO authenticated;
