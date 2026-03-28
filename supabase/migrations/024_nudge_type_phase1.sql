-- 설계 §6: Phase 1 넛지 타입을 photo, unrated, meal_time 3종으로 제한
-- 기존: location, time, photo, unrated, new_area, weekly
-- 변경: photo, unrated, meal_time

-- 1. 기존 'time' → 'meal_time' 변환
UPDATE nudge_history SET nudge_type = 'meal_time' WHERE nudge_type = 'time';

-- 2. Phase 1 미사용 타입 데이터 삭제
DELETE FROM nudge_history WHERE nudge_type IN ('location', 'new_area', 'weekly');

-- 3. CHECK 제약 교체
ALTER TABLE nudge_history DROP CONSTRAINT chk_nudge_type;
ALTER TABLE nudge_history ADD CONSTRAINT chk_nudge_type
  CHECK (nudge_type IN ('photo', 'unrated', 'meal_time'));
