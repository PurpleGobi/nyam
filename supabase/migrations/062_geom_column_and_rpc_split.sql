-- 062: 지도 검색 성능 최적화
-- 1) geometry 컬럼 + 트리거 (expression-based → stored column)
-- 2) RPC 3-way 분리 (PL/pgSQL → SQL inline)
-- 결과: 290ms → 1.7ms (170배 개선)

-- ── 1. geom 컬럼 + 인덱스 + 트리거 ──

ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS geom geometry(Point, 4326);

UPDATE restaurants
SET geom = ST_SetSRID(ST_MakePoint(lng, lat), 4326)
WHERE lng IS NOT NULL AND lat IS NOT NULL AND geom IS NULL;

CREATE INDEX IF NOT EXISTS idx_restaurants_geom
  ON restaurants USING gist (geom);

CREATE OR REPLACE FUNCTION sync_restaurant_geom() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.lat IS NOT NULL AND NEW.lng IS NOT NULL THEN
    NEW.geom := ST_SetSRID(ST_MakePoint(NEW.lng, NEW.lat), 4326);
  ELSE
    NEW.geom := NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_restaurants_geom ON restaurants;
CREATE TRIGGER trg_restaurants_geom
  BEFORE INSERT OR UPDATE OF lat, lng ON restaurants
  FOR EACH ROW EXECUTE FUNCTION sync_restaurant_geom();

-- ── 2. RPC 3-way 분리 ──

-- 2a. simple: user_id 없음, source 없음 (SQL language, 인라인 가능)
CREATE OR REPLACE FUNCTION search_restaurants_bounds_simple(
  p_north DOUBLE PRECISION, p_south DOUBLE PRECISION,
  p_east DOUBLE PRECISION, p_west DOUBLE PRECISION,
  p_keyword TEXT DEFAULT '',
  p_prestige_types TEXT[] DEFAULT NULL,
  p_genre TEXT DEFAULT NULL,
  p_district TEXT DEFAULT NULL,
  p_area TEXT DEFAULT NULL,
  p_sort TEXT DEFAULT 'name',
  p_limit INT DEFAULT 20,
  p_offset INT DEFAULT 0
) RETURNS TABLE (
  id UUID, name TEXT, genre TEXT, district TEXT, area TEXT[],
  address TEXT, lat DOUBLE PRECISION, lng DOUBLE PRECISION,
  phone TEXT, kakao_map_url TEXT, prestige JSONB,
  has_record BOOLEAN, has_bookmark BOOLEAN
) LANGUAGE sql STABLE AS $$
  SELECT
    rst.id, rst.name::TEXT, rst.genre::TEXT, rst.district::TEXT, rst.area,
    rst.address::TEXT, rst.lat, rst.lng, rst.phone::TEXT, rst.kakao_map_url::TEXT, rst.prestige,
    FALSE, FALSE
  FROM restaurants rst
  WHERE rst.geom IS NOT NULL
    AND rst.geom && ST_MakeEnvelope(p_west, p_south, p_east, p_north, 4326)
    AND (p_keyword = '' OR rst.name ILIKE '%' || p_keyword || '%')
    AND (p_prestige_types IS NULL OR EXISTS(
      SELECT 1 FROM jsonb_array_elements(rst.prestige) AS elem
      WHERE elem->>'type' = ANY(p_prestige_types)
    ))
    AND (p_genre IS NULL OR rst.genre = p_genre)
    AND (p_district IS NULL OR rst.district = p_district)
    AND (p_area IS NULL OR p_area = ANY(rst.area))
  ORDER BY
    CASE WHEN p_sort = 'name' THEN rst.name END ASC,
    CASE WHEN p_sort = 'distance' THEN rst.name END ASC
  LIMIT p_limit + 1 OFFSET p_offset;
$$;

