-- bubble_items.source 컬럼 제거 (auto/manual 구분 불필요)

-- 1) RLS delete 정책 업데이트 (source 조건 제거)
DROP POLICY IF EXISTS "bubble_items_delete" ON bubble_items;
CREATE POLICY "bubble_items_delete" ON bubble_items
  FOR DELETE USING (
    added_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM bubble_members bm
      WHERE bm.bubble_id = bubble_items.bubble_id
        AND bm.user_id = auth.uid()
        AND bm.status = 'active'
        AND bm.role IN ('owner', 'admin')
    )
  );

-- 2) source 컬럼 제거
ALTER TABLE bubble_items DROP COLUMN source;

-- 3) source 기반 인덱스 제거
DROP INDEX IF EXISTS idx_bubble_items_bubble_source;
