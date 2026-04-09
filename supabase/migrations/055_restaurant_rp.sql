-- 055_restaurant_rp.sql
-- Reputation(RP) 시스템 리디자인: restaurant_accolades → restaurant_rp + restaurants.rp JSONB 캐시

-- 1. restaurant_rp 테이블 생성
CREATE TABLE restaurant_rp (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE SET NULL,
  restaurant_name TEXT NOT NULL,
  restaurant_name_norm TEXT NOT NULL,
  rp_type TEXT NOT NULL CHECK (rp_type IN ('michelin', 'blue_ribbon', 'tv')),
  rp_year INT,
  rp_grade TEXT NOT NULL,
  region TEXT,
  area TEXT,
  address TEXT,
  phone TEXT,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  kakao_id TEXT,
  source_url TEXT,
  verified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. 인덱스
CREATE INDEX idx_restaurant_rp_restaurant_id ON restaurant_rp(restaurant_id);
CREATE INDEX idx_restaurant_rp_name_norm ON restaurant_rp(restaurant_name_norm);
CREATE INDEX idx_restaurant_rp_kakao_id ON restaurant_rp(kakao_id);
CREATE INDEX idx_restaurant_rp_type ON restaurant_rp(rp_type);

-- 3. RLS 활성화
ALTER TABLE restaurant_rp ENABLE ROW LEVEL SECURITY;
CREATE POLICY "restaurant_rp_select_all" ON restaurant_rp FOR SELECT USING (true);

-- 4. restaurants 테이블에 rp JSONB 추가
ALTER TABLE restaurants ADD COLUMN rp JSONB DEFAULT '[]';
CREATE INDEX idx_restaurants_rp ON restaurants USING GIN (rp);

-- 5. restaurant_accolades → restaurant_rp 데이터 이전 (restaurant_id 없으므로 NULL)
INSERT INTO restaurant_rp (restaurant_name, restaurant_name_norm, rp_type, rp_year, rp_grade, region, area, address, phone, lat, lng, kakao_id, source_url, verified, created_at, updated_at)
SELECT
  restaurant_name,
  restaurant_name_norm,
  CASE source
    WHEN 'michelin' THEN 'michelin'
    WHEN 'blue_ribbon' THEN 'blue_ribbon'
    ELSE 'tv'
  END,
  year,
  CASE
    WHEN source = 'michelin' AND detail = '3스타' THEN '3_star'
    WHEN source = 'michelin' AND detail = '2스타' THEN '2_star'
    WHEN source = 'michelin' AND detail = '1스타' THEN '1_star'
    WHEN source = 'michelin' AND detail = '빕구르망' THEN 'bib'
    WHEN source = 'blue_ribbon' AND detail = '3리본' THEN '3_ribbon'
    WHEN source = 'blue_ribbon' AND detail = '2리본' THEN '2_ribbon'
    WHEN source = 'blue_ribbon' AND detail = '1리본' THEN '1_ribbon'
    ELSE source  -- TV: 프로그램명을 grade로
  END,
  region, area, address, phone, lat, lng, kakao_id, source_url, verified, created_at, updated_at
FROM restaurant_accolades;

-- 7. restaurants.rp 캐시 자동 갱신 트리거
CREATE OR REPLACE FUNCTION sync_restaurant_rp_cache()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  target_restaurant_id UUID;
BEGIN
  -- INSERT/UPDATE는 NEW, DELETE는 OLD에서 restaurant_id 추출
  IF TG_OP = 'DELETE' THEN
    target_restaurant_id := OLD.restaurant_id;
  ELSE
    target_restaurant_id := NEW.restaurant_id;
    -- UPDATE로 restaurant_id가 변경된 경우, 이전 restaurant도 갱신
    IF TG_OP = 'UPDATE' AND OLD.restaurant_id IS DISTINCT FROM NEW.restaurant_id AND OLD.restaurant_id IS NOT NULL THEN
      UPDATE restaurants
      SET rp = COALESCE(
        (SELECT jsonb_agg(jsonb_build_object('type', rp_type, 'grade', rp_grade))
         FROM restaurant_rp WHERE restaurant_id = OLD.restaurant_id),
        '[]'::jsonb
      )
      WHERE id = OLD.restaurant_id;
    END IF;
  END IF;

  -- 대상 restaurant의 rp 캐시 갱신
  IF target_restaurant_id IS NOT NULL THEN
    UPDATE restaurants
    SET rp = COALESCE(
      (SELECT jsonb_agg(jsonb_build_object('type', rp_type, 'grade', rp_grade))
       FROM restaurant_rp WHERE restaurant_id = target_restaurant_id),
      '[]'::jsonb
    )
    WHERE id = target_restaurant_id;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_sync_restaurant_rp_cache
AFTER INSERT OR UPDATE OR DELETE ON restaurant_rp
FOR EACH ROW
EXECUTE FUNCTION sync_restaurant_rp_cache();

-- 8. 기존 컬럼 삭제
ALTER TABLE restaurants DROP COLUMN IF EXISTS michelin_stars;
ALTER TABLE restaurants DROP COLUMN IF EXISTS has_blue_ribbon;
ALTER TABLE restaurants DROP COLUMN IF EXISTS media_appearances;

-- 9. restaurant_accolades 테이블 삭제
DROP TABLE IF EXISTS restaurant_accolades;

-- 10. RPC 함수 리턴 타입 변경 (DROP 후 재생성)
DROP FUNCTION IF EXISTS restaurants_within_radius(double precision, double precision, integer);

CREATE FUNCTION restaurants_within_radius(
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  radius_meters INT DEFAULT 2000
)
RETURNS TABLE (
  id UUID,
  name VARCHAR(100),
  genre VARCHAR(30),
  area VARCHAR(50),
  address TEXT,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  rp JSONB,
  distance DOUBLE PRECISION
)
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
  SELECT
    r.id, r.name, r.genre, r.area, r.address, r.lat, r.lng, r.rp,
    ST_DistanceSphere(
      ST_MakePoint(r.lng, r.lat),
      ST_MakePoint(lng, lat)
    ) AS distance
  FROM restaurants r
  WHERE r.lat IS NOT NULL
    AND r.lng IS NOT NULL
    AND ST_DistanceSphere(
      ST_MakePoint(r.lng, r.lat),
      ST_MakePoint(lng, lat)
    ) <= radius_meters
  ORDER BY distance ASC
  LIMIT 20;
$$;
