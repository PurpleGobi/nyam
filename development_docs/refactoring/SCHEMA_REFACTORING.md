# 스키마 리팩토링 계획

> 참조: `docs/Nyam 개념문서/백앤드스키마.md`

---

## 변경 개요

| Phase | 변경 | 규모 | 위험도 |
|-------|------|------|--------|
| 1 | 불필요 테이블 삭제 (5개) + 관련 코드 정리 | 중 | 낮음 |
| 2 | record_photos에 thumbnail_url 추가 | 소 | 낮음 |
| 3 | bubble_shares 비정규화 (target_id, target_type 추가) | 소 | 낮음 |
| 4 | XP 테이블 리네이밍 + xp_seed_rules 신규 | 중 | 중간 |
| 5 | records + wishlists → lists + records (핵심 변경) | 대 | 높음 |

**실행 순서 근거**: Phase 5가 가장 크고 위험하므로 마지막. 1~4로 코드베이스를 정리한 뒤 진행. Phase 3은 Phase 5보다 먼저 실행해야 함 (bubble_shares가 구 records의 target_id를 복사하는 시점이 records 구조 변경 전이어야 안전).

---

## Phase 1: 불필요 테이블 삭제

### 대상
- `nudge_history`, `nudge_fatigue`
- `grape_variety_profiles`
- `ai_recommendations`
- `bubble_share_reads`

### 마이그레이션
```sql
-- 031_drop_unused_tables.sql
DROP TABLE IF EXISTS bubble_share_reads CASCADE;
DROP TABLE IF EXISTS nudge_history CASCADE;
DROP TABLE IF EXISTS nudge_fatigue CASCADE;
DROP TABLE IF EXISTS grape_variety_profiles CASCADE;
DROP TABLE IF EXISTS ai_recommendations CASCADE;
```

### 삭제할 코드 파일

**넛지 관련 (전부 삭제):**
- `src/domain/entities/nudge.ts`
- `src/domain/repositories/nudge-repository.ts`
- `src/domain/services/nudge-priority.ts`
- `src/infrastructure/repositories/supabase-nudge-repository.ts`
- `src/application/hooks/use-nudge.ts`
- `src/presentation/components/ui/nudge-strip.tsx`
- `src/presentation/components/ui/nudge-card.tsx`
- `src/presentation/components/home/nudge-strip.tsx`

**AI 추천 관련 (전부 삭제):**
- `src/domain/entities/recommendation.ts`
- `src/domain/repositories/recommendation-repository.ts`
- `src/domain/services/recommendation-service.ts`
- `src/infrastructure/repositories/supabase-recommendation-repository.ts`
- `src/app/api/recommend/` — 디렉토리 전체 삭제 (dismiss, authority, bubble, revisit, scene, wine-pairing)

### 수정할 파일
- `src/shared/di/container.ts` — nudgeRepo, recommendationRepo 제거
- `src/infrastructure/supabase/types.ts` — nudge_history, nudge_fatigue, grape_variety_profiles, ai_recommendations, bubble_share_reads 타입 제거
- `src/presentation/containers/home-container.tsx` — nudge, recommendation 관련 import/사용 제거
- `src/app/globals.css` — nudge 관련 스타일 제거 (있으면)

### 검증
- [ ] `pnpm build` 에러 없음
- [ ] `pnpm lint` 경고 0개
- [ ] 삭제한 파일을 import하는 곳 없음 (grep 확인)

---

## Phase 2: record_photos에 thumbnail_url 추가

### 마이그레이션
```sql
-- 032_record_photos_thumbnail.sql
ALTER TABLE record_photos ADD COLUMN thumbnail_url TEXT;
```

### 수정할 파일

**도메인:**
- `src/domain/entities/record-photo.ts` — thumbnailUrl 필드 추가

