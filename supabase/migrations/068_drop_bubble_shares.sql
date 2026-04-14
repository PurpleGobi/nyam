-- bubble_shares 완전 제거 — bubble_items로 전환 완료
-- 관련 트리거/RLS/테이블 일괄 정리

-- 1. bubble_shares 트리거 제거 (존재할 경우)
DROP TRIGGER IF EXISTS after_bubble_share_stats ON bubble_shares;
DROP TRIGGER IF EXISTS trg_bubble_share_member_stats ON bubble_shares;

-- 2. bubble_shares RLS 정책 제거
DROP POLICY IF EXISTS "bubble_share_read" ON bubble_shares;
DROP POLICY IF EXISTS "bubble_share_insert" ON bubble_shares;
DROP POLICY IF EXISTS "bubble_share_delete" ON bubble_shares;

-- 3. bubble_share_reads 테이블 제거 (bubble_shares 의존)
DROP TABLE IF EXISTS bubble_share_reads CASCADE;

-- 4. bubble_shares 테이블 제거
DROP TABLE IF EXISTS bubble_shares CASCADE;

-- 5. records RLS에서 bubble_shares 참조를 bubble_items로 교체
DROP POLICY IF EXISTS "records_bubble_shared" ON records;
CREATE POLICY "records_bubble_shared" ON records FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM bubble_items bi
    JOIN bubble_members bm ON bm.bubble_id = bi.bubble_id
    WHERE bi.record_id = records.id
      AND bm.user_id = auth.uid()
      AND bm.status = 'active'
  )
);
