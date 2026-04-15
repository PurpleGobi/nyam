-- bubble_items.added_by 컬럼 완전 제거
-- 배포 순서: 마이그레이션 먼저 적용 → 코드 변경
-- 마이그레이션 내부 순서:
--   (0) NOT NULL 제거 (안전망 — 코드 배포 전 INSERT 호환성)
--   (1) 트리거 재작성
--   (2) RLS 재작성
--   (3) 인덱스/FK 삭제
--   (4) 컬럼 DROP

-- ============================================================
-- 0) added_by NOT NULL 해제 (안전망)
--    코드가 아직 added_by를 보내는 상태에서도,
--    또는 코드가 이미 added_by를 안 보내는 상태에서도 INSERT 성공
-- ============================================================
ALTER TABLE bubble_items ALTER COLUMN added_by DROP NOT NULL;

-- ============================================================
-- 1) 기록 삭제 트리거 재작성 (FR-03)
--    기존: added_by = OLD.user_id 개인 단위 체크
--    변경: "해당 타겟에 이 버블의 활성 멤버 중 아무도 기록 없으면" bubble_item 삭제
-- ============================================================
DROP TRIGGER IF EXISTS cleanup_bubble_items_before_record_delete ON records;
DROP FUNCTION IF EXISTS trg_cleanup_bubble_items_on_record_delete();

CREATE OR REPLACE FUNCTION trg_cleanup_bubble_items_on_record_delete()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM bubble_items bi
  WHERE bi.target_id = OLD.target_id
    AND bi.target_type = OLD.target_type
    AND NOT EXISTS (
      SELECT 1 FROM records r
      JOIN bubble_members bm
        ON bm.bubble_id = bi.bubble_id
        AND bm.user_id = r.user_id
        AND bm.status = 'active'
      WHERE r.target_id = OLD.target_id
        AND r.target_type = OLD.target_type
        AND r.id != OLD.id
    );
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER cleanup_bubble_items_before_record_delete
  BEFORE DELETE ON records
  FOR EACH ROW
  EXECUTE FUNCTION trg_cleanup_bubble_items_on_record_delete();

-- ============================================================
-- 2) 멤버 탈퇴 트리거 신규 (FR-04)
--    bubble_members.status가 active에서 다른 값으로 변경될 때
--    탈퇴 멤버의 기록 타겟 중 다른 활성 멤버 기록이 없으면 bubble_item 삭제
-- ============================================================
CREATE OR REPLACE FUNCTION trg_cleanup_bubble_items_on_member_leave()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.status = 'active' AND NEW.status != 'active' THEN
    DELETE FROM bubble_items bi
    WHERE bi.bubble_id = OLD.bubble_id
      AND EXISTS (
        SELECT 1 FROM records r
        WHERE r.target_id = bi.target_id
          AND r.target_type = bi.target_type
          AND r.user_id = OLD.user_id
      )
      AND NOT EXISTS (
        SELECT 1 FROM records r
        JOIN bubble_members bm
          ON bm.bubble_id = bi.bubble_id
          AND bm.user_id = r.user_id
          AND bm.status = 'active'
        WHERE r.target_id = bi.target_id
          AND r.target_type = bi.target_type
          AND bm.user_id != OLD.user_id
      );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER cleanup_bubble_items_on_member_leave
  AFTER UPDATE OF status ON bubble_members
  FOR EACH ROW
  WHEN (OLD.status = 'active' AND NEW.status != 'active')
  EXECUTE FUNCTION trg_cleanup_bubble_items_on_member_leave();

