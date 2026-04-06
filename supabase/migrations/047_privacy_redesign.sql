-- 047_privacy_redesign.sql
-- 프라이버시 모델 재설계: privacy_profile/privacy_records -> is_public/follow_policy
-- 단일 트랜잭션으로 실행 (RLS 공백 방지)

BEGIN;

-- ============================================================
-- Phase 1: 신규 컬럼 추가
-- ============================================================
ALTER TABLE users ADD COLUMN is_public BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE users ADD COLUMN follow_policy VARCHAR(20) NOT NULL DEFAULT 'blocked';
ALTER TABLE users ADD COLUMN follow_min_records INT;
ALTER TABLE users ADD COLUMN follow_min_level INT;

-- ============================================================
-- Phase 2: 기존 데이터 마이그레이션
-- ============================================================
UPDATE users SET
  is_public = CASE
    WHEN privacy_records = 'all' AND privacy_profile = 'public' THEN true
    ELSE false
  END,
  follow_policy = CASE
    WHEN privacy_profile = 'public' THEN 'auto_approve'
    WHEN privacy_profile = 'bubble_only' THEN 'manual_approve'
    ELSE 'blocked'
  END;

-- ============================================================
-- Phase 3: 의존 RLS 정책 먼저 DROP (컬럼 삭제 전 필수)
-- ============================================================
DROP POLICY IF EXISTS users_public ON users;
DROP POLICY IF EXISTS users_bubble ON users;
DROP POLICY IF EXISTS records_public ON records;
DROP POLICY IF EXISTS records_bubble_all ON records;
DROP POLICY IF EXISTS records_bubble_shared ON records;
DROP POLICY IF EXISTS bubble_share_insert ON bubble_shares;
DROP POLICY IF EXISTS ue_read_public ON xp_totals;
DROP POLICY IF EXISTS um_read_public ON xp_log_milestones;

-- ============================================================
-- Phase 4: 기존 CHECK + 컬럼 삭제
-- ============================================================
ALTER TABLE users DROP CONSTRAINT IF EXISTS chk_users_privacy_profile;
ALTER TABLE users DROP CONSTRAINT IF EXISTS chk_users_privacy_records;
ALTER TABLE users DROP COLUMN privacy_profile;
ALTER TABLE users DROP COLUMN privacy_records;

-- ============================================================
-- Phase 5: CHECK 제약
-- ============================================================
ALTER TABLE users ADD CONSTRAINT chk_follow_policy
  CHECK (follow_policy IN ('blocked', 'auto_approve', 'manual_approve', 'conditional'));

-- ============================================================
-- Phase 6: RLS 정책 재생성
-- ============================================================

-- 6-1. users
CREATE POLICY users_public ON users FOR SELECT USING (is_public = true);

CREATE POLICY users_bubble ON users FOR SELECT USING (
  NOT is_public
  AND id IN (
    SELECT bm2.user_id FROM bubble_members bm1
    JOIN bubble_members bm2 ON bm1.bubble_id = bm2.bubble_id
    WHERE bm1.user_id = auth.uid()
      AND bm1.status = 'active' AND bm2.status = 'active'
  )
);

-- 6-2. records
CREATE POLICY records_public ON records FOR SELECT USING (
  user_id IN (SELECT id FROM users WHERE is_public = true)
);

-- records_bubble_all 삭제만 (is_public이면 records_public이 커버)

CREATE POLICY records_bubble_shared ON records FOR SELECT USING (
  id IN (
    SELECT bs.record_id FROM bubble_shares bs
    JOIN bubble_members bm ON bs.bubble_id = bm.bubble_id
    WHERE bm.user_id = auth.uid() AND bm.status = 'active'
  )
);

-- 6-3. bubble_shares INSERT (privacy 조건 제거)
CREATE POLICY bubble_share_insert ON bubble_shares FOR INSERT WITH CHECK (
  shared_by = auth.uid()
  AND record_id IN (SELECT id FROM records WHERE user_id = auth.uid())
  AND bubble_id IN (
    SELECT bubble_id FROM bubble_members
    WHERE user_id = auth.uid() AND status = 'active' AND role IN ('owner', 'admin', 'member')
  )
);

-- 6-4. xp_totals
CREATE POLICY ue_read_public ON xp_totals FOR SELECT USING (
  user_id IN (SELECT id FROM users WHERE is_public = true)
);

-- 6-5. xp_log_milestones
CREATE POLICY um_read_public ON xp_log_milestones FOR SELECT USING (
  user_id IN (SELECT id FROM users WHERE is_public = true)
);

-- 5-6. 신규: records_followers (팔로워에게 기록 공개)
-- follow_policy != 'blocked' 조건 포함: 작성자가 blocked로 변경하면 기존 팔로워에게도 비공개
CREATE POLICY records_followers ON records FOR SELECT USING (
  user_id IN (
    SELECT f.following_id FROM follows f
    INNER JOIN users u ON u.id = f.following_id
    WHERE f.follower_id = auth.uid()
      AND f.status = 'accepted'
      AND u.follow_policy != 'blocked'
  )
);

COMMIT;
