-- 017_xp_functions.sql
-- XP 엔진 DB 함수: 원자적 XP 갱신 + detail_axis reason 추가
-- SSOT: XP_SYSTEM.md §4, S6_xp_profile/01_xp_engine.md §4

-- 1. xp_histories.reason CHECK에 'detail_axis' 추가
ALTER TABLE xp_histories DROP CONSTRAINT IF EXISTS chk_xp_reason;
ALTER TABLE xp_histories ADD CONSTRAINT chk_xp_reason CHECK (reason IN (
  'record_name', 'record_score', 'record_photo', 'record_full',
  'detail_axis', 'category',
  'social_share', 'social_like', 'social_follow', 'social_mutual',
  'bonus_onboard', 'bonus_first_record', 'bonus_first_bubble', 'bonus_first_share',
  'milestone', 'revisit'
));

-- 2. 원자적 users.total_xp 증가 함수
CREATE OR REPLACE FUNCTION increment_user_total_xp(
  p_user_id UUID,
  p_xp_delta INT
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE users
  SET total_xp = total_xp + p_xp_delta,
      updated_at = NOW()
  WHERE id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User % not found', p_user_id;
  END IF;
END;
$$;

-- 3. 원자적 user_experiences upsert 함수
CREATE OR REPLACE FUNCTION upsert_user_experience(
  p_user_id UUID,
  p_axis_type VARCHAR(20),
  p_axis_value VARCHAR(50),
  p_xp_delta INT,
  p_new_level INT
)
RETURNS SETOF user_experiences
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  INSERT INTO user_experiences (user_id, axis_type, axis_value, total_xp, level, updated_at)
  VALUES (p_user_id, p_axis_type, p_axis_value, p_xp_delta, p_new_level, NOW())
  ON CONFLICT (user_id, axis_type, axis_value)
  DO UPDATE SET
    total_xp = user_experiences.total_xp + p_xp_delta,
    level = p_new_level,
    updated_at = NOW()
  RETURNING *;
END;
$$;

-- 4. 활성 XP 갱신 함수 (크론용)
-- active_xp = 최근 6개월 기록의 record_quality_xp 합산
-- active_verified = 최근 6개월 EXIF 검증 기록 수
-- SSOT: XP_SYSTEM.md, 01_xp_engine.md §4
CREATE OR REPLACE FUNCTION refresh_active_xp()
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE users SET
    active_xp = COALESCE((
      SELECT SUM(record_quality_xp) FROM records
      WHERE records.user_id = users.id
        AND records.created_at > NOW() - INTERVAL '6 months'
    ), 0),
    active_verified = COALESCE((
      SELECT COUNT(*) FROM records
      WHERE records.user_id = users.id
        AND records.is_exif_verified = true
        AND records.created_at > NOW() - INTERVAL '6 months'
    ), 0),
    updated_at = NOW();
END;
$$;
