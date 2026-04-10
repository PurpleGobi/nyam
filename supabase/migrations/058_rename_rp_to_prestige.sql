-- 058: restaurant_rp → restaurant_prestige 용어 통일
-- rp(reputation) → prestige로 전면 rename

-- 1. restaurant_rp 테이블 rename
ALTER TABLE restaurant_rp RENAME TO restaurant_prestige;

-- 2. 컬럼 rename
ALTER TABLE restaurant_prestige RENAME COLUMN rp_type TO prestige_type;
ALTER TABLE restaurant_prestige RENAME COLUMN rp_grade TO prestige_grade;
ALTER TABLE restaurant_prestige RENAME COLUMN rp_year TO prestige_year;

-- 3. restaurants 테이블의 rp JSONB → prestige
ALTER TABLE restaurants RENAME COLUMN rp TO prestige;

-- 4. 인덱스 rename (DROP + CREATE — ALTER INDEX RENAME은 일부 PG 버전 미지원)
DROP INDEX IF EXISTS idx_restaurant_rp_restaurant_id;
CREATE INDEX idx_restaurant_prestige_restaurant_id ON restaurant_prestige(restaurant_id);

DROP INDEX IF EXISTS idx_restaurant_rp_name_norm;
CREATE INDEX idx_restaurant_prestige_name_norm ON restaurant_prestige(restaurant_name_norm);

DROP INDEX IF EXISTS idx_restaurant_rp_kakao_id;
CREATE INDEX idx_restaurant_prestige_kakao_id ON restaurant_prestige(kakao_id);

DROP INDEX IF EXISTS idx_restaurant_rp_type;
CREATE INDEX idx_restaurant_prestige_type ON restaurant_prestige(prestige_type);

DROP INDEX IF EXISTS idx_restaurants_rp;
CREATE INDEX idx_restaurants_prestige ON restaurants USING GIN (prestige);

-- 5. RLS 정책 rename
DROP POLICY IF EXISTS "restaurant_rp_select_all" ON restaurant_prestige;
CREATE POLICY "restaurant_prestige_select_all" ON restaurant_prestige FOR SELECT USING (true);

-- 6. 트리거 함수 재생성 (컬럼명 반영)
CREATE OR REPLACE FUNCTION sync_restaurant_prestige_cache()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  target_restaurant_id UUID;
BEGIN
  IF TG_OP = 'DELETE' THEN
    target_restaurant_id := OLD.restaurant_id;
  ELSE
    target_restaurant_id := NEW.restaurant_id;
    IF TG_OP = 'UPDATE' AND OLD.restaurant_id IS DISTINCT FROM NEW.restaurant_id AND OLD.restaurant_id IS NOT NULL THEN
      UPDATE restaurants
      SET prestige = COALESCE(
        (SELECT jsonb_agg(jsonb_build_object('type', prestige_type, 'grade', prestige_grade))
         FROM restaurant_prestige WHERE restaurant_id = OLD.restaurant_id),
        '[]'::jsonb
      )
      WHERE id = OLD.restaurant_id;
    END IF;
  END IF;

  IF target_restaurant_id IS NOT NULL THEN
    UPDATE restaurants
    SET prestige = COALESCE(
      (SELECT jsonb_agg(jsonb_build_object('type', prestige_type, 'grade', prestige_grade))
       FROM restaurant_prestige WHERE restaurant_id = target_restaurant_id),
      '[]'::jsonb
    )
    WHERE id = target_restaurant_id;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- 7. 기존 트리거 삭제 + 새 트리거 생성
DROP TRIGGER IF EXISTS trg_sync_restaurant_rp_cache ON restaurant_prestige;
DROP FUNCTION IF EXISTS sync_restaurant_rp_cache();

CREATE TRIGGER trg_sync_restaurant_prestige_cache
AFTER INSERT OR UPDATE OR DELETE ON restaurant_prestige
FOR EACH ROW
EXECUTE FUNCTION sync_restaurant_prestige_cache();

-- 8. restaurants_within_radius RPC 재생성 (rp → prestige)
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
  prestige JSONB,
  distance DOUBLE PRECISION
)
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
  SELECT
    r.id, r.name, r.genre, r.area, r.address, r.lat, r.lng, r.prestige,
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

-- 9. search_restaurants_in_bounds RPC 재생성 (rp → prestige)
DROP FUNCTION IF EXISTS search_restaurants_in_bounds;