**인프라:**
- `src/infrastructure/supabase/types.ts` — record_photos 타입에 thumbnail_url 추가
- `src/infrastructure/repositories/supabase-photo-repository.ts` — thumbnail_url 포함해서 INSERT/SELECT
- `src/infrastructure/storage/image-upload.ts` — 업로드 시 썸네일 생성 + 저장 로직 추가

**프레젠테이션 (thumbnail_url 우선 사용으로 변경):**
- `src/presentation/components/record/photo-gallery.tsx`
- `src/presentation/components/detail/hero-carousel.tsx`
- `src/presentation/components/home/compact-list-item.tsx`
- `src/presentation/components/ui/compact-list-item.tsx`
- `src/presentation/components/bubbler/picks-grid.tsx`
- `src/presentation/components/bubbler/recent-records.tsx`

### 검증
- [ ] 사진 업로드 시 원본 + 썸네일 모두 저장됨
- [ ] 목록 화면에서 thumbnail_url 사용, 상세에서 url 사용
- [ ] thumbnail_url이 NULL인 기존 데이터에서 url로 폴백

---

## Phase 3: bubble_shares 비정규화

### 마이그레이션
```sql
-- 033_bubble_shares_denormalize.sql
ALTER TABLE bubble_shares ADD COLUMN target_id UUID;
ALTER TABLE bubble_shares ADD COLUMN target_type VARCHAR(10);

-- 기존 데이터 채우기 (구 records 구조 기준)
UPDATE bubble_shares bs
SET target_id = r.target_id, target_type = r.target_type
FROM records r
WHERE bs.record_id = r.id;

-- NOT NULL 제약 추가
ALTER TABLE bubble_shares ALTER COLUMN target_id SET NOT NULL;
ALTER TABLE bubble_shares ALTER COLUMN target_type SET NOT NULL;

-- 인덱스
CREATE INDEX idx_bubble_shares_target ON bubble_shares(target_id, target_type, bubble_id);
```

### 수정할 파일

**도메인:**
- `src/domain/entities/bubble.ts` — BubbleShare 엔티티에 targetId, targetType 추가

**인프라:**
- `src/infrastructure/supabase/types.ts` — bubble_shares 타입 수정
- `src/infrastructure/repositories/supabase-bubble-repository.ts` — 공유 시 target_id, target_type 같이 INSERT, 식당별 조회 시 records JOIN 제거

**도메인 서비스:**
- `src/domain/services/bubble-share-sync.ts` — target_id, target_type 포함

**애플리케이션:**
- `src/application/hooks/use-bubble-auto-sync.ts` — 동기화 시 target 정보 포함

### RLS 정책
- `012_rls.sql`의 bubble_shares 관련 정책 확인 — 새 컬럼에 대한 추가 정책 필요 여부 검토

### 검증
- [ ] 기록 공유 시 target_id, target_type 정상 저장
- [ ] 식당 상세에서 버블 공유 기록 조회 정상 (records JOIN 없이)
- [ ] 기존 bubble_shares 데이터 마이그레이션 정상

---

## Phase 4: XP 테이블 리네이밍 + xp_seed_rules 신규

