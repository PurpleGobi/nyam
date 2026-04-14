-- bubble_photos: 버블 사진첩 (record_photos와 동일 구조)
CREATE TABLE bubble_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bubble_id UUID NOT NULL REFERENCES bubbles(id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL REFERENCES auth.users(id),
  url TEXT NOT NULL,
  order_index INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_bubble_photos_bubble ON bubble_photos(bubble_id, order_index);

-- RLS
ALTER TABLE bubble_photos ENABLE ROW LEVEL SECURITY;

-- 읽기: 버블 멤버 또는 공개 버블
CREATE POLICY "bubble_photos_select" ON bubble_photos FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM bubble_members bm
    WHERE bm.bubble_id = bubble_photos.bubble_id
      AND bm.user_id = auth.uid()
      AND bm.status = 'active'
  )
  OR EXISTS (
    SELECT 1 FROM bubbles b
    WHERE b.id = bubble_photos.bubble_id
      AND b.visibility = 'public'
  )
);

-- 쓰기: 버블 멤버(active)만
CREATE POLICY "bubble_photos_insert" ON bubble_photos FOR INSERT WITH CHECK (
  auth.uid() = uploaded_by
  AND EXISTS (
    SELECT 1 FROM bubble_members bm
    WHERE bm.bubble_id = bubble_photos.bubble_id
      AND bm.user_id = auth.uid()
      AND bm.status = 'active'
  )
);

-- 삭제: 업로더 본인 또는 버블 오너
CREATE POLICY "bubble_photos_delete" ON bubble_photos FOR DELETE USING (
  auth.uid() = uploaded_by
  OR EXISTS (
    SELECT 1 FROM bubble_members bm
    WHERE bm.bubble_id = bubble_photos.bubble_id
      AND bm.user_id = auth.uid()
      AND bm.role = 'owner'
      AND bm.status = 'active'
  )
);
