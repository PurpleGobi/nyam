-- 061: DB 쿼리 최적화 — RPC 함수 4개
-- filter_home_restaurants, filter_home_wines, search_restaurants_in_bounds 개선, is_mutual_follow

-- ============================================================
-- 1. filter_home_restaurants — 홈뷰 식당 메타 필터
-- ============================================================
CREATE OR REPLACE FUNCTION filter_home_restaurants(
  p_ids        UUID[],
  p_genre      TEXT     DEFAULT NULL,
  p_district   TEXT     DEFAULT NULL,
  p_area       TEXT     DEFAULT NULL,
  p_prestige   TEXT     DEFAULT NULL,   -- 'michelin', 'blue_ribbon', 'tv', 'none'
  p_price_range INT     DEFAULT NULL,
  p_sort       TEXT     DEFAULT 'name', -- 'name' only (records 파생 소팅은 JS)
  p_limit      INT      DEFAULT 20,
  p_offset     INT      DEFAULT 0
) RETURNS TABLE(
  id UUID, name TEXT, genre TEXT, district TEXT, area TEXT[],
  city TEXT, country TEXT, lat FLOAT8, lng FLOAT8,
  price_range INT, prestige JSONB, photos TEXT[]
) AS $$
BEGIN
  RETURN QUERY
  SELECT r.id, r.name::TEXT, r.genre::TEXT, r.district::TEXT, r.area,
         r.city::TEXT, r.country::TEXT, r.lat, r.lng,
         r.price_range, r.prestige, r.photos
  FROM restaurants r
  WHERE r.id = ANY(p_ids)
    AND (p_genre IS NULL OR r.genre = p_genre)
    AND (p_district IS NULL OR r.district = p_district)
    AND (p_area IS NULL OR p_area = ANY(r.area))
    AND (p_price_range IS NULL OR r.price_range = p_price_range)
    AND (
      p_prestige IS NULL
      OR (p_prestige = 'none' AND (r.prestige IS NULL OR r.prestige = '[]'::jsonb))
      OR (p_prestige <> 'none' AND r.prestige @> ('[{"type":"' || p_prestige || '"}]')::jsonb)
    )
  ORDER BY
    CASE WHEN p_sort = 'name' THEN r.name END ASC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================
-- 2. filter_home_wines — 홈뷰 와인 메타 필터
-- ============================================================
CREATE OR REPLACE FUNCTION filter_home_wines(
  p_ids           UUID[],
  p_wine_type     TEXT    DEFAULT NULL,
  p_variety       TEXT    DEFAULT NULL,
  p_country       TEXT    DEFAULT NULL,
  p_vintage       INT     DEFAULT NULL,
  p_vintage_op    TEXT    DEFAULT 'eq',  -- 'eq', 'lte' (before_2018)
  p_acidity       INT     DEFAULT NULL,
  p_sweetness     INT     DEFAULT NULL,
  p_sort          TEXT    DEFAULT 'name',
  p_limit         INT     DEFAULT 20,
  p_offset        INT     DEFAULT 0
) RETURNS TABLE(
  id UUID, name TEXT, wine_type TEXT, variety TEXT,
  country TEXT, region TEXT, sub_region TEXT,
  vintage INT, photos TEXT[], producer TEXT,
  acidity_level INT, sweetness_level INT
) AS $$
BEGIN
  RETURN QUERY
  SELECT w.id, w.name::TEXT, w.wine_type::TEXT, w.variety::TEXT,
         w.country::TEXT, w.region::TEXT, w.sub_region::TEXT,
         w.vintage, w.photos, w.producer::TEXT,
         w.acidity_level, w.sweetness_level
  FROM wines w
  WHERE w.id = ANY(p_ids)
    AND (p_wine_type IS NULL OR w.wine_type = p_wine_type)
    AND (p_variety IS NULL OR w.variety = p_variety)
    AND (p_country IS NULL OR w.country = p_country)
    AND (p_acidity IS NULL OR w.acidity_level = p_acidity)
    AND (p_sweetness IS NULL OR w.sweetness_level = p_sweetness)
    AND (
      p_vintage IS NULL
      OR (p_vintage_op = 'eq' AND w.vintage = p_vintage)
      OR (p_vintage_op = 'lte' AND w.vintage <= p_vintage)
    )
  ORDER BY
    CASE WHEN p_sort = 'name' THEN w.name END ASC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================
-- 3. search_restaurants_in_bounds — genre/district/area 필터 추가
--    파라미터 시그니처 변경이므로 DROP 후 재생성
-- ============================================================
DROP FUNCTION IF EXISTS search_restaurants_in_bounds(
  DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION,
  UUID, TEXT, TEXT[], TEXT[], TEXT, INT, INT
);

CREATE OR REPLACE FUNCTION search_restaurants_in_bounds(
  p_north DOUBLE PRECISION,
  p_south DOUBLE PRECISION,
  p_east DOUBLE PRECISION,
  p_west DOUBLE PRECISION,
  p_user_id UUID DEFAULT NULL,
  p_keyword TEXT DEFAULT '',
  p_sources TEXT[] DEFAULT NULL,
  p_prestige_types TEXT[] DEFAULT NULL,
  p_genre TEXT DEFAULT NULL,
  p_district TEXT DEFAULT NULL,
  p_area TEXT DEFAULT NULL,
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
      AND (p_keyword = '' OR rst.name ILIKE '%' || p_keyword || '%')
      AND (v_filter_ids IS NULL OR rst.id = ANY(v_filter_ids))
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
        AND (p_keyword = '' OR rst.name ILIKE '%' || p_keyword || '%')
        AND (v_filter_ids IS NULL OR rst.id = ANY(v_filter_ids))
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
      LIMIT p_limit + 1
      OFFSET p_offset
    ) sub;
  END IF;
END;
$$;

-- ============================================================
-- 4. is_mutual_follow — 맞팔 확인 (단일 JOIN)
-- ============================================================
CREATE OR REPLACE FUNCTION is_mutual_follow(
  p_user_id UUID,
  p_target_id UUID
) RETURNS BOOLEAN AS $$
  SELECT EXISTS(
    SELECT 1 FROM follows f1
    INNER JOIN follows f2
      ON f1.following_id = f2.follower_id
      AND f1.follower_id = f2.following_id
    WHERE f1.follower_id = p_user_id
      AND f1.following_id = p_target_id
      AND f1.status = 'accepted'
      AND f2.status = 'accepted'
  );
$$ LANGUAGE sql STABLE;
