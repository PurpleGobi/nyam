-- 030: 버블 자동 공유 규칙 시스템
-- bubble_members에 share_rule JSONB 추가
-- bubble_shares에 auto_synced 플래그 추가

-- 1. 멤버별 자동 공유 규칙
ALTER TABLE bubble_members
ADD COLUMN IF NOT EXISTS share_rule JSONB DEFAULT NULL;

COMMENT ON COLUMN bubble_members.share_rule IS
  '자동 공유 규칙. NULL=공유안함, {"mode":"all"}=전체, {"mode":"filtered","conjunction":"and","rules":[...]}=조건부';

-- 2. 자동 동기화 여부 구분
ALTER TABLE bubble_shares
ADD COLUMN IF NOT EXISTS auto_synced BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN bubble_shares.auto_synced IS '자동 공유 규칙에 의해 동기화된 공유 여부';

-- 3. 자동 동기화된 공유를 빠르게 조회하기 위한 인덱스
CREATE INDEX IF NOT EXISTS idx_bubble_shares_auto_synced
  ON bubble_shares (bubble_id, shared_by) WHERE auto_synced = true;
