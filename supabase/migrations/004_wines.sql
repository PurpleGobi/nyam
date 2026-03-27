-- 004_wines.sql
-- Nyam v2: wines + grape_variety_profiles 테이블
-- SSOT: DATA_MODEL.md §2 wines, §5-3 포도 품종 프로필

CREATE TABLE wines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,
  producer VARCHAR(100),
  region VARCHAR(100),
  sub_region VARCHAR(100),
  country VARCHAR(50),
  variety VARCHAR(100),
  grape_varieties JSONB,
  wine_type VARCHAR(20) NOT NULL,
  vintage INT,
  abv DECIMAL(3,1),
  label_image_url TEXT,
  photos TEXT[],

  -- 와인 DB 메타
  body_level INT,
  acidity_level INT,
  sweetness_level INT,
  food_pairings TEXT[],
  serving_temp VARCHAR(20),
  decanting VARCHAR(30),

  reference_price INT,
  drinking_window_start INT,
  drinking_window_end INT,

  -- 외부 평점
  vivino_rating DECIMAL(2,1),
  critic_scores JSONB,

  -- 권위 인증
  classification VARCHAR(100),

  -- nyam 종합 점수
  nyam_score DECIMAL(4,1),
  nyam_score_updated_at TIMESTAMPTZ,

  -- 캐싱 관리
  external_ids JSONB,
  cached_at TIMESTAMPTZ,
  next_refresh_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- CHECK 제약
  CONSTRAINT chk_wines_type CHECK (wine_type IN ('red', 'white', 'rose', 'sparkling', 'orange', 'fortified', 'dessert')),
  CONSTRAINT chk_wines_body_level CHECK (body_level IS NULL OR (body_level >= 1 AND body_level <= 5)),
  CONSTRAINT chk_wines_acidity_level CHECK (acidity_level IS NULL OR (acidity_level >= 1 AND acidity_level <= 3)),
  CONSTRAINT chk_wines_sweetness_level CHECK (sweetness_level IS NULL OR (sweetness_level >= 1 AND sweetness_level <= 3))
);

-- 인덱스
CREATE INDEX idx_wines_type ON wines(wine_type);
CREATE INDEX idx_wines_country ON wines(country);
CREATE INDEX idx_wines_region ON wines(country, region, sub_region);

-- 포도 품종 프로필 (통계 차트 정렬용 참조 테이블)
CREATE TABLE grape_variety_profiles (
  name VARCHAR(100) PRIMARY KEY,
  name_ko VARCHAR(100) NOT NULL,
  body_order INT NOT NULL,
  category VARCHAR(10) NOT NULL,
  typical_body INT,
  typical_acidity INT,
  typical_tannin INT,

  CONSTRAINT chk_gvp_category CHECK (category IN ('red', 'white'))
);

-- 시드 데이터: 20종 (DATA_MODEL.md §5-3 정렬 순서 기준)
INSERT INTO grape_variety_profiles (name, name_ko, body_order, category, typical_body, typical_acidity, typical_tannin) VALUES
  ('Muscat', '뮈스카', 1, 'white', 2, 1, NULL),
  ('Riesling', '리슬링', 2, 'white', 2, 3, NULL),
  ('Sauvignon Blanc', '소비뇽 블랑', 3, 'white', 2, 3, NULL),
  ('Pinot Grigio', '피노 그리', 4, 'white', 2, 2, NULL),
  ('Pinot Noir', '피노 누아', 5, 'red', 2, 3, 2),
  ('Gamay', '가메', 6, 'red', 2, 3, 1),
  ('Barbera', '바르베라', 7, 'red', 3, 3, 2),
  ('Chardonnay', '샤르도네', 8, 'white', 3, 2, NULL),
  ('Grenache', '그르나슈', 9, 'red', 3, 2, 2),
  ('Merlot', '메를로', 10, 'red', 3, 2, 3),
  ('Sangiovese', '산지오베제', 11, 'red', 3, 3, 3),
  ('Viognier', '비오니에', 12, 'white', 4, 1, NULL),
  ('Tempranillo', '템프라니요', 13, 'red', 4, 2, 3),
  ('Syrah', '쉬라즈', 14, 'red', 4, 2, 4),
  ('Nebbiolo', '네비올로', 15, 'red', 4, 3, 5),
  ('Malbec', '말벡', 16, 'red', 4, 2, 4),
  ('Cabernet Sauvignon', '카베르네 소비뇽', 17, 'red', 5, 2, 5),
  ('Mourvedre', '무르베드르', 18, 'red', 5, 2, 4),
  ('Tannat', '타나', 19, 'red', 5, 2, 5),
  ('Petit Verdot', '프티 베르도', 20, 'red', 5, 2, 5);
