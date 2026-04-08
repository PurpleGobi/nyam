-- 054_bubble_items_triggers.sql
-- bubble_items 트리거 생성 + 기존 bubble_shares 트리거 교체

-- 1. 기존 bubble_shares 트리거 DROP
DROP TRIGGER IF EXISTS after_bubble_share_stats ON bubble_shares;
DROP FUNCTION IF EXISTS trg_update_bubble_share_stats();

DROP TRIGGER IF EXISTS trg_bubble_share_member_stats ON bubble_shares;
DROP FUNCTION IF EXISTS trg_bubble_share_member_stats();

-- 2. bubble_items 트리거: bubbles.record_count + unique_target_count + last_activity_at
CREATE OR REPLACE FUNCTION trg_update_bubble_item_stats()
RETURNS TRIGGER AS $$
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

CREATE TRIGGER after_bubble_item_stats
  AFTER INSERT OR DELETE ON bubble_items
  FOR EACH ROW EXECUTE FUNCTION trg_update_bubble_item_stats();

-- 3. bubble_items 트리거: bubble_members 비정규화 갱신
CREATE OR REPLACE FUNCTION trg_update_bubble_member_item_stats()
RETURNS TRIGGER AS $$
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

CREATE TRIGGER after_bubble_member_item_stats
  AFTER INSERT OR DELETE ON bubble_items
  FOR EACH ROW EXECUTE FUNCTION trg_update_bubble_member_item_stats();

-- 4. bubble_shares deprecated 마킹
COMMENT ON TABLE bubble_shares IS 'DEPRECATED: bubble_items로 전환 완료. 롤백용으로 유지.';
