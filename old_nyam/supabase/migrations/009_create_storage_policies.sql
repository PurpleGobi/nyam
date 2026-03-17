-- Storage policies for record-photos bucket

-- Allow authenticated users to upload their own photos
CREATE POLICY "Users can upload own photos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'record-photos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow public read access to all record photos
CREATE POLICY "Public read access for record photos"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'record-photos');

-- Allow users to delete their own photos
CREATE POLICY "Users can delete own photos"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'record-photos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