### 마이그레이션
```sql
-- 034_xp_rename_tables.sql

-- 1. 테이블 리네이밍
ALTER TABLE user_experiences RENAME TO xp_totals;
ALTER TABLE xp_histories RENAME TO xp_log_changes;
ALTER TABLE user_milestones RENAME TO xp_log_milestones;
ALTER TABLE level_thresholds RENAME TO xp_seed_levels;
ALTER TABLE milestones RENAME TO xp_seed_milestones;

-- 2. 인덱스 리네이밍 (주요)
ALTER INDEX IF EXISTS idx_user_exp_axis RENAME TO idx_xp_totals_axis;
ALTER INDEX IF EXISTS idx_xp_histories_user RENAME TO idx_xp_log_changes_user;

-- 3. RLS 정책 재정의 (구 테이블명 정책 삭제 + 새 이름으로 재생성)
-- (기존 정책명은 ALTER TABLE RENAME 후에도 유지되나, 명확성을 위해 재정의 권장)

-- 4. 기존 XP 함수/트리거 재정의 (구 테이블명 참조 → 신 테이블명)
-- 017_xp_functions.sql, 021_active_xp_cron.sql, 022_xp_stat_functions.sql 에서
-- 참조하는 테이블명을 신 이름으로 CREATE OR REPLACE

-- 5. 신규 테이블
CREATE TABLE xp_seed_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action VARCHAR(30) NOT NULL UNIQUE,
  xp_amount INT NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. 시드 데이터
INSERT INTO xp_seed_rules (action, xp_amount, description) VALUES
  ('record_name', 0, '이름만 등록'),
  ('record_score', 3, '사분면 점수 부여'),
  ('record_photo', 8, '사진(EXIF GPS) + 점수'),
  ('record_full', 18, '풀 기록 (점수+사진+한줄평+메뉴)'),
  ('detail_axis', 5, '세부 축 XP (area/genre/wine_region/wine_variety)'),
  ('social_share', 1, '버블 공유'),
  ('social_like', 1, '좋아요'),
  ('social_follow', 1, '팔로우'),
  ('social_mutual', 2, '맞팔'),
  ('bonus_onboard', 10, '온보딩 완료'),
  ('bonus_first_record', 5, '첫 기록'),
  ('bonus_first_bubble', 5, '첫 버블 가입'),
  ('bonus_first_share', 3, '첫 공유');

-- 7. RLS
ALTER TABLE xp_seed_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "xp_seed_rules 누구나 읽기" ON xp_seed_rules FOR SELECT USING (true);

-- 8. 일일 상한, 중복 제한 등 어뷰징 방지 상수도 추가
INSERT INTO xp_seed_rules (action, xp_amount, description) VALUES
  ('daily_record_cap', 20, '하루 기록 XP 상한 (횟수)'),
  ('social_daily_cap', 10, '소셜 XP 일일 상한'),
  ('duplicate_months', 6, '같은 식당 점수 재부여 제한 (개월)');
```

### 수정할 파일

**인프라 (테이블명 변경):**
- `src/infrastructure/supabase/types.ts` — 테이블명 전부 변경
- `src/infrastructure/repositories/supabase-xp-repository.ts` — .from() 호출 전부 변경
- `src/infrastructure/repositories/supabase-profile-repository.ts` — xp_histories 참조 변경

**도메인:**
- `src/domain/entities/xp.ts` — 타입명은 유지 (DB 테이블명만 변경)
- `src/domain/services/xp-calculator.ts` — 하드코딩된 XP 상수 제거, xp_seed_rules 참조로 변경
- `src/domain/services/onboarding-xp.ts` — 동일

**애플리케이션:**
- `src/application/hooks/use-xp-calculation.ts`
- `src/application/hooks/use-xp-award.ts`
- `src/application/hooks/use-xp.ts`
- `src/application/hooks/use-axis-level.ts`
- `src/application/hooks/use-bonus-xp.ts`
- `src/application/hooks/use-social-xp.ts`

**프레젠테이션 (영향 확인):**
- `src/presentation/components/profile/recent-xp-list.tsx`
- `src/presentation/components/profile/level-detail-sheet.tsx`

### 검증
- [ ] 기존 XP 데이터 유지됨 (RENAME은 데이터 보존)
- [ ] xp_seed_rules에서 값 읽어서 XP 계산 정상
- [ ] 레벨업, 마일스톤 달성 정상 작동
- [ ] 기존 XP 관련 함수/크론 정상 작동

---

## Phase 5: records + wishlists → lists + records (핵심 변경)

### 새 테이블 정의

