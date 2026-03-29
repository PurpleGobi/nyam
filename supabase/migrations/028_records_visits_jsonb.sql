-- 028_records_visits_jsonb.sql
-- records 테이블에 visits JSONB 컬럼 추가
-- 기존 per-row visit 데이터를 JSONB 배열로 통합
--
-- visits 구조:
-- [{"date":"2025-03-15","axisX":72,"axisY":65,"satisfaction":82,
--   "comment":"오마카세 좋았다","tips":"예약 필수","scene":"friends",
--   "mealTime":"dinner","companions":["김OO"],"companionCount":2,
--   "totalPrice":150000,"purchasePrice":null,
--   "aromaRegions":null,"aromaLabels":null,"aromaColor":null,
--   "complexity":null,"finish":null,"balance":null,"autoScore":null,
--   "hasExifGps":false,"isExifVerified":false}]

-- Step 1: visits 컬럼 추가
ALTER TABLE records ADD COLUMN visits JSONB NOT NULL DEFAULT '[]';

-- Step 2: 비정규화 캐시 컬럼 추가
ALTER TABLE records ADD COLUMN visit_count INT NOT NULL DEFAULT 0;
ALTER TABLE records ADD COLUMN latest_visit_date DATE;
ALTER TABLE records ADD COLUMN avg_satisfaction DECIMAL(4,1);

-- Step 3: 기존 데이터를 visits 배열로 이전
UPDATE records SET
  visits = jsonb_build_array(
    jsonb_strip_nulls(jsonb_build_object(
      'date', COALESCE(visit_date::text, created_at::date::text),
      'axisX', axis_x,
      'axisY', axis_y,
      'satisfaction', satisfaction,
      'comment', comment,
      'tips', tips,
      'scene', scene,
      'mealTime', meal_time,
      'companions', CASE WHEN companions IS NOT NULL THEN to_jsonb(companions) ELSE NULL END,
      'companionCount', companion_count,
      'totalPrice', total_price,
      'purchasePrice', purchase_price,
      'aromaRegions', aroma_regions,
      'aromaLabels', CASE WHEN aroma_labels IS NOT NULL THEN to_jsonb(aroma_labels) ELSE NULL END,
      'aromaColor', aroma_color,
      'complexity', complexity,
      'finish', finish,
      'balance', balance,
      'autoScore', auto_score,
      'hasExifGps', has_exif_gps,
      'isExifVerified', is_exif_verified
    ))
  ),
  visit_count = 1,
  latest_visit_date = COALESCE(visit_date, created_at::date),
  avg_satisfaction = satisfaction
WHERE status = 'rated' OR axis_x IS NOT NULL OR comment IS NOT NULL;

-- checked 상태 (미평가)는 빈 visits
UPDATE records SET visit_count = 0
WHERE status = 'checked' AND visits = '[]';

-- Step 4: 이전된 컬럼 제거
ALTER TABLE records
  DROP COLUMN axis_x,
  DROP COLUMN axis_y,
  DROP COLUMN satisfaction,
  DROP COLUMN comment,
  DROP COLUMN tips,
  DROP COLUMN scene,
  DROP COLUMN meal_time,
  DROP COLUMN companions,
  DROP COLUMN companion_count,
  DROP COLUMN total_price,
  DROP COLUMN purchase_price,
  DROP COLUMN aroma_regions,
  DROP COLUMN aroma_labels,
  DROP COLUMN aroma_color,
  DROP COLUMN complexity,
  DROP COLUMN finish,
  DROP COLUMN balance,
  DROP COLUMN auto_score,
  DROP COLUMN has_exif_gps,
  DROP COLUMN is_exif_verified,
  DROP COLUMN visit_date,
  DROP COLUMN score_updated_at;

-- Step 5: 불필요해진 CHECK 제약 제거 (컬럼 삭제로 자동 제거되지만 명시적으로)
-- chk_records_satisfaction, chk_records_axis_x, chk_records_axis_y,
-- chk_records_meal_time, chk_records_scene, chk_records_complexity,
-- chk_records_finish, chk_records_balance, chk_wine_fields, chk_restaurant_fields
-- → 컬럼 DROP 시 자동 제거됨

-- Step 6: 기존 인덱스 정리 (컬럼 삭제로 자동 제거)
-- idx_records_user_type_date, idx_records_user_satisfaction,
-- idx_records_scene, idx_records_purchase
-- → 컬럼 DROP 시 자동 제거됨

-- Step 7: 새 인덱스
CREATE INDEX idx_records_user_target ON records(user_id, target_id, target_type);
CREATE INDEX idx_records_latest_visit ON records(user_id, target_type, latest_visit_date DESC);
CREATE INDEX idx_records_wine_status ON records(user_id, wine_status) WHERE target_type = 'wine';
