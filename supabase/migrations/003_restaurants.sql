-- 003_restaurants.sql
-- Nyam v2: restaurants 테이블
-- SSOT: DATA_MODEL.md §2 restaurants

CREATE TABLE restaurants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  address TEXT,
  country VARCHAR(50) DEFAULT '한국',
  city VARCHAR(50) DEFAULT '서울',
  area VARCHAR(50),
  district VARCHAR(50),
  genre VARCHAR(30),
  price_range INT,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  phone VARCHAR(20),
  hours JSONB,
  photos TEXT[],
  menus JSONB,

  -- 외부 평점
  naver_rating DECIMAL(2,1),
  kakao_rating DECIMAL(2,1),
  google_rating DECIMAL(2,1),

  -- 권위 인증
  michelin_stars INT,
  has_blue_ribbon BOOLEAN NOT NULL DEFAULT false,
  media_appearances JSONB,

  -- nyam 종합 점수
  nyam_score DECIMAL(4,1),
  nyam_score_updated_at TIMESTAMPTZ,

  -- 캐싱 관리
  external_ids JSONB,
  cached_at TIMESTAMPTZ,
  next_refresh_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- CHECK 제약
  CONSTRAINT chk_restaurants_genre CHECK (genre IS NULL OR genre IN (
    '한식', '일식', '양식', '중식', '이탈리안', '프렌치', '동남아', '태국', '베트남',
    '인도', '스페인', '멕시칸', '아시안', '파인다이닝', '비스트로', '카페', '베이커리', '바', '주점'
  )),
  CONSTRAINT chk_restaurants_price_range CHECK (price_range IS NULL OR (price_range >= 1 AND price_range <= 4)),
  CONSTRAINT chk_restaurants_michelin CHECK (michelin_stars IS NULL OR (michelin_stars >= 1 AND michelin_stars <= 3))
);

-- 인덱스
CREATE INDEX idx_restaurants_area ON restaurants(area);
CREATE INDEX idx_restaurants_country_city ON restaurants(country, city);
CREATE INDEX idx_restaurants_location ON restaurants USING gist(
  ST_MakePoint(lng, lat)
) WHERE lng IS NOT NULL AND lat IS NOT NULL;