**lists:**
```sql
CREATE TABLE lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  target_id UUID NOT NULL,
  target_type VARCHAR(10) NOT NULL,     -- 'restaurant' | 'wine'
  status VARCHAR(20) NOT NULL,          -- 'visited' | 'wishlist' | 'cellar' | 'tasted' (구 records.status 및 wine_status 통합)
  source VARCHAR(10) DEFAULT 'direct',  -- 'direct' | 'bubble' | 'ai' | 'web'
  source_record_id UUID,               -- 찜 출처 기록
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, target_id, target_type)
);

CREATE INDEX idx_lists_user_type ON lists(user_id, target_type, status);
CREATE INDEX idx_lists_target ON lists(target_id, target_type);
```

**records (새 구조):**
```sql
CREATE TABLE records_new (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id UUID NOT NULL REFERENCES lists(id),
  user_id UUID NOT NULL REFERENCES users(id),     -- 조회 편의용 비정규화
  target_id UUID NOT NULL,                         -- 조회 편의용 비정규화
  target_type VARCHAR(10) NOT NULL,                -- 조회 편의용 비정규화

  -- 사분면 평가
  axis_x DECIMAL(5,2),
  axis_y DECIMAL(5,2),
  satisfaction INT,                 -- (axis_x + axis_y) / 2

  -- 경험 데이터
  scene VARCHAR(20),                -- 상황 태그
  comment VARCHAR(200),             -- 한줄평
  total_price INT,                  -- 식당 1인 금액
  purchase_price INT,               -- 와인 구매 가격
  visit_date DATE,                  -- 방문/시음 날짜
  meal_time VARCHAR(10),            -- 'breakfast' | 'lunch' | 'dinner' | 'snack'

  -- 메뉴/페어링
  menu_tags TEXT[],
  pairing_categories TEXT[],

  -- GPS
  has_exif_gps BOOLEAN NOT NULL DEFAULT false,
  is_exif_verified BOOLEAN NOT NULL DEFAULT false,

  -- 와인 전용 (wine_status는 lists.status로 통합되어 제거됨)
  camera_mode VARCHAR(10),
  ocr_data JSONB,
  aroma_regions JSONB,
  aroma_labels TEXT[],
  aroma_color VARCHAR(7),
  complexity INT,
  finish DECIMAL(5,2),
  balance DECIMAL(5,2),
  auto_score INT,

  -- 메타
  private_note TEXT,
  companion_count INT,
  companions TEXT[],
  linked_restaurant_id UUID REFERENCES restaurants(id),
  linked_wine_id UUID REFERENCES wines(id),
  record_quality_xp INT NOT NULL DEFAULT 0,
  score_updated_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_records_new_list ON records_new(list_id);
CREATE INDEX idx_records_new_user_type ON records_new(user_id, target_type, visit_date DESC);
CREATE INDEX idx_records_new_target ON records_new(target_id, target_type);
CREATE INDEX idx_records_new_satisfaction ON records_new(user_id, target_type, satisfaction)
  WHERE satisfaction IS NOT NULL;
```

