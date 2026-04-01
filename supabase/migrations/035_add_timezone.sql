-- 사용자 타임존 설정 컬럼 추가
-- 기본값 NULL: 클라이언트에서 브라우저 timezone 자동 감지 후 저장
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS pref_timezone TEXT DEFAULT NULL;

COMMENT ON COLUMN public.users.pref_timezone IS '사용자 타임존 (IANA, e.g. Asia/Seoul). NULL이면 클라이언트에서 자동 감지';
