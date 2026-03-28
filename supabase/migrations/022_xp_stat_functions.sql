-- 022_xp_stat_functions.sql
-- XP 통계 RPC 함수: LevelDetailSheet에서 축별 통계 조회용
-- SSOT: S6_xp_profile/01_xp_engine.md §4 통계 조회

-- 1. 축별 고유 장소/와인 수
-- area → 해당 지역의 고유 식당 수
-- genre → 해당 장르의 고유 식당 수
-- wine_region → 해당 산지의 고유 와인 수
-- wine_variety → 해당 품종의 고유 와인 수
CREATE OR REPLACE FUNCTION get_unique_count(
  p_user_id UUID,
  p_axis_type VARCHAR(20),
  p_axis_value VARCHAR(50)
)
RETURNS INT
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_count INT;
BEGIN
  IF p_axis_type = 'area' THEN
    SELECT COUNT(DISTINCT r.target_id) INTO v_count
    FROM records r
    JOIN restaurants rest ON rest.id = r.target_id
    WHERE r.user_id = p_user_id
      AND r.target_type = 'restaurant'
      AND r.status = 'rated'
      AND rest.area = p_axis_value;

  ELSIF p_axis_type = 'genre' THEN
    SELECT COUNT(DISTINCT r.target_id) INTO v_count
    FROM records r
    JOIN restaurants rest ON rest.id = r.target_id
    WHERE r.user_id = p_user_id
      AND r.target_type = 'restaurant'
      AND r.status = 'rated'
      AND rest.genre = p_axis_value;

  ELSIF p_axis_type = 'wine_region' THEN
    SELECT COUNT(DISTINCT r.target_id) INTO v_count
    FROM records r
    JOIN wines w ON w.id = r.target_id
    WHERE r.user_id = p_user_id
      AND r.target_type = 'wine'
      AND r.status = 'rated'
      AND w.region = p_axis_value;

  ELSIF p_axis_type = 'wine_variety' THEN
    SELECT COUNT(DISTINCT r.target_id) INTO v_count
    FROM records r
    JOIN wines w ON w.id = r.target_id
    WHERE r.user_id = p_user_id
      AND r.target_type = 'wine'
      AND r.status = 'rated'
      AND w.variety = p_axis_value;

  ELSE
    v_count := 0;
  END IF;

  RETURN COALESCE(v_count, 0);
END;
$$;

-- 2. 축별 총 기록 수
CREATE OR REPLACE FUNCTION get_record_count_by_axis(
  p_user_id UUID,
  p_axis_type VARCHAR(20),
  p_axis_value VARCHAR(50)
)
RETURNS INT
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_count INT;
BEGIN
  IF p_axis_type = 'area' THEN
    SELECT COUNT(*) INTO v_count
    FROM records r
    JOIN restaurants rest ON rest.id = r.target_id
    WHERE r.user_id = p_user_id
      AND r.target_type = 'restaurant'
      AND r.status = 'rated'
      AND rest.area = p_axis_value;

  ELSIF p_axis_type = 'genre' THEN
    SELECT COUNT(*) INTO v_count
    FROM records r
    JOIN restaurants rest ON rest.id = r.target_id
    WHERE r.user_id = p_user_id
      AND r.target_type = 'restaurant'
      AND r.status = 'rated'
      AND rest.genre = p_axis_value;

  ELSIF p_axis_type = 'wine_region' THEN
    SELECT COUNT(*) INTO v_count
    FROM records r
    JOIN wines w ON w.id = r.target_id
    WHERE r.user_id = p_user_id
      AND r.target_type = 'wine'
      AND r.status = 'rated'
      AND w.region = p_axis_value;

  ELSIF p_axis_type = 'wine_variety' THEN
    SELECT COUNT(*) INTO v_count
    FROM records r
    JOIN wines w ON w.id = r.target_id
    WHERE r.user_id = p_user_id
      AND r.target_type = 'wine'
      AND r.status = 'rated'
      AND w.variety = p_axis_value;

  ELSE
    v_count := 0;
  END IF;

  RETURN COALESCE(v_count, 0);
END;
$$;

-- 3. 축별 재방문 수 (같은 target_id로 2회 이상 기록한 고유 장소/와인 수)
CREATE OR REPLACE FUNCTION get_revisit_count_by_axis(
  p_user_id UUID,
  p_axis_type VARCHAR(20),
  p_axis_value VARCHAR(50)
)
RETURNS INT
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_count INT;
BEGIN
  IF p_axis_type = 'area' THEN
    SELECT COUNT(*) INTO v_count
    FROM (
      SELECT r.target_id
      FROM records r
      JOIN restaurants rest ON rest.id = r.target_id
      WHERE r.user_id = p_user_id
        AND r.target_type = 'restaurant'
        AND r.status = 'rated'
        AND rest.area = p_axis_value
      GROUP BY r.target_id
      HAVING COUNT(*) >= 2
    ) sub;

  ELSIF p_axis_type = 'genre' THEN
    SELECT COUNT(*) INTO v_count
    FROM (
      SELECT r.target_id
      FROM records r
      JOIN restaurants rest ON rest.id = r.target_id
      WHERE r.user_id = p_user_id
        AND r.target_type = 'restaurant'
        AND r.status = 'rated'
        AND rest.genre = p_axis_value
      GROUP BY r.target_id
      HAVING COUNT(*) >= 2
    ) sub;

  ELSIF p_axis_type = 'wine_region' THEN
    SELECT COUNT(*) INTO v_count
    FROM (
      SELECT r.target_id
      FROM records r
      JOIN wines w ON w.id = r.target_id
      WHERE r.user_id = p_user_id
        AND r.target_type = 'wine'
        AND r.status = 'rated'
        AND w.region = p_axis_value
      GROUP BY r.target_id
      HAVING COUNT(*) >= 2
    ) sub;

  ELSIF p_axis_type = 'wine_variety' THEN
    SELECT COUNT(*) INTO v_count
    FROM (
      SELECT r.target_id
      FROM records r
      JOIN wines w ON w.id = r.target_id
      WHERE r.user_id = p_user_id
        AND r.target_type = 'wine'
        AND r.status = 'rated'
        AND w.variety = p_axis_value
      GROUP BY r.target_id
      HAVING COUNT(*) >= 2
    ) sub;

  ELSE
    v_count := 0;
  END IF;

  RETURN COALESCE(v_count, 0);
END;
$$;
