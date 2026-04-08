-- CF Phase 2: records 변경 → compute-similarity Edge Function 호출
-- pg_net 확장은 이미 활성화 (021_active_xp_cron.sql에서 사용 중)

-- 1. Trigger 함수: records INSERT/UPDATE/DELETE → Edge Function webhook
CREATE OR REPLACE FUNCTION trg_notify_cf_update()
RETURNS TRIGGER AS $$
BEGIN
  -- INSERT: axis_x/axis_y가 NULL이면 CF 대상 아님
  IF TG_OP = 'INSERT' AND (NEW.axis_x IS NULL OR NEW.axis_y IS NULL) THEN
    RETURN NULL;
  END IF;

  -- UPDATE: 평가 철회(axis NULL로 변경) vs 일반 수정 vs 무관한 변경 분기
  IF TG_OP = 'UPDATE' THEN
    IF NEW.axis_x IS NULL AND OLD.axis_x IS NOT NULL THEN
      -- 평가 철회: 기존 평가가 있었는데 NULL로 변경 → action='DELETE'로 재계산
      PERFORM net.http_post(
        url := current_setting('app.supabase_url') || '/functions/v1/compute-similarity',
        headers := jsonb_build_object(
          'Authorization', 'Bearer ' || current_setting('app.service_role_key'),
          'Content-Type', 'application/json'
        ),
        body := jsonb_build_object(
          'user_id', NEW.user_id,
          'item_id', NEW.target_id,
          'category', NEW.target_type,
          'action', 'DELETE'
        )
      );
      RETURN NULL;
    ELSIF NEW.axis_x IS NOT NULL THEN
      -- 일반 수정: axis 값이 변경됨 → fall through to 공통 호출
      NULL;
    ELSE
      -- 둘 다 NULL (axis 무관한 수정) → 스킵
      RETURN NULL;
    END IF;
  END IF;

  -- 공통 호출: INSERT (axis NOT NULL) 또는 UPDATE (axis 변경) 또는 DELETE
  PERFORM net.http_post(
    url := current_setting('app.supabase_url') || '/functions/v1/compute-similarity',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := jsonb_build_object(
      'user_id', COALESCE(NEW.user_id, OLD.user_id),
      'item_id', COALESCE(NEW.target_id, OLD.target_id),
      'category', COALESCE(NEW.target_type, OLD.target_type),
      'action', TG_OP::text
    )
  );

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 2. Trigger 생성 (3개 분리 — WHEN 조건이 각각 다름)

-- INSERT: 새 기록 추가 시
CREATE TRIGGER after_record_cf_insert
  AFTER INSERT ON records
  FOR EACH ROW
  EXECUTE FUNCTION trg_notify_cf_update();

-- UPDATE: axis_x 또는 axis_y가 실제로 변경된 경우만
CREATE TRIGGER after_record_cf_update
  AFTER UPDATE ON records
  FOR EACH ROW
  WHEN (
    OLD.axis_x IS DISTINCT FROM NEW.axis_x
    OR OLD.axis_y IS DISTINCT FROM NEW.axis_y
  )
  EXECUTE FUNCTION trg_notify_cf_update();

-- DELETE: 평가가 있었던 기록만 (axis_x/axis_y NOT NULL)
CREATE TRIGGER after_record_cf_delete
  AFTER DELETE ON records
  FOR EACH ROW
  WHEN (OLD.axis_x IS NOT NULL AND OLD.axis_y IS NOT NULL)
  EXECUTE FUNCTION trg_notify_cf_update();
