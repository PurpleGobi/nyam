-- 카카오맵 링크 저장용 컬럼 추가
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS kakao_map_url TEXT;
