-- 와인 품질 평가: 강도(intensity) 컬럼 추가
ALTER TABLE records ADD COLUMN IF NOT EXISTS intensity INT;

-- CHECK 제약조건
ALTER TABLE records ADD CONSTRAINT chk_records_intensity
  CHECK (intensity IS NULL OR (intensity >= 0 AND intensity <= 100));
