-- 아로마 WSET 기준 재구조화
-- 기존: aroma_regions(JSONB), aroma_labels(TEXT[]), aroma_color(VARCHAR)
-- 변경: aroma_primary(TEXT[]), aroma_secondary(TEXT[]), aroma_tertiary(TEXT[])

-- 1. 새 컬럼 추가
ALTER TABLE records ADD COLUMN IF NOT EXISTS aroma_primary TEXT[] DEFAULT '{}';
ALTER TABLE records ADD COLUMN IF NOT EXISTS aroma_secondary TEXT[] DEFAULT '{}';
ALTER TABLE records ADD COLUMN IF NOT EXISTS aroma_tertiary TEXT[] DEFAULT '{}';

-- 2. 기존 컬럼 삭제
ALTER TABLE records DROP COLUMN IF EXISTS aroma_regions;
ALTER TABLE records DROP COLUMN IF EXISTS aroma_labels;
ALTER TABLE records DROP COLUMN IF EXISTS aroma_color;
