-- 016: restaurants.country / city에 NOT NULL 제약 추가
-- 기존 null 행이 있을 수 있으므로 DEFAULT 값으로 채운 후 제약 추가

UPDATE restaurants SET country = '한국' WHERE country IS NULL;
UPDATE restaurants SET city = '서울' WHERE city IS NULL;

ALTER TABLE restaurants
  ALTER COLUMN country SET NOT NULL,
  ALTER COLUMN city SET NOT NULL;
