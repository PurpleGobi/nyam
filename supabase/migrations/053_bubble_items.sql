-- bubble_items: 버블 큐레이션 리스트의 대상(target) 단위 항목
CREATE TABLE bubble_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bubble_id UUID NOT NULL REFERENCES bubbles(id) ON DELETE CASCADE,
  target_id UUID NOT NULL,
  target_type VARCHAR(10) NOT NULL CHECK (target_type IN ('restaurant', 'wine')),
  added_by UUID NOT NULL REFERENCES users(id),
  source VARCHAR(10) NOT NULL DEFAULT 'manual' CHECK (source IN ('auto', 'manual')),
  record_id UUID REFERENCES records(id) ON DELETE SET NULL,
  added_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(bubble_id, target_id, target_type)
);

-- 인덱스
CREATE INDEX idx_bubble_items_bubble_target ON bubble_items(bubble_id, target_type);
CREATE INDEX idx_bubble_items_bubble_source ON bubble_items(bubble_id, source);
CREATE INDEX idx_bubble_items_added_by ON bubble_items(added_by);

-- RLS
ALTER TABLE bubble_items ENABLE ROW LEVEL SECURITY;

-- SELECT: 버블 멤버 (member 이상)
CREATE POLICY "bubble_items_select_members" ON bubble_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM bubble_members bm
      WHERE bm.bubble_id = bubble_items.bubble_id
        AND bm.user_id = auth.uid()
        AND bm.status = 'active'
    )
  );

-- SELECT: 팔로워 (public 버블만)
CREATE POLICY "bubble_items_select_followers" ON bubble_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM bubble_members bm
      JOIN bubbles b ON b.id = bm.bubble_id
      WHERE bm.bubble_id = bubble_items.bubble_id
        AND bm.user_id = auth.uid()
        AND bm.role = 'follower'
        AND b.visibility = 'public'
    )
  );

-- INSERT: 멤버 (member 이상, follower 불가)
CREATE POLICY "bubble_items_insert_members" ON bubble_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM bubble_members bm
      WHERE bm.bubble_id = bubble_items.bubble_id
        AND bm.user_id = auth.uid()
        AND bm.status = 'active'
        AND bm.role IN ('owner', 'admin', 'member')
    )
  );

-- DELETE: 본인 추가 manual 항목 또는 admin/owner
CREATE POLICY "bubble_items_delete" ON bubble_items
  FOR DELETE USING (
    (added_by = auth.uid() AND source = 'manual')
    OR EXISTS (
      SELECT 1 FROM bubble_members bm
      WHERE bm.bubble_id = bubble_items.bubble_id
        AND bm.user_id = auth.uid()
        AND bm.status = 'active'
        AND bm.role IN ('owner', 'admin')
    )
  );

-- 기존 데이터 이관 (bubble_shares → bubble_items)
-- manual 우선 선택 (auto_synced ASC), 같은 소스 내에서는 최신 기록 (shared_at DESC)
INSERT INTO bubble_items (bubble_id, target_id, target_type, added_by, source, record_id, added_at)
SELECT DISTINCT ON (bubble_id, target_id, target_type)
  bubble_id, target_id, target_type, shared_by,
  CASE WHEN auto_synced THEN 'auto' ELSE 'manual' END,
  record_id, shared_at
FROM bubble_shares
ORDER BY bubble_id, target_id, target_type,
  auto_synced ASC,
  shared_at DESC;
