-- 064: 지도뷰 bounds RPC에 점수(my_score) 추가 + score_high 정렬 + bookmarks 참조 제거

-- 기존 함수 DROP (RETURNS TABLE 시그니처 변경)
DROP FUNCTION IF EXISTS search_restaurants_bounds_simple(DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION, TEXT, TEXT[], TEXT, TEXT, TEXT, TEXT, INT, INT);
DROP FUNCTION IF EXISTS search_restaurants_bounds_auth(DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION, UUID, TEXT, TEXT[], TEXT, TEXT, TEXT, TEXT, INT, INT);
DROP FUNCTION IF EXISTS search_restaurants_bounds_source(DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION, UUID, TEXT, TEXT[], TEXT[], TEXT, TEXT, TEXT, TEXT, INT, INT);

-- ── 1. simple: 비로그인 → my_score 항상 NULL ──
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
  has_record BOOLEAN,
  my_score SMALLINT
) LANGUAGE sql STABLE AS $$
  SELECT
    rst.id, rst.name::TEXT, rst.genre::TEXT, rst.district::TEXT, rst.area,
    rst.address::TEXT, rst.lat, rst.lng, rst.phone::TEXT, rst.kakao_map_url::TEXT, rst.prestige,
    FALSE,
    NULL::SMALLINT
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
  ORDER BY rst.name ASC
  LIMIT p_limit + 1 OFFSET p_offset;
$$;

-- ── 2. auth: 로그인 사용자 → correlated subquery로 satisfaction 평균 ──
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
  has_record BOOLEAN,
  my_score SMALLINT
) LANGUAGE sql STABLE AS $$
  SELECT
    sub.id, sub.name, sub.genre, sub.district, sub.area, sub.address,
    sub.lat, sub.lng, sub.phone, sub.kakao_map_url, sub.prestige,
    EXISTS(SELECT 1 FROM records rc WHERE rc.target_id = sub.id AND rc.user_id = p_user_id AND rc.target_type = 'restaurant'),
    sub.my_score
  FROM (
    SELECT rst.id, rst.name::TEXT, rst.genre::TEXT, rst.district::TEXT, rst.area,
           rst.address::TEXT, rst.lat, rst.lng, rst.phone::TEXT, rst.kakao_map_url::TEXT, rst.prestige,
           (SELECT ROUND(AVG(rc.satisfaction))::SMALLINT
            FROM records rc
            WHERE rc.target_id = rst.id
              AND rc.user_id = p_user_id
              AND rc.target_type = 'restaurant'
              AND rc.satisfaction IS NOT NULL
           ) AS my_score
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
  ) sub
  ORDER BY
    CASE WHEN p_sort = 'score_high' THEN COALESCE(sub.my_score, -1) END DESC,
    CASE WHEN p_sort = 'name' THEN sub.name END ASC,
    sub.name ASC
  LIMIT p_limit + 1 OFFSET p_offset;
$$;

-- ── 3. source: source 필터 포함 → correlated subquery로 satisfaction 평균 ──
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
  has_record BOOLEAN,
  my_score SMALLINT
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
    sub.my_score
  FROM (
    SELECT rst.id, rst.name::TEXT, rst.genre::TEXT, rst.district::TEXT, rst.area,
           rst.address::TEXT, rst.lat, rst.lng, rst.phone::TEXT, rst.kakao_map_url::TEXT, rst.prestige,
           (SELECT ROUND(AVG(rc.satisfaction))::SMALLINT
            FROM records rc
            WHERE rc.target_id = rst.id
              AND rc.user_id = p_user_id
              AND rc.target_type = 'restaurant'
              AND rc.satisfaction IS NOT NULL
           ) AS my_score
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
  ) sub
  ORDER BY
    CASE WHEN p_sort = 'score_high' THEN COALESCE(sub.my_score, -1) END DESC,
    CASE WHEN p_sort = 'name' THEN sub.name END ASC,
    sub.name ASC
  LIMIT p_limit + 1 OFFSET p_offset;
END;
$$;
