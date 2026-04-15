-- bubble_items.record_id 컬럼 제거
-- 기록 삭제 시 정리 트리거도 target_id 기반으로 개선

-- 1) 기존 트리거 교체 (record_id 참조 제거)
DROP TRIGGER IF EXISTS cleanup_bubble_items_before_record_delete ON records;
DROP FUNCTION IF EXISTS trg_cleanup_bubble_items_on_record_delete();

CREATE OR REPLACE FUNCTION trg_cleanup_bubble_items_on_record_delete()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- 같은 타겟에 남은 기록이 없으면 bubble_items 삭제
  DELETE FROM bubble_items bi
  WHERE bi.target_id = OLD.target_id
    AND bi.target_type = OLD.target_type
    AND bi.added_by = OLD.user_id
    AND NOT EXISTS (
      SELECT 1 FROM records r
      WHERE r.target_id = OLD.target_id
        AND r.target_type = OLD.target_type
        AND r.user_id = OLD.user_id
        AND r.id != OLD.id
    );
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER cleanup_bubble_items_before_record_delete
  BEFORE DELETE ON records
  FOR EACH ROW
  EXECUTE FUNCTION trg_cleanup_bubble_items_on_record_delete();

-- 2) member stats 트리거도 record_id 참조 제거 (target_id + user_id 기반으로)
CREATE OR REPLACE FUNCTION trg_update_bubble_member_item_stats()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_bubble_id UUID;
  v_user_id UUID;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_bubble_id := NEW.bubble_id;
    v_user_id := NEW.added_by;
  ELSE
    v_bubble_id := OLD.bubble_id;
    v_user_id := OLD.added_by;
  END IF;

  UPDATE bubble_members SET
    member_unique_target_count = (
      SELECT COUNT(DISTINCT target_id)
      FROM bubble_items
      WHERE bubble_id = v_bubble_id AND added_by = v_user_id
    ),
    weekly_share_count = (
      SELECT COUNT(*)
      FROM bubble_items
      WHERE bubble_id = v_bubble_id
        AND added_by = v_user_id
        AND added_at >= NOW() - INTERVAL '7 days'
    ),
    avg_satisfaction = (
      SELECT AVG(r.satisfaction)
      FROM bubble_items bi
      JOIN records r ON r.target_id = bi.target_id
        AND r.target_type = bi.target_type
        AND r.user_id = bi.added_by
      WHERE bi.bubble_id = v_bubble_id AND bi.added_by = v_user_id
        AND r.satisfaction IS NOT NULL
    )
  WHERE bubble_id = v_bubble_id AND user_id = v_user_id;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 3) record_id 컬럼 제거
ALTER TABLE bubble_items DROP COLUMN IF EXISTS record_id;

-- 4) 기존 고아 bubble_items 정리 + 캐시 보정
DELETE FROM bubble_items bi
WHERE NOT EXISTS (
  SELECT 1 FROM records r
  WHERE r.target_id = bi.target_id
    AND r.target_type = bi.target_type
    AND r.user_id = bi.added_by
);

UPDATE bubbles b SET
  record_count = (SELECT COUNT(*) FROM bubble_items bi WHERE bi.bubble_id = b.id),
  unique_target_count = (SELECT COUNT(DISTINCT target_id) FROM bubble_items bi WHERE bi.bubble_id = b.id);
