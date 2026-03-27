-- 011_triggers.sql
-- Nyam v2: 비정규화 트리거 함수
-- SSOT: DATA_MODEL.md §10
-- 모든 트리거는 SET col = col +/- 1 증분 방식. 서브쿼리 전체 카운트 재계산 금지.

------------------------------------------------------------
-- 1. users.record_count: records INSERT/DELETE 시
------------------------------------------------------------
CREATE OR REPLACE FUNCTION trg_update_user_record_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE users SET record_count = record_count + 1 WHERE id = NEW.user_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE users SET record_count = record_count - 1 WHERE id = OLD.user_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER after_record_count
  AFTER INSERT OR DELETE ON records
  FOR EACH ROW EXECUTE FUNCTION trg_update_user_record_count();

------------------------------------------------------------
-- 2. users.follower_count / following_count: follows INSERT/UPDATE/DELETE 시
------------------------------------------------------------
CREATE OR REPLACE FUNCTION trg_update_follow_counts()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.status = 'accepted' THEN
    UPDATE users SET follower_count = follower_count + 1 WHERE id = NEW.following_id;
    UPDATE users SET following_count = following_count + 1 WHERE id = NEW.follower_id;
  ELSIF TG_OP = 'DELETE' AND OLD.status = 'accepted' THEN
    UPDATE users SET follower_count = follower_count - 1 WHERE id = OLD.following_id;
    UPDATE users SET following_count = following_count - 1 WHERE id = OLD.follower_id;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status != 'accepted' AND NEW.status = 'accepted' THEN
      UPDATE users SET follower_count = follower_count + 1 WHERE id = NEW.following_id;
      UPDATE users SET following_count = following_count + 1 WHERE id = NEW.follower_id;
    ELSIF OLD.status = 'accepted' AND NEW.status != 'accepted' THEN
      UPDATE users SET follower_count = follower_count - 1 WHERE id = NEW.following_id;
      UPDATE users SET following_count = following_count - 1 WHERE id = NEW.follower_id;
    END IF;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER after_follow_counts
  AFTER INSERT OR UPDATE OR DELETE ON follows
  FOR EACH ROW EXECUTE FUNCTION trg_update_follow_counts();

------------------------------------------------------------
-- 3. bubbles.member_count + follower_count: bubble_members INSERT/UPDATE/DELETE 시
------------------------------------------------------------
CREATE OR REPLACE FUNCTION trg_update_bubble_member_count()
RETURNS TRIGGER AS $$
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

  -- member_count 증감
  IF NOT v_old_is_member AND v_new_is_member THEN
    UPDATE bubbles SET member_count = member_count + 1 WHERE id = NEW.bubble_id;
  ELSIF v_old_is_member AND NOT v_new_is_member THEN
    UPDATE bubbles SET member_count = member_count - 1 WHERE id = COALESCE(NEW.bubble_id, OLD.bubble_id);
  END IF;

  -- follower_count 증감
  IF NOT v_old_is_follower AND v_new_is_follower THEN
    UPDATE bubbles SET follower_count = follower_count + 1 WHERE id = NEW.bubble_id;
  ELSIF v_old_is_follower AND NOT v_new_is_follower THEN
    UPDATE bubbles SET follower_count = follower_count - 1 WHERE id = COALESCE(NEW.bubble_id, OLD.bubble_id);
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER after_bubble_member_count
  AFTER INSERT OR UPDATE OR DELETE ON bubble_members
  FOR EACH ROW EXECUTE FUNCTION trg_update_bubble_member_count();

------------------------------------------------------------
-- 4. bubbles.record_count + last_activity_at: bubble_shares INSERT/DELETE 시
------------------------------------------------------------
CREATE OR REPLACE FUNCTION trg_update_bubble_share_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE bubbles SET
      record_count = record_count + 1,
      last_activity_at = NEW.shared_at
    WHERE id = NEW.bubble_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE bubbles SET record_count = record_count - 1 WHERE id = OLD.bubble_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER after_bubble_share_stats
  AFTER INSERT OR DELETE ON bubble_shares
  FOR EACH ROW EXECUTE FUNCTION trg_update_bubble_share_stats();
