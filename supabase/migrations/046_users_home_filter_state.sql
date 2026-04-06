ALTER TABLE users ADD COLUMN IF NOT EXISTS home_filter_state JSONB DEFAULT '{}';
COMMENT ON COLUMN users.home_filter_state IS '홈 탭별 필터 칩 상태 (Write-Behind Cache)';
