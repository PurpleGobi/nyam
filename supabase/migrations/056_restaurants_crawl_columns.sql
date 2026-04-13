-- 056: restaurants 테이블 크롤링 관련 컬럼 추가
-- data_source: 유저 생성 vs 크롤링으로 생성된 식당 구분
-- last_crawled_at: 마지막 크롤링/검증 시각
-- is_closed: 폐업 여부

ALTER TABLE restaurants
  ADD COLUMN IF NOT EXISTS data_source TEXT NOT NULL DEFAULT 'user_created',
  ADD COLUMN IF NOT EXISTS last_crawled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS is_closed BOOLEAN NOT NULL DEFAULT false;

-- data_source 값 제약
ALTER TABLE restaurants
  ADD CONSTRAINT chk_restaurants_data_source
  CHECK (data_source IN ('user_created', 'crawled'));

-- 인덱스: 크롤링 관련 쿼리 최적화
CREATE INDEX IF NOT EXISTS idx_restaurants_data_source ON restaurants (data_source);
CREATE INDEX IF NOT EXISTS idx_restaurants_last_crawled ON restaurants (last_crawled_at);
CREATE INDEX IF NOT EXISTS idx_restaurants_is_closed ON restaurants (is_closed) WHERE is_closed = true;

-- external_ids->>'kakao' UNIQUE 인덱스 (upsert ON CONFLICT용)
-- NULL은 unique 제약에서 제외되므로 kakao ID가 없는 기존 레코드에 영향 없음
CREATE UNIQUE INDEX IF NOT EXISTS idx_restaurants_kakao_id_unique
  ON restaurants ((external_ids->>'kakao'))
  WHERE external_ids->>'kakao' IS NOT NULL;

-- upsert RPC 함수
CREATE OR REPLACE FUNCTION upsert_crawled_restaurants(items JSONB)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  item JSONB;
BEGIN
  FOR item IN SELECT * FROM jsonb_array_elements(items)
  LOOP
    INSERT INTO restaurants (
      name, address, country, city, district, area,
      lat, lng, genre, phone, kakao_map_url,
      external_ids, data_source, last_crawled_at
    ) VALUES (
      item->>'name',
      item->>'address',
      COALESCE(item->>'country', '한국'),
      COALESCE(item->>'city', '서울'),
      item->>'district',
      CASE
        WHEN item->'area' IS NOT NULL AND jsonb_typeof(item->'area') = 'array'
        THEN ARRAY(SELECT jsonb_array_elements_text(item->'area'))
        ELSE ARRAY[]::TEXT[]
      END,
      (item->>'lat')::DOUBLE PRECISION,
      (item->>'lng')::DOUBLE PRECISION,
      item->>'genre',
      item->>'phone',
      item->>'kakao_map_url',
      item->'external_ids',
      'crawled',
      NOW()
    )
    ON CONFLICT ((external_ids->>'kakao')) WHERE external_ids->>'kakao' IS NOT NULL
    DO UPDATE SET
      name = EXCLUDED.name,
      address = EXCLUDED.address,
      district = EXCLUDED.district,
      area = EXCLUDED.area,
      lat = EXCLUDED.lat,
      lng = EXCLUDED.lng,
      genre = COALESCE(EXCLUDED.genre, restaurants.genre),
      phone = COALESCE(EXCLUDED.phone, restaurants.phone),
      kakao_map_url = EXCLUDED.kakao_map_url,
      external_ids = restaurants.external_ids || EXCLUDED.external_ids,
      last_crawled_at = NOW()
    WHERE restaurants.data_source = 'crawled';  -- user_created는 덮어쓰지 않음
  END LOOP;
END;
$$;

COMMENT ON COLUMN restaurants.data_source IS 'user_created: 유저가 등록, crawled: 크롤링으로 생성';
COMMENT ON COLUMN restaurants.last_crawled_at IS '마지막 크롤링/검증 시각';
COMMENT ON COLUMN restaurants.is_closed IS '폐업 여부 (true이면 지도뷰에서 제외)';
