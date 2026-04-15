-- CF 트리거: records 변경 → compute-similarity Edge Function 호출
-- pg_net 확장으로 비동기 HTTP POST

CREATE EXTENSION IF NOT EXISTS pg_net SCHEMA extensions;

-- 트리거 함수
CREATE OR REPLACE FUNCTION trg_notify_cf_update()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_url TEXT := 'https://gfshmpuuafjvwsgrxnie.supabase.co/functions/v1/compute-similarity';
  v_key TEXT := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdmc2htcHV1YWZqdndzZ3J4bmllIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzU1MzY2OSwiZXhwIjoyMDg5MTI5NjY5fQ.skVu-Nk92JL6EkmjQnu7xcz5XR-tJc7BAxO7x9qSnYo';
  v_headers JSONB;
BEGIN
  v_headers := jsonb_build_object('Authorization', 'Bearer ' || v_key, 'Content-Type', 'application/json');

  IF TG_OP = 'INSERT' AND (NEW.axis_x IS NULL OR NEW.axis_y IS NULL) THEN
    RETURN NULL;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF NEW.axis_x IS NULL AND OLD.axis_x IS NOT NULL THEN
      PERFORM net.http_post(
        url := v_url,
        body := jsonb_build_object('user_id', NEW.user_id, 'item_id', NEW.target_id, 'category', NEW.target_type, 'action', 'DELETE'),
        headers := v_headers
      );
      RETURN NULL;
    ELSIF NEW.axis_x IS NOT NULL THEN
      NULL;
    ELSE
      RETURN NULL;
    END IF;
  END IF;

  PERFORM net.http_post(
    url := v_url,
    body := jsonb_build_object('user_id', COALESCE(NEW.user_id, OLD.user_id), 'item_id', COALESCE(NEW.target_id, OLD.target_id), 'category', COALESCE(NEW.target_type, OLD.target_type), 'action', TG_OP::text),
    headers := v_headers
  );

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 트리거 3개
CREATE TRIGGER after_record_cf_insert
  AFTER INSERT ON records FOR EACH ROW EXECUTE FUNCTION trg_notify_cf_update();

CREATE TRIGGER after_record_cf_update
  AFTER UPDATE ON records FOR EACH ROW
  WHEN (OLD.axis_x IS DISTINCT FROM NEW.axis_x OR OLD.axis_y IS DISTINCT FROM NEW.axis_y)
  EXECUTE FUNCTION trg_notify_cf_update();

CREATE TRIGGER after_record_cf_delete
  AFTER DELETE ON records FOR EACH ROW
  WHEN (OLD.axis_x IS NOT NULL AND OLD.axis_y IS NOT NULL)
  EXECUTE FUNCTION trg_notify_cf_update();
