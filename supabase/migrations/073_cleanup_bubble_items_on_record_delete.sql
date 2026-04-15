-- 기록 삭제 시 auto-shared bubble_items 자동 정리 트리거
-- manual 항목은 ON DELETE SET NULL이 처리 (record_id만 NULL, 행 유지)
CREATE OR REPLACE FUNCTION trg_cleanup_bubble_items_on_record_delete()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM bubble_items
  WHERE record_id = OLD.id AND source = 'auto';
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER cleanup_bubble_items_before_record_delete
  BEFORE DELETE ON records
  FOR EACH ROW
  EXECUTE FUNCTION trg_cleanup_bubble_items_on_record_delete();

-- 기존 고아 auto bubble_items 정리 (과거 기록 삭제로 남은 것들)
DELETE FROM bubble_items
WHERE record_id IS NULL AND source = 'auto';
