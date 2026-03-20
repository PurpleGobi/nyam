-- 012: 약관 동의 기록
-- 기존 사용자는 이미 동의한 것으로 처리, 신규 사용자만 동의 UI 표시

ALTER TABLE users ADD COLUMN terms_agreed_at TIMESTAMPTZ NULL;

-- 기존 사용자들은 이미 동의한 것으로 간주
UPDATE users SET terms_agreed_at = created_at WHERE terms_agreed_at IS NULL;
