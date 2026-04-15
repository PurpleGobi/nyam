-- 071: bubble_items UPDATE RLS 정책 추가 (upsert 시 필요)
CREATE POLICY bubble_items_update_members ON bubble_items
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM bubble_members bm
      WHERE bm.bubble_id = bubble_items.bubble_id
        AND bm.user_id = auth.uid()
        AND bm.status = 'active'
        AND bm.role IN ('owner', 'admin', 'member')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM bubble_members bm
      WHERE bm.bubble_id = bubble_items.bubble_id
        AND bm.user_id = auth.uid()
        AND bm.status = 'active'
        AND bm.role IN ('owner', 'admin', 'member')
    )
  );