### 마이그레이션
```sql
-- 035_lists_records_split.sql

-- 1. lists, records_new 생성 (위 DDL)

-- 2. 기존 records → lists (DISTINCT user+target 기준)
-- 구 records.status (checked/rated/draft) 구분 없이 전부 visited로 통합
-- 와인은 wine_status가 있으면 해당 값 사용 (tasted/cellar/wishlist)
INSERT INTO lists (user_id, target_id, target_type, status, created_at)
SELECT DISTINCT ON (user_id, target_id, target_type)
  user_id, target_id, target_type,
  CASE
    WHEN target_type = 'wine' AND wine_status IS NOT NULL THEN wine_status
    ELSE 'visited'
  END,
  created_at
FROM records
ORDER BY user_id, target_id, target_type, created_at;

-- 3. wishlists → lists (충돌 시 무시 — 이미 visited로 들어간 경우)
INSERT INTO lists (user_id, target_id, target_type, status, source, source_record_id, created_at)
SELECT user_id, target_id, target_type, 'wishlist', source, source_record_id, created_at
FROM wishlists
ON CONFLICT (user_id, target_id, target_type) DO NOTHING;

-- 4. records.visits JSONB → records_new 행으로 풀기
INSERT INTO records_new (
  list_id, user_id, target_id, target_type,
  axis_x, axis_y, satisfaction, scene, comment,
  total_price, visit_date, has_exif_gps, is_exif_verified,
  menu_tags, pairing_categories, camera_mode, ocr_data,
  private_note, companion_count, linked_restaurant_id, linked_wine_id,
  record_quality_xp, created_at
)
SELECT
  l.id,
  r.user_id, r.target_id, r.target_type,
  (v->>'axisX')::decimal, (v->>'axisY')::decimal,
  (v->>'satisfaction')::int, v->>'scene', v->>'comment',
  (v->>'totalPrice')::int, (v->>'date')::date,
  COALESCE((v->>'hasExifGps')::boolean, false),
  COALESCE((v->>'isExifVerified')::boolean, false),
  r.menu_tags, r.pairing_categories, r.camera_mode, r.ocr_data,
  r.private_note, (v->>'companionCount')::int,
  r.linked_restaurant_id, r.linked_wine_id,
  r.record_quality_xp, r.created_at
FROM records r
CROSS JOIN LATERAL jsonb_array_elements(r.visits) AS v
JOIN lists l ON l.user_id = r.user_id AND l.target_id = r.target_id AND l.target_type = r.target_type;

-- 5. record_photos FK 업데이트 (구 record_id → 새 record_id 매핑)
-- (상세 매핑 로직 별도 작성 — visits 배열 첫 번째 요소의 record_new.id로 매핑)

-- 6. bubble_shares.record_id FK 업데이트
-- (구 record_id → 새 record_id 매핑)

-- 7. 교체
ALTER TABLE records RENAME TO records_old;
ALTER TABLE records_new RENAME TO records;

-- 8. 트리거/함수 재정의 (011_triggers.sql 에서 참조하는 구 records/wishlists → 새 구조)

-- 9. RLS 정책 (lists, 새 records)
ALTER TABLE lists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lists 본인 읽기" ON lists FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "lists 본인 쓰기" ON lists FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "lists 본인 수정" ON lists FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "lists 본인 삭제" ON lists FOR DELETE USING (auth.uid() = user_id);

-- records RLS도 동일 패턴으로 재정의

-- 10. 정리
-- DROP TABLE records_old CASCADE;  -- 검증 완료 후
-- DROP TABLE wishlists CASCADE;    -- 검증 완료 후
```

### 데이터 마이그레이션 주의사항
- record_photos, bubble_shares, xp_log_changes 등이 구 records.id를 FK로 참조 → 새 records.id로 매핑 필요
- visits 배열이 빈 records (visits = '[]') → lists에만 행 생성, records_new에는 행 없음
- wishlists와 records가 같은 target에 대해 존재하는 경우 → lists에 visited 우선 (ON CONFLICT DO NOTHING)

### 수정할 파일

**도메인 엔티티 (재설계):**
- `src/domain/entities/record.ts` — DiningRecord → List + Record 엔티티 분리
- `src/domain/entities/wishlist.ts` — 삭제 (lists로 통합)
- `src/domain/entities/filter-config.ts` — status 필터가 lists.status 직접 참조로 변경

**도메인 리포지토리:**
- `src/domain/repositories/record-repository.ts` — ListRepository + RecordRepository로 분리
- `src/domain/repositories/wishlist-repository.ts` — 삭제

**인프라:**
- `src/infrastructure/supabase/types.ts` — lists 타입 추가, records 타입 변경, wishlists 제거
- `src/infrastructure/repositories/supabase-record-repository.ts` — 전면 재작성 (lists/records 분리 구조)
- `src/infrastructure/repositories/supabase-wishlist-repository.ts` — 삭제

