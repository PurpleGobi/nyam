-- 계정 삭제 크론 스케줄 등록
-- 매일 00:30 UTC (= 09:30 KST) 에 process-account-deletion Edge Function 호출
-- 30일 유예 기간 경과 후 delete_mode(anonymize/hard_delete)에 따라 처리
SELECT cron.schedule(
  'daily-process-account-deletion',
  '30 0 * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.supabase_url') || '/functions/v1/process-account-deletion',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);
