-- ============================================================
-- 083_restaurant_enrichment.sql
-- 회원 리뷰 없는 식당을 위한 외부 정보 AI 요약 + 사진 폴백 캐시
-- ============================================================
--
-- 배경:
--   카카오 크롤링으로 시드된 식당 다수는 회원 리뷰가 0건이어서
--   식당 상세 페이지가 정보 공백 상태. 외부 웹(Tavily/네이버/구글)
--   자료를 수집 → Gemini로 1회 요약 → DB 캐싱.
--
-- 정책:
--   - 외부 리뷰 원문 저장 금지 (저작권). URL + 메타데이터 + AI 생성물만.
--   - 20자 이내 직접 인용만 허용. 출처 source_ids로 역추적.
--   - 사진은 Google Places Photos URL 참조만 (저장 금지, attribution 의무).
--   - TTL 30일. expires_at 이후 재생성.
--
-- RLS:
--   - SELECT: 모든 유저(anon 포함). 공용 참조 데이터.
--   - INSERT/UPDATE/DELETE: service_role만 (Edge Function 전용).
-- ============================================================

CREATE TABLE IF NOT EXISTS public.restaurant_enrichment (
  restaurant_id UUID PRIMARY KEY REFERENCES public.restaurants(id) ON DELETE CASCADE,

  -- 수집된 원본 소스 목록 (AI가 참조한 인덱스와 매핑)
  -- 구조: [{ id: number, type: string, url: string, title: string, fetched_at: string }]
  -- type enum: naver_blog | naver_local | naver_news | google_review | google_place
  --            | youtube | kakao_local | other_web
  sources JSONB NOT NULL DEFAULT '[]'::jsonb,

  -- AI 요약 (Gemini 1회 호출 결과)
  -- 구조:
  -- {
  --   pros: [{ text, quote?, source_ids: number[] }],
  --   cons: [{ text, quote?, source_ids: number[] }],
  --   atmosphere: { tags: string[], source_ids: number[] },
  --   price_range: { text, source_ids: number[] },
  --   signatures: [{ name, mention_count, source_ids: number[] }],
  --   overall_note: string
  -- }
  ai_summary JSONB,

  -- 외부 평점 배지
  -- 구조: { naver: { rating, count, url }, google: { rating, count, url } }
  external_ratings JSONB,

  -- 사진 URL 배열 (Google Places Photos — 직접 참조만)
  photo_urls TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  -- 각 사진별 attribution 문자열 (photo_urls 배열과 동일 순서)
  photo_attributions TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],

  -- 상태 머신
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'done', 'failed')),
  error_message TEXT,

  -- 메타
  enriched_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '30 days'),
  source_version INT NOT NULL DEFAULT 1,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT chk_enrichment_photo_arrays_len
    CHECK (array_length(photo_urls, 1) IS NOT DISTINCT FROM array_length(photo_attributions, 1))
);

-- 만료 기반 재생성 스캔용
CREATE INDEX IF NOT EXISTS idx_enrichment_expires
  ON public.restaurant_enrichment (expires_at);

-- 진행 중 상태 조회용
CREATE INDEX IF NOT EXISTS idx_enrichment_status
  ON public.restaurant_enrichment (status)
  WHERE status IN ('pending', 'processing', 'failed');

-- updated_at 자동 갱신 트리거
CREATE OR REPLACE FUNCTION public.sync_restaurant_enrichment_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_restaurant_enrichment_updated_at ON public.restaurant_enrichment;
CREATE TRIGGER trg_restaurant_enrichment_updated_at
  BEFORE UPDATE ON public.restaurant_enrichment
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_restaurant_enrichment_updated_at();

-- ─── RLS ────────────────────────────────────────────────────

ALTER TABLE public.restaurant_enrichment ENABLE ROW LEVEL SECURITY;

-- 모든 사용자(anon/authenticated) 공용 SELECT — 공개 참조 데이터
DROP POLICY IF EXISTS "restaurant_enrichment_read_all" ON public.restaurant_enrichment;
CREATE POLICY "restaurant_enrichment_read_all"
  ON public.restaurant_enrichment
  FOR SELECT
  USING (true);

-- INSERT/UPDATE/DELETE는 service_role(Edge Function)만.
-- Supabase에서 service_role은 RLS를 기본 bypass하므로 별도 정책 불필요.
-- authenticated/anon에 대한 쓰기 정책을 만들지 않음으로써 기본 DENY.

COMMENT ON TABLE public.restaurant_enrichment IS
  '회원 리뷰 없는 식당용 외부 정보 AI 요약 + 사진 캐시. 30일 TTL. 원문 저장 금지.';
