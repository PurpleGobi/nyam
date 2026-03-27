-- 014_rpc_nearby.sql
-- PostGIS 기반 근처 식당 조회 RPC 함수
-- SSOT: SEARCH_REGISTER.md §3, RATING_ENGINE.md §9

CREATE OR REPLACE FUNCTION restaurants_within_radius(
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  radius_meters INT DEFAULT 2000
)
RETURNS TABLE (
  id UUID,
  name VARCHAR(100),
  genre VARCHAR(30),
  area VARCHAR(50),
  distance DOUBLE PRECISION
)
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
  SELECT
    r.id,
    r.name,
    r.genre,
    r.area,
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
