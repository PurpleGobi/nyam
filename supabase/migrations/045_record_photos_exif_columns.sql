-- 045_record_photos_exif_columns.sql
-- record_photos에 EXIF 촬영 위치/시각 저장 컬럼 추가

ALTER TABLE record_photos
  ADD COLUMN IF NOT EXISTS exif_lat DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS exif_lng DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS captured_at TIMESTAMPTZ;
