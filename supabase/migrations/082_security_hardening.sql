-- ============================================================
-- 082_security_hardening.sql
-- /cso comprehensive 감사 후속 — 5개 영역 일괄 처리
-- ============================================================
--
-- 1. records RLS 스펙 정렬:
--    - records_authenticated_read (qual=true) 제거 — private_note/purchase_price 전 사용자 노출
--    - AUTH.md §4-5 스펙대로 records_public/records_followers/records_bubble_member_read 추가
--    - records_bubble_shared (077에서 dead policy됨) 정리
--
-- 2. Storage public 버킷 LIST 정책 제거:
--    - 직접 URL 접근은 그대로 (public 버킷). 익명 LIST만 차단.
--
-- 3. bubble_expertise 뷰: SECURITY DEFINER → SECURITY INVOKER
--
-- 4. 19개 함수 search_path 잠금 (mutable search_path 차단)
--
-- 5. trg_notify_cf_update 함수: 하드코딩 JWT → current_setting('app.service_role_key')
--    ※ 사용자가 service_role 키 회전 후 GUC 갱신 필요:
--      ALTER DATABASE postgres SET app.service_role_key TO '<new key>';
-- ============================================================


-- ─── 1. records RLS 스펙 정렬 ───────────────────────────────

DROP POLICY IF EXISTS "records_authenticated_read" ON public.records;
DROP POLICY IF EXISTS "records_bubble_shared" ON public.records;

-- records_public: 작성자가 is_public=true인 기록만 모두에게 SELECT
DROP POLICY IF EXISTS "records_public" ON public.records;
CREATE POLICY "records_public" ON public.records
  FOR SELECT
  USING (
    user_id IN (SELECT id FROM public.users WHERE is_public = true)
  );

-- records_followers: 팔로워가 본 기록 + 작성자 follow_policy != 'blocked'
DROP POLICY IF EXISTS "records_followers" ON public.records;
CREATE POLICY "records_followers" ON public.records
  FOR SELECT
  USING (
    user_id IN (
      SELECT u.id
      FROM public.users u
      JOIN public.follows f ON f.following_id = u.id
      WHERE f.follower_id = auth.uid()
        AND f.status = 'accepted'
        AND COALESCE(u.follow_policy::text, 'blocked') <> 'blocked'
    )
  );

-- records_bubble_member_read: 같은 활성 버블 멤버의 기록 열람
DROP POLICY IF EXISTS "records_bubble_member_read" ON public.records;
CREATE POLICY "records_bubble_member_read" ON public.records
  FOR SELECT
  USING (
    user_id IN (
      SELECT bm2.user_id
      FROM public.bubble_members bm1
      JOIN public.bubble_members bm2 ON bm1.bubble_id = bm2.bubble_id
      WHERE bm1.user_id = auth.uid()
        AND bm1.status = 'active'
        AND bm2.status = 'active'
    )
  );


-- ─── 2. Storage public 버킷 LIST 정책 제거 ──────────────────
-- 공개 버킷의 객체는 직접 URL로 접근 가능. SELECT 정책은 LIST만 가능케 함.

DROP POLICY IF EXISTS "Public read access for avatars" ON storage.objects;
DROP POLICY IF EXISTS "Public read access for record photos" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view record photos" ON storage.objects;


-- ─── 3. bubble_expertise: SECURITY DEFINER → SECURITY INVOKER ─

DROP VIEW IF EXISTS public.bubble_expertise;
CREATE VIEW public.bubble_expertise
WITH (security_invoker = true) AS
SELECT
  bm.bubble_id,
  xt.axis_type,
  xt.axis_value,
  count(DISTINCT bm.user_id)::integer AS member_count,
  avg(xt.level)::integer AS avg_level,
  max(xt.level) AS max_level,
  sum(xt.total_xp) AS total_xp
FROM public.bubble_members bm
JOIN public.xp_totals xt ON xt.user_id = bm.user_id
WHERE bm.status::text = 'active'::text
  AND bm.role::text IN ('owner', 'admin', 'member')
  AND xt.axis_type::text IN ('area', 'genre', 'wine_variety', 'wine_region')
GROUP BY bm.bubble_id, xt.axis_type, xt.axis_value;


-- ─── 4. 함수 search_path 잠금 (Supabase advisor 권고) ───────

