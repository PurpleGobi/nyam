-- 039_fix_pref_check_constraints.sql
-- DB CHECK 제약을 실제 코드 값에 맞춤
--
-- pref_view_mode: 'detailed'/'compact' → 'card'/'list' (UI 표준 용어)
-- pref_restaurant_sub: 미사용 'recommended' 제거

-- Step 1: 기존 데이터 마이그레이션
UPDATE users SET pref_view_mode = 'card' WHERE pref_view_mode = 'detailed';
UPDATE users SET pref_view_mode = 'list' WHERE pref_view_mode = 'compact';
UPDATE users SET pref_restaurant_sub = 'last' WHERE pref_restaurant_sub = 'recommended';

-- Step 2: CHECK 제약 교체
ALTER TABLE users DROP CONSTRAINT IF EXISTS chk_users_pref_view_mode;
ALTER TABLE users ADD CONSTRAINT chk_users_pref_view_mode
  CHECK (pref_view_mode IN ('last', 'card', 'list', 'calendar'));

ALTER TABLE users DROP CONSTRAINT IF EXISTS chk_users_pref_restaurant_sub;
ALTER TABLE users ADD CONSTRAINT chk_users_pref_restaurant_sub
  CHECK (pref_restaurant_sub IN ('last', 'visited', 'wishlist', 'following'));
