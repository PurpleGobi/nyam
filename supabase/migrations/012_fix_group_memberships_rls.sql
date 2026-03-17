-- Fix group_memberships_select infinite recursion
-- The old policy references group_memberships in its own SELECT clause,
-- causing infinite recursion and 500 errors.
-- 
-- Solution: Use a security definer function to bypass RLS when checking membership.

-- Step 1: Create a security definer function that reads without RLS
CREATE OR REPLACE FUNCTION public.get_my_group_ids()
RETURNS SETOF UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT group_id FROM group_memberships WHERE user_id = auth.uid() AND status = 'active';
$$;

-- Step 2: Fix group_memberships SELECT policy
DROP POLICY IF EXISTS "group_memberships_select" ON group_memberships;

CREATE POLICY "group_memberships_select" ON group_memberships
  FOR SELECT USING (
    user_id = auth.uid()
    OR group_id IN (SELECT public.get_my_group_ids())
  );

-- Step 3: Fix group_stats SELECT (same issue)
DROP POLICY IF EXISTS "group_stats_select" ON group_stats;

CREATE POLICY "group_stats_select" ON group_stats
  FOR SELECT USING (
    group_id IN (SELECT public.get_my_group_ids())
  );

-- Step 4: Fix record_shares SELECT (same pattern)
DROP POLICY IF EXISTS "record_shares_select" ON record_shares;

CREATE POLICY "record_shares_select" ON record_shares
  FOR SELECT USING (
    group_id IN (SELECT public.get_my_group_ids())
  );
