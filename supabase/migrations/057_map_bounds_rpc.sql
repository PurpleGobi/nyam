-- 057: 지도뷰 bounds 검색 최적화
-- pg_trgm + PostGIS GiST (SRID 4326) + 단일 RPC + LIMIT+1 페이지네이션 + prestige 필터

CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS idx_restaurants_name_trgm ON restaurants USING GIN (name gin_trgm_ops);

DROP INDEX IF EXISTS idx_restaurants_location;
CREATE INDEX idx_restaurants_location ON restaurants
  USING gist (ST_SetSRID(ST_MakePoint(lng, lat), 4326))
  WHERE lng IS NOT NULL AND lat IS NOT NULL;

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
  rp JSONB,
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
      rst.address::TEXT, rst.lat, rst.lng, rst.phone::TEXT, rst.kakao_map_url::TEXT, rst.rp,
      FALSE, FALSE
    FROM restaurants rst
    WHERE
      rst.lat IS NOT NULL AND rst.lng IS NOT NULL
      AND ST_SetSRID(ST_MakePoint(rst.lng, rst.lat), 4326) && ST_MakeEnvelope(p_west, p_south, p_east, p_north, 4326)
      AND (p_keyword = '' OR rst.name ILIKE '%' || p_keyword || '%' OR rst.genre ILIKE '%' || p_keyword || '%')
      AND (v_filter_ids IS NULL OR rst.id = ANY(v_filter_ids))
      AND (p_prestige_types IS NULL OR EXISTS(
        SELECT 1 FROM jsonb_array_elements(rst.rp) AS elem
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
      sub.lat, sub.lng, sub.phone, sub.kakao_map_url, sub.rp,
      EXISTS(SELECT 1 FROM records rc WHERE rc.target_id = sub.id AND rc.user_id = p_user_id AND rc.target_type = 'restaurant'),
      EXISTS(SELECT 1 FROM bookmarks bk WHERE bk.target_id = sub.id AND bk.user_id = p_user_id AND bk.target_type = 'restaurant')
    FROM (
      SELECT
        rst.id, rst.name::TEXT, rst.genre::TEXT, rst.district::TEXT, rst.area,
        rst.address::TEXT, rst.lat, rst.lng, rst.phone::TEXT, rst.kakao_map_url::TEXT, rst.rp
      FROM restaurants rst
      WHERE
        rst.lat IS NOT NULL AND rst.lng IS NOT NULL
        AND ST_SetSRID(ST_MakePoint(rst.lng, rst.lat), 4326) && ST_MakeEnvelope(p_west, p_south, p_east, p_north, 4326)
        AND (p_keyword = '' OR rst.name ILIKE '%' || p_keyword || '%' OR rst.genre ILIKE '%' || p_keyword || '%')
        AND (v_filter_ids IS NULL OR rst.id = ANY(v_filter_ids))
        AND (p_prestige_types IS NULL OR EXISTS(
          SELECT 1 FROM jsonb_array_elements(rst.rp) AS elem
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
