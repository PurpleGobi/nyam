-- 034_rls_security_fixes.sql
-- RLS 보안 취약점 3건 수정

-- ============================================================
-- Fix #1: bubble_members INSERT — role 자기 지정 방지
-- 기존: user_id = auth.uid()만 체크 → owner/admin 자기 부여 가능
-- 수정: member, follower, pending만 허용
-- ============================================================
DROP POLICY IF EXISTS bm_insert_self ON bubble_members;
CREATE POLICY bm_insert_self ON bubble_members FOR INSERT
WITH CHECK (
  user_id = auth.uid()
  AND role IN ('member', 'follower', 'pending')
);

-- ============================================================
-- Fix #2: bubble_members UPDATE self — role 자기 승격 방지
-- RLS는 컬럼 단위 제한 불가 → BEFORE UPDATE 트리거로 보완
-- ============================================================
CREATE OR REPLACE FUNCTION prevent_role_self_promotion()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- 자기 자신의 role 변경만 차단
  -- admin/owner가 타인 role 변경은 허용 (OLD.user_id != auth.uid())
  -- service_role(auth.uid() = NULL)도 허용
  IF NEW.role IS DISTINCT FROM OLD.role
     AND OLD.user_id = auth.uid() THEN
    RAISE EXCEPTION 'Cannot change your own role';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER before_bubble_member_role_change
  BEFORE UPDATE ON bubble_members
  FOR EACH ROW EXECUTE FUNCTION prevent_role_self_promotion();

-- ============================================================
-- Fix #3: increment_user_total_xp — delta 상한 추가
-- 클라이언트(auth.uid() != NULL): 0~500 제한
-- service_role(Edge Function): 제한 없음
-- ============================================================
CREATE OR REPLACE FUNCTION increment_user_total_xp(
  p_user_id UUID,
  p_xp_delta INT
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND (p_xp_delta < 0 OR p_xp_delta > 500) THEN
    RAISE EXCEPTION 'XP delta must be between 0 and 500, got %', p_xp_delta;
  END IF;

  UPDATE users
  SET total_xp = total_xp + p_xp_delta,
      updated_at = NOW()
  WHERE id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User % not found', p_user_id;
  END IF;
END;
$$;