CREATE OR REPLACE FUNCTION search_restaurants_in_bounds(
  p_north DOUBLE PRECISION,
  p_south DOUBLE PRECISION,
  p_east DOUBLE PRECISION,
  p_west DOUBLE PRECISION,
  p_user_id UUID DEFAULT NULL,
  p_keyword TEXT DEFAULT '',
  p_sources TEXT[] DEFAULT NULL,
  p_prestige_types TEXT[] DEFAULT NULL,
  p_sort TEXT DEFAULT 'name',
  p_limit INT DEFAULT 20,
  p_offset INT DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  genre TEXT,
  district TEXT,
  area TEXT[],
  address TEXT,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  phone TEXT,
  kakao_map_url TEXT,
  prestige JSONB,
  has_record BOOLEAN,
  has_bookmark BOOLEAN
)
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_filter_ids UUID[] := NULL;
BEGIN
  IF p_sources IS NOT NULL AND array_length(p_sources, 1) > 0 AND p_user_id IS NOT NULL THEN
    v_filter_ids := ARRAY[]::UUID[];

    IF 'mine' = ANY(p_sources) THEN
      v_filter_ids := v_filter_ids || COALESCE(ARRAY(
        SELECT DISTINCT r.target_id FROM records r
        WHERE r.user_id = p_user_id AND r.target_type = 'restaurant'
      ), ARRAY[]::UUID[]);
    END IF;

    IF 'bookmark' = ANY(p_sources) THEN
      v_filter_ids := v_filter_ids || COALESCE(ARRAY(
        SELECT DISTINCT b.target_id FROM bookmarks b
        WHERE b.user_id = p_user_id AND b.target_type = 'restaurant'
      ), ARRAY[]::UUID[]);
    END IF;

    IF 'following' = ANY(p_sources) THEN
      v_filter_ids := v_filter_ids || COALESCE(ARRAY(
        SELECT DISTINCT r.target_id FROM records r
        INNER JOIN follows f ON f.following_id = r.user_id
        WHERE f.follower_id = p_user_id AND r.target_type = 'restaurant'
      ), ARRAY[]::UUID[]);
    END IF;

    IF 'bubble' = ANY(p_sources) THEN
      v_filter_ids := v_filter_ids || COALESCE(ARRAY(
        SELECT DISTINCT bi.target_id FROM bubble_items bi
        INNER JOIN bubble_members bm ON bm.bubble_id = bi.bubble_id
        WHERE bm.user_id = p_user_id AND bi.target_type = 'restaurant'
      ), ARRAY[]::UUID[]);
    END IF;

    IF array_length(v_filter_ids, 1) IS NULL THEN
      RETURN;
    END IF;
  END IF;

  IF p_user_id IS NULL THEN
    RETURN QUERY
    SELECT
      rst.id, rst.name::TEXT, rst.genre::TEXT, rst.district::TEXT, rst.area,
      rst.address::TEXT, rst.lat, rst.lng, rst.phone::TEXT, rst.kakao_map_url::TEXT, rst.prestige,
      FALSE, FALSE
    FROM restaurants rst
    WHERE
      rst.lat IS NOT NULL AND rst.lng IS NOT NULL
      AND ST_SetSRID(ST_MakePoint(rst.lng, rst.lat), 4326) && ST_MakeEnvelope(p_west, p_south, p_east, p_north, 4326)
      AND (p_keyword = '' OR rst.name ILIKE '%' || p_keyword || '%' OR rst.genre ILIKE '%' || p_keyword || '%')
      AND (v_filter_ids IS NULL OR rst.id = ANY(v_filter_ids))
      AND (p_prestige_types IS NULL OR EXISTS(
        SELECT 1 FROM jsonb_array_elements(rst.prestige) AS elem
        WHERE elem->>'type' = ANY(p_prestige_types)
      ))
    ORDER BY
      CASE WHEN p_sort = 'name' THEN rst.name END ASC,
      CASE WHEN p_sort = 'distance' THEN rst.name END ASC
    LIMIT p_limit + 1
    OFFSET p_offset;
  ELSE
    RETURN QUERY
    SELECT
      sub.id, sub.name, sub.genre, sub.district, sub.area, sub.address,
      sub.lat, sub.lng, sub.phone, sub.kakao_map_url, sub.prestige,
      EXISTS(SELECT 1 FROM records rc WHERE rc.target_id = sub.id AND rc.user_id = p_user_id AND rc.target_type = 'restaurant'),
      EXISTS(SELECT 1 FROM bookmarks bk WHERE bk.target_id = sub.id AND bk.user_id = p_user_id AND bk.target_type = 'restaurant')
    FROM (
      SELECT
        rst.id, rst.name::TEXT, rst.genre::TEXT, rst.district::TEXT, rst.area,
        rst.address::TEXT, rst.lat, rst.lng, rst.phone::TEXT, rst.kakao_map_url::TEXT, rst.prestige
      FROM restaurants rst
      WHERE
        rst.lat IS NOT NULL AND rst.lng IS NOT NULL
        AND ST_SetSRID(ST_MakePoint(rst.lng, rst.lat), 4326) && ST_MakeEnvelope(p_west, p_south, p_east, p_north, 4326)
        AND (p_keyword = '' OR rst.name ILIKE '%' || p_keyword || '%' OR rst.genre ILIKE '%' || p_keyword || '%')
        AND (v_filter_ids IS NULL OR rst.id = ANY(v_filter_ids))
        AND (p_prestige_types IS NULL OR EXISTS(
          SELECT 1 FROM jsonb_array_elements(rst.prestige) AS elem
          WHERE elem->>'type' = ANY(p_prestige_types)
        ))
      ORDER BY
        CASE WHEN p_sort = 'name' THEN rst.name END ASC,
        CASE WHEN p_sort = 'distance' THEN rst.name END ASC
      LIMIT p_limit + 1
      OFFSET p_offset
    ) sub;
  END IF;
END;
$$;
