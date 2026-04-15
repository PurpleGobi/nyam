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

-- 2) record_id 컬럼 제거
ALTER TABLE bubble_items DROP COLUMN IF EXISTS record_id;