ALTER FUNCTION public.refresh_active_xp() SET search_path = public, pg_temp;
ALTER FUNCTION public.sync_restaurant_geom() SET search_path = public, pg_temp;
ALTER FUNCTION public.sync_restaurant_prestige_cache() SET search_path = public, pg_temp;
ALTER FUNCTION public.trg_update_follow_counts() SET search_path = public, pg_temp;
ALTER FUNCTION public.trg_update_user_record_count_v2() SET search_path = public, pg_temp;
ALTER FUNCTION public.trg_notify_cf_update() SET search_path = public, pg_temp, extensions;
ALTER FUNCTION public.prevent_role_self_promotion() SET search_path = public, pg_temp;
ALTER FUNCTION public.normalize_restaurant_name(text) SET search_path = public, pg_temp;
ALTER FUNCTION public.is_mutual_follow(uuid, uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.follow_counts(uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.increment_user_total_xp(uuid, integer) SET search_path = public, pg_temp;
ALTER FUNCTION public.upsert_user_experience(uuid, character varying, character varying, integer, integer) SET search_path = public, pg_temp;
ALTER FUNCTION public.upsert_crawled_restaurants(jsonb) SET search_path = public, pg_temp;
ALTER FUNCTION public.restaurants_within_radius(double precision, double precision, integer) SET search_path = public, pg_temp;
ALTER FUNCTION public.filter_home_restaurants(uuid[], text, text, text, text, integer, text, integer, integer) SET search_path = public, pg_temp;
ALTER FUNCTION public.filter_home_wines(uuid[], text, text, text, integer, text, integer, integer, text, integer, integer) SET search_path = public, pg_temp;
ALTER FUNCTION public.search_restaurants_in_bounds(double precision, double precision, double precision, double precision, uuid, text, text[], text[], text, text, text, text, integer, integer) SET search_path = public, pg_temp;
ALTER FUNCTION public.search_restaurants_bounds_simple(double precision, double precision, double precision, double precision, text, text[], text, text, text, text, integer, integer, double precision, double precision) SET search_path = public, pg_temp;
ALTER FUNCTION public.search_restaurants_bounds_auth(double precision, double precision, double precision, double precision, uuid, text, text[], text, text, text, text, integer, integer, double precision, double precision) SET search_path = public, pg_temp;
ALTER FUNCTION public.search_restaurants_bounds_source(double precision, double precision, double precision, double precision, uuid, text, text[], text[], text, text, text, text, integer, integer, double precision, double precision) SET search_path = public, pg_temp;


-- ─── 5. trg_notify_cf_update: 하드코딩 JWT → GUC 패턴 ────────
-- 019/021/023/052 와 동일 패턴.

CREATE OR REPLACE FUNCTION public.trg_notify_cf_update()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public, pg_temp, extensions
AS $$
DECLARE
  v_url TEXT;
  v_key TEXT;
BEGIN
  v_url := current_setting('app.supabase_url', true) || '/functions/v1/compute-similarity';
  v_key := current_setting('app.service_role_key', true);

  IF v_url IS NULL OR v_key IS NULL OR v_url = '/functions/v1/compute-similarity' THEN
    -- GUC 미설정 시 무음 종료 (트리거가 INSERT/UPDATE 자체를 막지 않음)
    RETURN COALESCE(NEW, OLD);
  END IF;

  IF TG_OP = 'INSERT' AND (NEW.axis_x IS NULL OR NEW.axis_y IS NULL) THEN
    RETURN NULL;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF NEW.axis_x IS NULL AND OLD.axis_x IS NOT NULL THEN
      PERFORM extensions.http_post(
        url := v_url,
        headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || v_key),
        body := jsonb_build_object('user_id', OLD.user_id, 'item_id', OLD.target_id, 'category', OLD.target_type, 'action', 'delete')
      );
      RETURN NEW;
    END IF;
  END IF;

  IF TG_OP = 'DELETE' THEN
    PERFORM extensions.http_post(
      url := v_url,
      headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || v_key),
      body := jsonb_build_object('user_id', OLD.user_id, 'item_id', OLD.target_id, 'category', OLD.target_type, 'action', 'delete')
    );
    RETURN OLD;
  END IF;

  PERFORM extensions.http_post(
    url := v_url,
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || v_key),
    body := jsonb_build_object('user_id', COALESCE(NEW.user_id, OLD.user_id), 'item_id', COALESCE(NEW.target_id, OLD.target_id), 'category', COALESCE(NEW.target_type, OLD.target_type), 'action', LOWER(TG_OP))
  );

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;


-- ─── 6. (참고) GUC 설정 안내 ─────────────────────────────────
-- service_role 키 회전 후 다음을 1회 실행해야 함:
--   ALTER DATABASE postgres SET app.supabase_url      TO 'https://<project-ref>.supabase.co';
--   ALTER DATABASE postgres SET app.service_role_key  TO '<new service_role key>';
-- ※ 이 ALTER는 마이그레이션에 포함하지 않음 (키 자체가 비밀이므로 SQL 파일에 절대 적지 말 것).
