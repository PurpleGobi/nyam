-- 044_fix_bubble_triggers_and_stats.sql
-- 버블 멤버 카운트 트리거 RLS 우회 + 멤버 통계 갱신 트리거 추가
--
-- 문제: 비-owner가 bubble_members INSERT 시 트리거가 bubbles.member_count를
-- UPDATE 하려 하지만, bubble_update RLS가 owner만 허용 → 조용히 실패.
-- 해결: 트리거 함수에 SECURITY DEFINER 적용 (트리거는 사용자가 직접 호출
-- 불가하므로 RLS 우회 보안 위험 없음).

------------------------------------------------------------
-- 1. bubble member/follower count 트리거 재생성 (SECURITY DEFINER)
------------------------------------------------------------
CREATE OR REPLACE FUNCTION trg_update_bubble_member_count()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_old_is_member BOOLEAN := false;
  v_new_is_member BOOLEAN := false;
  v_old_is_follower BOOLEAN := false;
  v_new_is_follower BOOLEAN := false;
BEGIN
  IF TG_OP IN ('UPDATE', 'DELETE') THEN
    v_old_is_member   := OLD.status = 'active' AND OLD.role IN ('owner', 'admin', 'member');
    v_old_is_follower := OLD.status = 'active' AND OLD.role = 'follower';
  END IF;
  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    v_new_is_member   := NEW.status = 'active' AND NEW.role IN ('owner', 'admin', 'member');
    v_new_is_follower := NEW.status = 'active' AND NEW.role = 'follower';
  END IF;

  IF NOT v_old_is_member AND v_new_is_member THEN
    UPDATE bubbles SET member_count = member_count + 1 WHERE id = NEW.bubble_id;
  ELSIF v_old_is_member AND NOT v_new_is_member THEN
    UPDATE bubbles SET member_count = member_count - 1 WHERE id = COALESCE(NEW.bubble_id, OLD.bubble_id);
  END IF;

  IF NOT v_old_is_follower AND v_new_is_follower THEN
    UPDATE bubbles SET follower_count = follower_count + 1 WHERE id = NEW.bubble_id;
  ELSIF v_old_is_follower AND NOT v_new_is_follower THEN
    UPDATE bubbles SET follower_count = follower_count - 1 WHERE id = COALESCE(NEW.bubble_id, OLD.bubble_id);
  END IF;

  RETURN NULL;
END;
$$;

------------------------------------------------------------
-- 2. bubble share stats 트리거 재생성 (SECURITY DEFINER)
------------------------------------------------------------
CREATE OR REPLACE FUNCTION trg_update_bubble_share_stats()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE bubbles SET
      record_count = record_count + 1,
      last_activity_at = NEW.shared_at
    WHERE id = NEW.bubble_id;
    -- 멤버별 통계 갱신
    UPDATE bubble_members SET
      member_unique_target_count = (
        SELECT COUNT(DISTINCT target_id)
        FROM bubble_shares
        WHERE bubble_id = NEW.bubble_id AND shared_by = NEW.shared_by
      ),
      weekly_share_count = (
        SELECT COUNT(*)
        FROM bubble_shares
        WHERE bubble_id = NEW.bubble_id
          AND shared_by = NEW.shared_by
          AND shared_at >= NOW() - INTERVAL '7 days'
      ),
      avg_satisfaction = (
        SELECT AVG(r.satisfaction)
        FROM bubble_shares bs
        JOIN records r ON r.id = bs.record_id
        WHERE bs.bubble_id = NEW.bubble_id AND bs.shared_by = NEW.shared_by
          AND r.satisfaction IS NOT NULL
      )
    WHERE bubble_id = NEW.bubble_id AND user_id = NEW.shared_by;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE bubbles SET record_count = record_count - 1 WHERE id = OLD.bubble_id;
    -- 멤버별 통계 재계산
    UPDATE bubble_members SET
      member_unique_target_count = (
        SELECT COUNT(DISTINCT target_id)
        FROM bubble_shares
        WHERE bubble_id = OLD.bubble_id AND shared_by = OLD.shared_by
      ),
      weekly_share_count = (
        SELECT COUNT(*)
        FROM bubble_shares
        WHERE bubble_id = OLD.bubble_id
          AND shared_by = OLD.shared_by
          AND shared_at >= NOW() - INTERVAL '7 days'
      ),
      avg_satisfaction = (
        SELECT AVG(r.satisfaction)
        FROM bubble_shares bs
        JOIN records r ON r.id = bs.record_id
        WHERE bs.bubble_id = OLD.bubble_id AND bs.shared_by = OLD.shared_by
          AND r.satisfaction IS NOT NULL
      )
    WHERE bubble_id = OLD.bubble_id AND user_id = OLD.shared_by;
  END IF;
  RETURN NULL;
END;
$$;

------------------------------------------------------------
-- 3. 기존 데이터 정합성 복구: member_count 재계산
------------------------------------------------------------
UPDATE bubbles SET member_count = sub.cnt
FROM (
  SELECT bubble_id, COUNT(*) AS cnt
  FROM bubble_members
  WHERE status = 'active' AND role IN ('owner', 'admin', 'member')
  GROUP BY bubble_id
) sub
WHERE bubbles.id = sub.bubble_id;

-- follower_count 재계산
UPDATE bubbles SET follower_count = COALESCE(sub.cnt, 0)
FROM (
  SELECT bubble_id, COUNT(*) AS cnt
  FROM bubble_members
  WHERE status = 'active' AND role = 'follower'
  GROUP BY bubble_id
) sub
WHERE bubbles.id = sub.bubble_id;

------------------------------------------------------------
-- 4. 기존 멤버 통계 일괄 재계산
------------------------------------------------------------
UPDATE bubble_members bm SET
  member_unique_target_count = COALESCE(sub.unique_targets, 0),
  weekly_share_count = COALESCE(sub.weekly_shares, 0),
  avg_satisfaction = sub.avg_sat
FROM (
  SELECT
    bs.bubble_id,
    bs.shared_by,
    COUNT(DISTINCT bs.target_id) AS unique_targets,
    COUNT(*) FILTER (WHERE bs.shared_at >= NOW() - INTERVAL '7 days') AS weekly_shares,
    AVG(r.satisfaction) FILTER (WHERE r.satisfaction IS NOT NULL) AS avg_sat
  FROM bubble_shares bs
  LEFT JOIN records r ON r.id = bs.record_id
  GROUP BY bs.bubble_id, bs.shared_by
) sub
WHERE bm.bubble_id = sub.bubble_id AND bm.user_id = sub.shared_by;
