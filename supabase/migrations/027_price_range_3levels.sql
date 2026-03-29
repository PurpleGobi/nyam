-- 가격대 4단계 → 3단계 변경
-- 기존 price_range=4 데이터가 있으면 3으로 변환
UPDATE restaurants SET price_range = 3 WHERE price_range = 4;

-- CHECK 제약조건 교체
ALTER TABLE restaurants DROP CONSTRAINT IF EXISTS chk_restaurants_price_range;
ALTER TABLE restaurants ADD CONSTRAINT chk_restaurants_price_range
  CHECK (price_range IS NULL OR (price_range >= 1 AND price_range <= 3));
