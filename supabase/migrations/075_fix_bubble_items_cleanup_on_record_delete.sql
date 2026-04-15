-- 기록 삭제 시 bubble_items 정리 트리거 개선
-- 기존 073 트리거를 대체: source 무관하게, 해당 타겟에 남은 기록이 없으면 bubble_item 삭제
DROP TRIGGER IF EXISTS cleanup_bubble_items_before_record_delete ON records;
DROP FUNCTION IF EXISTS trg_cleanup_bubble_items_on_record_delete();

CREATE OR REPLACE FUNCTION trg_cleanup_bubble_items_on_record_delete()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- 1) record_id로 직접 연결된 bubble_items 삭제 (auto/manual 무관)
  DELETE FROM bubble_items WHERE record_id = OLD.id;

  -- 2) 같은 타겟에 남은 기록이 없는 bubble_items도 삭제
  --    (record_id=null인 수동 추가 항목이지만, 해당 유저의 기록이 0개면 제거)
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
