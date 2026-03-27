-- 005_records.sql
-- Nyam v2: records + record_photos 테이블
-- SSOT: DATA_MODEL.md §2 records, record_photos, §9 CHECK 제약

CREATE TABLE records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  target_id UUID NOT NULL,
  target_type VARCHAR(10) NOT NULL,

  -- 상태
  status VARCHAR(10) NOT NULL DEFAULT 'rated',

  -- 와인 분류 (와인 전용)
  wine_status VARCHAR(10),
  camera_mode VARCHAR(10),
  ocr_data JSONB,

  -- 사분면
  axis_x DECIMAL(5,2),
  axis_y DECIMAL(5,2),
  satisfaction INT,
  scene VARCHAR(20),

  -- 와인 전용
  aroma_regions JSONB,
  aroma_labels TEXT[],
  aroma_color VARCHAR(7),
  complexity INT,
  finish DECIMAL(5,2),
  balance DECIMAL(5,2),
  auto_score INT,

  -- 확장 (선택)
  comment VARCHAR(200),
  menu_tags TEXT[],
  pairing_categories TEXT[],
  tips TEXT,
  companions TEXT[],
  companion_count INT,
  total_price INT,
  purchase_price INT,

  -- 날짜
  visit_date DATE,
  meal_time VARCHAR(10),

  -- 연결
  linked_restaurant_id UUID REFERENCES restaurants(id),
  linked_wine_id UUID REFERENCES wines(id),

  has_exif_gps BOOLEAN NOT NULL DEFAULT false,
  is_exif_verified BOOLEAN NOT NULL DEFAULT false,
  record_quality_xp INT NOT NULL DEFAULT 0,
  score_updated_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- CHECK 제약
  CONSTRAINT chk_records_target_type CHECK (target_type IN ('restaurant', 'wine')),
  CONSTRAINT chk_records_status CHECK (status IN ('checked', 'rated', 'draft')),
  CONSTRAINT chk_records_wine_status CHECK (wine_status IS NULL OR wine_status IN ('tasted', 'cellar', 'wishlist')),
  CONSTRAINT chk_records_camera_mode CHECK (camera_mode IS NULL OR camera_mode IN ('individual', 'shelf', 'receipt')),
  CONSTRAINT chk_records_satisfaction CHECK (satisfaction IS NULL OR (satisfaction >= 1 AND satisfaction <= 100)),
  CONSTRAINT chk_records_axis_x CHECK (axis_x IS NULL OR (axis_x >= 0 AND axis_x <= 100)),
  CONSTRAINT chk_records_axis_y CHECK (axis_y IS NULL OR (axis_y >= 0 AND axis_y <= 100)),
  CONSTRAINT chk_records_meal_time CHECK (meal_time IS NULL OR meal_time IN ('breakfast', 'lunch', 'dinner', 'snack')),
  CONSTRAINT chk_records_scene CHECK (scene IS NULL OR scene IN (
    'solo', 'romantic', 'friends', 'family', 'business', 'drinks',
    'gathering', 'pairing', 'gift', 'tasting', 'decanting'
  )),
  CONSTRAINT chk_records_complexity CHECK (complexity IS NULL OR (complexity >= 0 AND complexity <= 100)),
  CONSTRAINT chk_records_finish CHECK (finish IS NULL OR (finish >= 0 AND finish <= 100)),
  CONSTRAINT chk_records_balance CHECK (balance IS NULL OR (balance >= 0 AND balance <= 100))
);

-- DATA_MODEL.md §9: 와인 전용 필드가 식당 기록에 저장되는 것을 방지
ALTER TABLE records ADD CONSTRAINT chk_wine_fields
  CHECK (target_type = 'wine' OR (
    aroma_regions IS NULL AND aroma_labels IS NULL AND aroma_color IS NULL
    AND wine_status IS NULL AND camera_mode IS NULL
    AND ocr_data IS NULL AND complexity IS NULL AND finish IS NULL
    AND balance IS NULL AND auto_score IS NULL AND pairing_categories IS NULL
    AND purchase_price IS NULL
  ));

-- DATA_MODEL.md §9: 식당 전용 필드가 와인 기록에 저장되는 것을 방지
ALTER TABLE records ADD CONSTRAINT chk_restaurant_fields
  CHECK (target_type = 'restaurant' OR (
    total_price IS NULL
  ));

-- 인덱스
CREATE INDEX idx_records_user_type_date ON records(user_id, target_type, visit_date DESC);
CREATE INDEX idx_records_user_satisfaction ON records(user_id, target_type, satisfaction, target_id)
  WHERE satisfaction IS NOT NULL AND status = 'rated';
CREATE INDEX idx_records_target ON records(target_id, target_type);
CREATE INDEX idx_records_scene ON records(scene);
CREATE INDEX idx_records_status ON records(status);
CREATE INDEX idx_records_wine_status ON records(user_id, wine_status) WHERE target_type = 'wine';
CREATE INDEX idx_records_purchase ON records(user_id, visit_date, purchase_price) WHERE purchase_price IS NOT NULL;
CREATE INDEX idx_records_linked_restaurant ON records(linked_restaurant_id) WHERE linked_restaurant_id IS NOT NULL;
CREATE INDEX idx_records_linked_wine ON records(linked_wine_id) WHERE linked_wine_id IS NOT NULL;

-- record_photos
CREATE TABLE record_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  record_id UUID NOT NULL REFERENCES records(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  order_index INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_record_photos_record ON record_photos(record_id, order_index);