-- 2b. auth: user_id 있음, source 없음 (SQL language)
CREATE OR REPLACE FUNCTION search_restaurants_bounds_auth(
  p_north DOUBLE PRECISION, p_south DOUBLE PRECISION,
  p_east DOUBLE PRECISION, p_west DOUBLE PRECISION,
  p_user_id UUID,
  p_keyword TEXT DEFAULT '',
  p_prestige_types TEXT[] DEFAULT NULL,
  p_genre TEXT DEFAULT NULL,
  p_district TEXT DEFAULT NULL,
  p_area TEXT DEFAULT NULL,
  p_sort TEXT DEFAULT 'name',
  p_limit INT DEFAULT 20,
  p_offset INT DEFAULT 0
) RETURNS TABLE (
  id UUID, name TEXT, genre TEXT, district TEXT, area TEXT[],
  address TEXT, lat DOUBLE PRECISION, lng DOUBLE PRECISION,
  phone TEXT, kakao_map_url TEXT, prestige JSONB,
  has_record BOOLEAN, has_bookmark BOOLEAN
) LANGUAGE sql STABLE AS $$
  SELECT
    sub.id, sub.name, sub.genre, sub.district, sub.area, sub.address,
    sub.lat, sub.lng, sub.phone, sub.kakao_map_url, sub.prestige,
    EXISTS(SELECT 1 FROM records rc WHERE rc.target_id = sub.id AND rc.user_id = p_user_id AND rc.target_type = 'restaurant'),
    EXISTS(SELECT 1 FROM bookmarks bk WHERE bk.target_id = sub.id AND bk.user_id = p_user_id AND bk.target_type = 'restaurant')
  FROM (
    SELECT rst.id, rst.name::TEXT, rst.genre::TEXT, rst.district::TEXT, rst.area,
           rst.address::TEXT, rst.lat, rst.lng, rst.phone::TEXT, rst.kakao_map_url::TEXT, rst.prestige
    FROM restaurants rst
    WHERE rst.geom IS NOT NULL
      AND rst.geom && ST_MakeEnvelope(p_west, p_south, p_east, p_north, 4326)
      AND (p_keyword = '' OR rst.name ILIKE '%' || p_keyword || '%')
      AND (p_prestige_types IS NULL OR EXISTS(
        SELECT 1 FROM jsonb_array_elements(rst.prestige) AS elem
        WHERE elem->>'type' = ANY(p_prestige_types)
      ))
      AND (p_genre IS NULL OR rst.genre = p_genre)
      AND (p_district IS NULL OR rst.district = p_district)
      AND (p_area IS NULL OR p_area = ANY(rst.area))
    ORDER BY
      CASE WHEN p_sort = 'name' THEN rst.name END ASC,
      CASE WHEN p_sort = 'distance' THEN rst.name END ASC
    LIMIT p_limit + 1 OFFSET p_offset
  ) sub;
$$;

-- 2c. source: source 필터 포함 (PL/pgSQL, 분기 로직 필요)
CREATE OR REPLACE FUNCTION search_restaurants_bounds_source(
  p_north DOUBLE PRECISION, p_south DOUBLE PRECISION,
  p_east DOUBLE PRECISION, p_west DOUBLE PRECISION,
  p_user_id UUID,
  p_keyword TEXT DEFAULT '',
  p_sources TEXT[] DEFAULT NULL,
  p_prestige_types TEXT[] DEFAULT NULL,
  p_genre TEXT DEFAULT NULL,
  p_district TEXT DEFAULT NULL,
  p_area TEXT DEFAULT NULL,
  p_sort TEXT DEFAULT 'name',
  p_limit INT DEFAULT 20,
  p_offset INT DEFAULT 0
) RETURNS TABLE (
  id UUID, name TEXT, genre TEXT, district TEXT, area TEXT[],
  address TEXT, lat DOUBLE PRECISION, lng DOUBLE PRECISION,
  phone TEXT, kakao_map_url TEXT, prestige JSONB,
  has_record BOOLEAN, has_bookmark BOOLEAN
) LANGUAGE plpgsql STABLE AS $$
DECLARE
  v_filter_ids UUID[];
BEGIN
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
  IF array_length(v_filter_ids, 1) IS NULL THEN RETURN; END IF;

  RETURN QUERY
  SELECT sub.id, sub.name, sub.genre, sub.district, sub.area, sub.address,
         sub.lat, sub.lng, sub.phone, sub.kakao_map_url, sub.prestige,
    EXISTS(SELECT 1 FROM records rc WHERE rc.target_id = sub.id AND rc.user_id = p_user_id AND rc.target_type = 'restaurant'),
    EXISTS(SELECT 1 FROM bookmarks bk WHERE bk.target_id = sub.id AND bk.user_id = p_user_id AND bk.target_type = 'restaurant')
  FROM (
    SELECT rst.id, rst.name::TEXT, rst.genre::TEXT, rst.district::TEXT, rst.area,
           rst.address::TEXT, rst.lat, rst.lng, rst.phone::TEXT, rst.kakao_map_url::TEXT, rst.prestige
    FROM restaurants rst
    WHERE rst.geom IS NOT NULL
      AND rst.geom && ST_MakeEnvelope(p_west, p_south, p_east, p_north, 4326)
      AND (p_keyword = '' OR rst.name ILIKE '%' || p_keyword || '%')
      AND rst.id = ANY(v_filter_ids)
      AND (p_prestige_types IS NULL OR EXISTS(
        SELECT 1 FROM jsonb_array_elements(rst.prestige) AS elem
        WHERE elem->>'type' = ANY(p_prestige_types)
      ))
      AND (p_genre IS NULL OR rst.genre = p_genre)
      AND (p_district IS NULL OR rst.district = p_district)
      AND (p_area IS NULL OR p_area = ANY(rst.area))
    ORDER BY
      CASE WHEN p_sort = 'name' THEN rst.name END ASC,
      CASE WHEN p_sort = 'distance' THEN rst.name END ASC
    LIMIT p_limit + 1 OFFSET p_offset
  ) sub;
END;
$$;
