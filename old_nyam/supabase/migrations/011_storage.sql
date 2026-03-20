-- 011: Storage 정책
-- record-photos 버킷

INSERT INTO storage.buckets (id, name, public)
VALUES ('record-photos', 'record-photos', true)
ON CONFLICT (id) DO NOTHING;

-- 인증 사용자: 자기 폴더에 업로드
CREATE POLICY "record_photos_upload" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'record-photos'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- 공개 읽기
CREATE POLICY "record_photos_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'record-photos');

-- 본인 파일 삭제
CREATE POLICY "record_photos_delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'record-photos'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