**도메인 서비스:**
- `src/domain/services/filter-matcher.ts` — status 필터 단순화 (가상 속성 → 직접 컬럼)
- `src/domain/services/filter-query-builder.ts` — lists 테이블 대상으로 변경
- `src/domain/services/bubble-share-sync.ts` — 새 records 구조 참조

**애플리케이션 훅:**
- `src/application/hooks/use-home-records.ts` — lists + records 구조로 변경
- `src/application/hooks/use-home-state.ts`
- `src/application/hooks/use-records.ts`
- `src/application/hooks/use-record-detail.ts`
- `src/application/hooks/use-create-record.ts` — lists upsert → records INSERT 순서
- `src/application/hooks/use-calendar-records.ts`
- `src/application/hooks/use-wishlist.ts` — lists.status = 'wishlist'로 변경
- `src/application/hooks/use-photo-upload.ts`
- `src/application/hooks/use-share-record.ts`
- `src/application/hooks/use-bubble-records.ts`
- `src/application/hooks/use-xp-calculation.ts` — 새 records 구조에 맞게 수정

**프레젠테이션 컨테이너:**
- `src/presentation/containers/home-container.tsx`
- `src/presentation/containers/record-flow-container.tsx`
- `src/presentation/containers/add-flow-container.tsx`
- `src/presentation/containers/restaurant-detail-container.tsx`
- `src/presentation/containers/wine-detail-container.tsx`
- `src/presentation/containers/bubble-detail-container.tsx`
- `src/presentation/containers/discover-container.tsx`
- `src/presentation/containers/search-container.tsx`
- `src/presentation/containers/onboarding-container.tsx`

**프레젠테이션 컴포넌트:**
- `src/presentation/components/home/record-card.tsx`
- `src/presentation/components/home/wine-card.tsx`
- `src/presentation/components/record/wine-record-form.tsx`
- `src/presentation/components/record/restaurant-record-form.tsx`
- `src/presentation/components/detail/record-timeline.tsx` — visits[] 제거, records 배열로 변경
- `src/presentation/components/detail/wishlist-button.tsx` — lists 기반으로 변경
- `src/presentation/components/detail/bubble-record-card.tsx`
- `src/presentation/components/detail/bubble-record-section.tsx`
- `src/presentation/components/bubbler/recent-records.tsx`
- `src/presentation/components/ui/nyam-card.tsx`

**DI 컨테이너:**
- `src/shared/di/container.ts` — wishlistRepo 제거, listRepo 추가

### 검증
- [ ] `pnpm build` 에러 없음
- [ ] `pnpm lint` 경고 0개
- [ ] 기존 기록 데이터 보존 (visits JSONB → records 행 변환 정상)
- [ ] 기존 찜 데이터 보존 (wishlists → lists 이전 정상)
- [ ] 홈 피드 정상 표시 (lists + records JOIN)
- [ ] 기록 생성/수정/삭제 정상
- [ ] 찜 추가/삭제 정상 (lists.status 변경)
- [ ] 버블 공유 정상 (bubble_shares.record_id가 새 records.id 참조)
- [ ] 식당/와인 상세 페이지 정상
- [ ] XP 적립 정상 (새 records 구조 기준)
- [ ] RLS 정책 정상 작동
- [ ] record_photos FK 정상
- [ ] 검증 완료 후 records_old, wishlists DROP

---

## 영향도 요약

| Phase | 마이그레이션 | 삭제 파일 | 수정 파일 |
|-------|------------|----------|----------|
| 1. 불필요 삭제 | 1 | ~20 | ~4 |
| 2. thumbnail | 1 | 0 | ~10 |
| 3. bubble 비정규화 | 1 | 0 | ~6 |
| 4. XP 리네이밍 | 1 | 0 | ~14 |
| 5. lists/records 분리 | 1 | ~3 | ~35 |
| **총계** | **5** | **~23** | **~69** |