-- ============================================================
-- 3) member_item_stats 트리거 재작성 (FR-09)
--    added_by 없이 멤버별 통계 산출
--    성능 최적화: 해당 타겟에 기록이 있는 멤버만 갱신 (FAIL #5 반영)
-- ============================================================
DROP TRIGGER IF EXISTS update_bubble_member_item_stats ON bubble_items;
DROP FUNCTION IF EXISTS trg_update_bubble_member_item_stats();

CREATE OR REPLACE FUNCTION trg_update_bubble_member_item_stats()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_bubble_id UUID;
  v_target_id UUID;
  v_target_type TEXT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_bubble_id := NEW.bubble_id;
    v_target_id := NEW.target_id;
    v_target_type := NEW.target_type;
  ELSE
    v_bubble_id := OLD.bubble_id;
    v_target_id := OLD.target_id;
    v_target_type := OLD.target_type;
  END IF;

  -- 성능 최적화: 해당 타겟에 기록이 있는 활성 멤버만 갱신
  -- (수백 명 버블에서 전체 멤버 UPDATE 방지 — FAIL #5 반영)
  UPDATE bubble_members bm SET
    member_unique_target_count = (
      SELECT COUNT(DISTINCT bi.target_id)
      FROM bubble_items bi
      JOIN records r ON r.target_id = bi.target_id
        AND r.target_type = bi.target_type
        AND r.user_id = bm.user_id
      WHERE bi.bubble_id = v_bubble_id
    ),
    weekly_share_count = (
      SELECT COUNT(DISTINCT bi.target_id)
      FROM bubble_items bi
      JOIN records r ON r.target_id = bi.target_id
        AND r.target_type = bi.target_type
        AND r.user_id = bm.user_id
      WHERE bi.bubble_id = v_bubble_id
        AND r.created_at >= NOW() - INTERVAL '7 days'
    ),
    avg_satisfaction = (
      SELECT AVG(r.satisfaction)
      FROM bubble_items bi
      JOIN records r ON r.target_id = bi.target_id
        AND r.target_type = bi.target_type
        AND r.user_id = bm.user_id
      WHERE bi.bubble_id = v_bubble_id
        AND r.satisfaction IS NOT NULL
    )
  WHERE bm.bubble_id = v_bubble_id
    AND bm.status = 'active'
    -- 성능 게이트: 변경된 타겟에 기록이 있는 멤버만 갱신
    AND EXISTS (
      SELECT 1 FROM records r
      WHERE r.user_id = bm.user_id
        AND r.target_id = v_target_id
        AND r.target_type = v_target_type
    );

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_bubble_member_item_stats
  AFTER INSERT OR DELETE ON bubble_items
  FOR EACH ROW
  EXECUTE FUNCTION trg_update_bubble_member_item_stats();

-- ============================================================
-- 4) RLS DELETE 정책 재작성 (FR-10)
--    added_by 제거 후: 활성 멤버(member 이상)면 삭제 가능
--    보안 수준 변경 인지: 기존 "본인이 추가한 항목만 삭제" → "활성 멤버면 삭제 가능"
--    근거: bubble_items는 타겟 단위 큐레이션이므로 개인 소유 개념 제거됨
-- ============================================================
DROP POLICY IF EXISTS "bubble_items_delete" ON bubble_items;
CREATE POLICY "bubble_items_delete" ON bubble_items
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM bubble_members bm
      WHERE bm.bubble_id = bubble_items.bubble_id
        AND bm.user_id = auth.uid()
        AND bm.status = 'active'
        AND bm.role IN ('owner', 'admin', 'member')
    )
  );

-- ============================================================
-- 5) 인덱스 삭제 + 컬럼 DROP
-- ============================================================
DROP INDEX IF EXISTS idx_bubble_items_added_by;
ALTER TABLE bubble_items DROP COLUMN IF EXISTS added_by;

-- ============================================================
-- 6) 성능 인덱스 추가 (NFR-01, NFR-02)
--    트리거의 EXISTS 서브쿼리 가속
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_records_target_user
  ON records(target_id, target_type, user_id);

CREATE INDEX IF NOT EXISTS idx_bubble_members_bubble_status_user
  ON bubble_members(bubble_id, status, user_id);
