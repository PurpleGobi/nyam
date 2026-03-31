-- 같은 버블의 active 멤버라면 해당 멤버의 records를 읽을 수 있도록 RLS 추가
CREATE POLICY "records_bubble_member_read" ON public.records
  FOR SELECT
  USING (
    user_id IN (
      SELECT bm2.user_id
      FROM bubble_members bm1
      JOIN bubble_members bm2 ON bm1.bubble_id = bm2.bubble_id
      WHERE bm1.user_id = auth.uid()
        AND bm1.status = 'active'
        AND bm2.status = 'active'
    )
  );

-- record_photos도 동일하게 버블 멤버 간 읽기 허용
CREATE POLICY "record_photos_bubble_member_read" ON public.record_photos
  FOR SELECT
  USING (
    record_id IN (
      SELECT r.id FROM records r
      WHERE r.user_id IN (
        SELECT bm2.user_id
        FROM bubble_members bm1
        JOIN bubble_members bm2 ON bm1.bubble_id = bm2.bubble_id
        WHERE bm1.user_id = auth.uid()
          AND bm1.status = 'active'
          AND bm2.status = 'active'
      )
    )
  );
