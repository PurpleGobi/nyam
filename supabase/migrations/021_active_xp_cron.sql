-- 활성 XP 일일 크론 스케줄 등록
-- 매일 19:00 UTC (= 04:00 KST) 에 refresh-active-xp Edge Function 호출
-- active_xp = 최근 6개월 기록 XP 합산, active_verified = EXIF 검증 기록 수
SELECT cron.schedule(
  'daily-refresh-active-xp',
  '0 19 * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.supabase_url') || '/functions/v1/refresh-active-xp',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);
