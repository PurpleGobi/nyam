-- bubble_items 트리거 함수에 SECURITY DEFINER 추가
-- RLS가 활성화된 bubbles/bubble_members 테이블을 UPDATE하려면 필수
-- (기존 trg_update_bubble_member_count도 SECURITY DEFINER로 동작 중)

CREATE OR REPLACE FUNCTION trg_update_bubble_item_stats()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE bubbles SET
      record_count = (SELECT COUNT(*) FROM bubble_items WHERE bubble_id = NEW.bubble_id),
      unique_target_count = (SELECT COUNT(DISTINCT target_id) FROM bubble_items WHERE bubble_id = NEW.bubble_id),
      last_activity_at = NEW.added_at
    WHERE id = NEW.bubble_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE bubbles SET
      record_count = (SELECT COUNT(*) FROM bubble_items WHERE bubble_id = OLD.bubble_id),
      unique_target_count = (SELECT COUNT(DISTINCT target_id) FROM bubble_items WHERE bubble_id = OLD.bubble_id)
    WHERE id = OLD.bubble_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

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
      JOIN records r ON r.id = bi.record_id
      WHERE bi.bubble_id = v_bubble_id AND bi.added_by = v_user_id
        AND r.satisfaction IS NOT NULL
    )
  WHERE bubble_id = v_bubble_id AND user_id = v_user_id;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 기존 불일치 데이터 일괄 수정
UPDATE bubbles b SET
  record_count = (SELECT COUNT(*) FROM bubble_items bi WHERE bi.bubble_id = b.id),
  unique_target_count = (SELECT COUNT(DISTINCT target_id) FROM bubble_items bi WHERE bi.bubble_id = b.id);
