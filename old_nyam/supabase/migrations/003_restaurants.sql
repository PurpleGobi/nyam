-- 003: 식당 + 식당 통계
-- TECH_SPEC Section 3-2 (restaurants, restaurant_stats)

CREATE TABLE restaurants (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name              VARCHAR NOT NULL,
  address           TEXT NULL,
  region            VARCHAR NULL,
  genre             VARCHAR NULL,
  latitude          DOUBLE PRECISION NULL,
  longitude         DOUBLE PRECISION NULL,
  phone             VARCHAR NULL,
  hours             JSONB NULL,
  source            VARCHAR NULL,
  external_id       VARCHAR NULL,
  external_url      TEXT NULL,
  menu_items        JSONB NULL,
  synced_at         TIMESTAMPTZ NULL,
  created_at        TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE restaurant_stats (
  restaurant_id     UUID PRIMARY KEY REFERENCES restaurants(id) ON DELETE CASCADE,
  record_count      INTEGER DEFAULT 0,
  unique_users      INTEGER DEFAULT 0,
  avg_taste         NUMERIC NULL,
  avg_value         NUMERIC NULL,
  avg_service       NUMERIC NULL,
  avg_atmosphere    NUMERIC NULL,
  avg_cleanliness   NUMERIC NULL,
  avg_portion       NUMERIC NULL,
  avg_overall       NUMERIC NULL,
  latest_record_at  TIMESTAMPTZ NULL,
  updated_at        TIMESTAMPTZ DEFAULT now()
);
