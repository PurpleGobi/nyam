# Nyam — Technical Specification

> 버전: 2.0.0 | 작성일: 2026-03-17
> 관련 문서: [PRD.md](./PRD.md) · [DESIGN_SPEC.md](./DESIGN_SPEC.md)

---

## 1. 기술 스택

| 영역 | 기술 | 비고 |
|------|------|------|
| 프레임워크 | Next.js 16 (App Router, Turbopack) | React 19, TypeScript strict |
| 스타일링 | Tailwind CSS 4 + shadcn/ui | 유틸리티 기반, 컴포넌트 라이브러리 |
| 상태 관리 | SWR | 데이터 페칭 + 캐싱 + 조건부 폴링 |
| 토스트 | sonner | 알림 토스트 (AI 분석 완료 등) |
| 데이터베이스 | PostgreSQL (Supabase) | RLS 적용, 실시간 구독 |
| 스토리지 | Supabase Storage | record-photos 버킷 |
| AI | Google Gemini 2.5 Flash | 사진 분석, 블로그 생성 |
| 지도 | 네이버 Maps + 카카오 Maps | 토글 전환 |
| 인증 | Supabase Auth (OAuth) | Google, Kakao, Naver, Apple |
| 호스팅 | Vercel | Edge Runtime |
| PWA | @ducanh2912/next-pwa | 오프라인 지원 |

---

## 2. Clean Architecture

### 2-1. 계층 구조

```
app/                    → 페이지 라우팅만 (Container 렌더링)
  ↓
presentation/           → UI Layer
  components/           → 순수 UI (props만, 비즈니스 로직 금지)
  containers/           → Hook 호출 + Component 조합
  providers/            → Context Provider (Auth, SWR)
  hooks/                → UI 상태 hook (useModal 등)
  ↓
application/            → Use Case Layer
  hooks/                → 데이터/비즈니스 로직 hook (SWR 기반)
  ↓
domain/                 → Core Layer (순수, 외부 의존성 없음)
  entities/             → 타입 정의
  repositories/         → 인터페이스만
  services/             → 도메인 서비스
  ↑
infrastructure/         → Infra Layer (domain 인터페이스 구현)
  repositories/         → Supabase 구현체
  api/                  → 외부 API 클라이언트
  storage/              → 이미지 업로드
  supabase/             → Supabase 클라이언트 설정
```

**의존성 규칙 (절대 위반 금지)**:
- `domain`은 어떤 레이어에도 의존 금지
- `infrastructure`는 `domain` 인터페이스를 구현
- `application`은 `domain` 인터페이스에만 의존
- `presentation`은 `application` hooks만 사용
- `app/`은 Container 렌더링만

### 2-2. DI (의존성 주입)

```typescript
// di/repositories.ts
import { SupabaseRecordRepository } from '@/infrastructure/repositories/...'

export function getRecordRepository(): RecordRepository {
  return new SupabaseRecordRepository()
}
```

Application hooks는 `getRecordRepository()` 등을 통해 구현체를 주입받는다.

---

## 3. 데이터 모델

### 3-0. Enum 타입

```sql
CREATE TYPE record_type AS ENUM ('restaurant', 'wine', 'cooking');
CREATE TYPE visibility AS ENUM ('private', 'group', 'public');
CREATE TYPE auth_provider AS ENUM ('kakao', 'naver', 'google', 'apple');
-- group_type ENUM 폐기 → groups 테이블에서 access_type + sharing_type + is_paid 조합으로 대체
CREATE TYPE group_role AS ENUM ('owner', 'moderator', 'member');
CREATE TYPE membership_status AS ENUM ('active', 'pending', 'banned');
CREATE TYPE reaction_type AS ENUM ('like', 'comment', 'useful', 'yummy');
```

### 3-1. 사용자

#### users
```sql
id                UUID PK           -- auth.users.id와 동일
nickname          VARCHAR NOT NULL
avatar_url        TEXT NULL
email             VARCHAR NOT NULL
auth_provider     auth_provider NOT NULL  -- 'kakao' | 'naver' | 'google' | 'apple'
is_deactivated    BOOLEAN DEFAULT false
deactivated_at    TIMESTAMPTZ NULL
created_at        TIMESTAMPTZ DEFAULT now()
last_active_at    TIMESTAMPTZ DEFAULT now()
```

### 3-2. 기록 데이터

#### records
```sql
id                UUID PK DEFAULT gen_random_uuid()
user_id           UUID FK → auth.users NOT NULL
restaurant_id     UUID FK → restaurants NULL
record_type       record_type NOT NULL   -- 'restaurant' | 'wine' | 'cooking'
menu_name         TEXT NULL
genre             VARCHAR NULL           -- restaurant: FOOD_CATEGORIES key / cooking: COOKING_GENRES key / wine: null
sub_genre         VARCHAR NULL
-- 평가 (0-100, 유형별 사용 항목 다름)
rating_overall    NUMERIC NULL           -- 유형별 종합 만족도 (저장 시 자동 계산)
                                        -- 식당: (taste+value+service+atmosphere+cleanliness+portion)/6
                                        -- 와인: (taste+value)/2
                                        -- 요리: (balance+taste)/2
rating_taste      SMALLINT NULL          -- 식당: 맛 만족도 / 와인: 전체 맛 만족도 / 요리: 맛 만족도 (→ 3유형 공통, rating_overall 계산에 포함)
rating_value      SMALLINT NULL          -- 식당: 가성비 / 와인: 전체 가성비 만족도
rating_service    SMALLINT NULL          -- 식당 전용
rating_atmosphere SMALLINT NULL          -- 식당 전용
rating_cleanliness SMALLINT NULL         -- 식당 전용
rating_portion    SMALLINT NULL          -- 식당 전용
-- 요리 전용
rating_balance        SMALLINT NULL          -- 맛 균형 (→ DNA 도출에 사용)
rating_difficulty     SMALLINT NULL
rating_time_spent     SMALLINT NULL
rating_reproducibility SMALLINT NULL
rating_plating        SMALLINT NULL
rating_material_cost  SMALLINT NULL
-- 공통
comment           TEXT NULL
tags              TEXT[] DEFAULT '{}'
flavor_tags       TEXT[] DEFAULT '{}'   -- FLAVOR_TAGS에서만 선택
texture_tags      TEXT[] DEFAULT '{}'   -- TEXTURE_TAGS에서만 선택
atmosphere_tags   TEXT[] DEFAULT '{}'   -- ATMOSPHERE_TAGS에서만 선택
visibility        visibility DEFAULT 'private'  -- 'private' | 'group' | 'public'
ai_recognized     BOOLEAN DEFAULT false
completeness_score NUMERIC DEFAULT 0
location_lat      DOUBLE PRECISION NULL
location_lng      DOUBLE PRECISION NULL
price_per_person  INTEGER NULL
-- Phase 관리
phase_status      SMALLINT DEFAULT 1     -- 1: 기본(AI 분석 중) | 2: AI 분석 완료(Phase 2 진입 가능) | 3: 블로그 완료 | 4: 비교 완료
phase1_completed_at TIMESTAMPTZ NULL
phase2_completed_at TIMESTAMPTZ NULL
phase3_completed_at TIMESTAMPTZ NULL
-- Phase 3 비교 보정
scaled_rating     NUMERIC NULL           -- Elo 기반 보정 점수
comparison_count  INTEGER DEFAULT 0
-- 상황 (AI 자동 입력 + 사용자 수정 가능, Style DNA scene 축 원본)
scene             VARCHAR NULL           -- RESTAURANT_SCENES / WINE_SCENES / COOKING_SCENES key
-- 와인 전용 (Phase 1에서 숨김. AI 비동기 enrich 후 자동 입력 → Phase 2 또는 수정 화면에서 사용자 확인/수정)
pairing_food      TEXT NULL              -- 함께 먹은 음식
purchase_price    INTEGER NULL           -- 구입가 (KRW)
-- 방문 정보 (AI 분석 결과 반영)
visit_time        VARCHAR NULL
companion_count   SMALLINT NULL
total_cost        INTEGER NULL
created_at        TIMESTAMPTZ DEFAULT now()
```

#### restaurants
```sql
id                UUID PK DEFAULT gen_random_uuid()
name              VARCHAR NOT NULL
address           TEXT NULL
region            VARCHAR NULL           -- 상권/동네 (style_dna_restaurant_areas.area 기준)
genre             VARCHAR NULL
latitude          DOUBLE PRECISION NULL
longitude         DOUBLE PRECISION NULL
phone             VARCHAR NULL
hours             JSONB NULL
source            VARCHAR NULL           -- 'kakao' | 'naver'
external_id       VARCHAR NULL
external_url      TEXT NULL
menu_items        JSONB NULL
synced_at         TIMESTAMPTZ NULL
created_at        TIMESTAMPTZ DEFAULT now()
```

#### restaurant_stats
```sql
restaurant_id     UUID PK FK → restaurants ON DELETE CASCADE
record_count      INTEGER DEFAULT 0
unique_users      INTEGER DEFAULT 0
avg_taste         NUMERIC NULL
avg_value         NUMERIC NULL
avg_service       NUMERIC NULL
avg_atmosphere    NUMERIC NULL
avg_cleanliness   NUMERIC NULL
avg_portion       NUMERIC NULL
avg_overall       NUMERIC NULL
latest_record_at  TIMESTAMPTZ NULL
updated_at        TIMESTAMPTZ DEFAULT now()
```

#### record_photos
```sql
id            UUID PK DEFAULT gen_random_uuid()
record_id     UUID FK → records ON DELETE CASCADE
photo_url     TEXT NOT NULL
thumbnail_url TEXT NULL
order_index   SMALLINT DEFAULT 0
ai_labels     TEXT[] DEFAULT '{}'
```

> **Note**: `photo_type`과 `ai_description`은 `record_ai_analyses.photo_classifications` JSONB에 저장된다.

#### record_journals (Phase 2 블로그)
```sql
id                UUID PK DEFAULT gen_random_uuid()
record_id         UUID FK → records ON DELETE CASCADE UNIQUE
-- 블로그 콘텐츠
blog_title        TEXT NULL
blog_content      TEXT NULL               -- 텍스트 섹션 합본
blog_sections     JSONB NULL              -- [{type: 'text'|'photo', content, photoIndex?, caption?}]
-- AI 질문/답변
ai_questions      JSONB NULL              -- [{id, question, options[], type: 'select'|'freetext'}]
user_answers      JSONB NULL              -- {questionId: answer}
-- 게시 상태
published         BOOLEAN DEFAULT false
published_at      TIMESTAMPTZ NULL
```

#### phase_completions
```sql
id           UUID PK DEFAULT gen_random_uuid()
user_id      UUID FK → auth.users NOT NULL
record_id    UUID FK → records ON DELETE CASCADE
phase        SMALLINT NOT NULL    -- 1 | 2 | 3
xp_earned    INTEGER NOT NULL
completed_at TIMESTAMPTZ DEFAULT now()
```

### 3-3. 사용자 DNA

#### user_stats
```sql
user_id               UUID PK FK → auth.users
total_records         INTEGER DEFAULT 0
total_photos          INTEGER DEFAULT 0
records_this_week     INTEGER DEFAULT 0
records_this_month    INTEGER DEFAULT 0
avg_weekly_frequency  NUMERIC DEFAULT 0
current_streak_days   INTEGER DEFAULT 0
longest_streak_days   INTEGER DEFAULT 0
avg_completeness      NUMERIC DEFAULT 0
nyam_level            INTEGER DEFAULT 1
points                INTEGER DEFAULT 0
groups_count          INTEGER DEFAULT 0
shared_records_count  INTEGER DEFAULT 0
reactions_received    INTEGER DEFAULT 0
updated_at            TIMESTAMPTZ DEFAULT now()
```

#### taste_dna_restaurant (식당용)
```sql
user_id              UUID PK FK → auth.users
-- 맛 선호 6축 (0-100)
flavor_spicy         NUMERIC DEFAULT 50
flavor_sweet         NUMERIC DEFAULT 50
flavor_salty         NUMERIC DEFAULT 50
flavor_sour          NUMERIC DEFAULT 50
flavor_umami         NUMERIC DEFAULT 50
flavor_rich          NUMERIC DEFAULT 50
-- 취향 코드
taste_type_code      VARCHAR NULL          -- 'bold-savory' 등
taste_type_name      VARCHAR NULL
-- 메타
sample_count         INTEGER DEFAULT 0
updated_at           TIMESTAMPTZ DEFAULT now()
```

#### taste_dna_wine (와인용 — WSET 기준)

> WSET 테이스팅 노트(AI+사용자 평균) × 종합 만족도 (전체 맛 만족도 + 전체 가성비 만족도의 평균 = rating_overall)로 도출.

```sql
user_id              UUID PK FK → auth.users
-- Taste DNA 7축 (0-100, WSET 테이스팅 기준)
pref_acidity         NUMERIC DEFAULT 50    -- 산미 선호
pref_body            NUMERIC DEFAULT 50    -- 바디감 선호
pref_tannin          NUMERIC DEFAULT 50    -- 타닌 선호
pref_sweetness       NUMERIC DEFAULT 50    -- 당도 선호
pref_balance         NUMERIC DEFAULT 50    -- 균형 선호
pref_finish          NUMERIC DEFAULT 50    -- 여운 선호
pref_aroma           NUMERIC DEFAULT 50    -- 향 복합도 선호
-- DNA 한줄 요약
dna_summary          TEXT NULL             -- "부르고뉴 스타일 라이트 바디, 높은 산미 선호"
-- 메타
sample_count         INTEGER DEFAULT 0
updated_at           TIMESTAMPTZ DEFAULT now()
```

#### taste_dna_cooking (요리용)

> 식당과 동일한 6축 맛 선호 구조. 다만 맛 특성이 AI가 아닌 사용자 수동 입력 기반.

```sql
user_id              UUID PK FK → auth.users
-- 맛 선호 6축 (0-100, 식당과 동일 구조)
flavor_spicy         NUMERIC DEFAULT 50
flavor_sweet         NUMERIC DEFAULT 50
flavor_salty         NUMERIC DEFAULT 50
flavor_sour          NUMERIC DEFAULT 50
flavor_umami         NUMERIC DEFAULT 50
flavor_rich          NUMERIC DEFAULT 50
-- 메타
sample_count         INTEGER DEFAULT 0
updated_at           TIMESTAMPTZ DEFAULT now()
```

#### Style DNA 테이블 — 유형별 분리

> Style DNA는 기록 유형(식당/와인/요리)마다 축의 의미가 다르므로 테이블을 분리한다.
> 각 행은 (user_id, 축 값) 조합마다 하나씩 생기며, 기록이 쌓일 때마다 누적 통계가 업데이트된다.

**🍽️ style_dna_restaurant** — 식당 경험 패턴 (3축: genre + area + scene)

```sql
-- style_dna_restaurant_genres (WHAT: 어떤 음식)
user_id            UUID FK → auth.users
genre              VARCHAR NOT NULL      -- FOOD_CATEGORIES key (korean, japanese, ...)
PRIMARY KEY (user_id, genre)
record_count       INTEGER DEFAULT 0
sub_genre_count    INTEGER DEFAULT 0
sub_genres         TEXT[] DEFAULT '{}'
avg_rating         NUMERIC NULL
percentage         NUMERIC NULL
level              INTEGER DEFAULT 1
xp                 INTEGER DEFAULT 0
xp_to_next         INTEGER DEFAULT 0
volume_score       NUMERIC DEFAULT 0
diversity_score    NUMERIC DEFAULT 0
recency_score      NUMERIC DEFAULT 0
consistency_score  NUMERIC DEFAULT 0
first_record_at    TIMESTAMPTZ NULL
last_record_at     TIMESTAMPTZ NULL

-- style_dna_restaurant_areas (WHERE: 어디서)
user_id            UUID FK → auth.users
area               VARCHAR NOT NULL      -- 상권/동네명 (강남, 성수, 이태원 등)
PRIMARY KEY (user_id, area)
record_count       INTEGER DEFAULT 0
unique_restaurants INTEGER DEFAULT 0
sub_area_count     INTEGER DEFAULT 0
level              INTEGER DEFAULT 1
xp                 INTEGER DEFAULT 0
xp_to_next         INTEGER DEFAULT 0
volume_score       NUMERIC DEFAULT 0
diversity_score    NUMERIC DEFAULT 0
recency_score      NUMERIC DEFAULT 0
consistency_score  NUMERIC DEFAULT 0
first_record_at    TIMESTAMPTZ NULL
last_record_at     TIMESTAMPTZ NULL

-- style_dna_restaurant_scenes (WHEN: 어떤 상황)
user_id            UUID FK → auth.users
scene              VARCHAR NOT NULL      -- RESTAURANT_SCENES key (혼밥, 데이트, 비즈니스 등)
PRIMARY KEY (user_id, scene)
record_count       INTEGER DEFAULT 0
unique_restaurants INTEGER DEFAULT 0
genre_diversity    INTEGER DEFAULT 0
level              INTEGER DEFAULT 1
xp                 INTEGER DEFAULT 0
xp_to_next         INTEGER DEFAULT 0
volume_score       NUMERIC DEFAULT 0
diversity_score    NUMERIC DEFAULT 0
recency_score      NUMERIC DEFAULT 0
consistency_score  NUMERIC DEFAULT 0
first_record_at    TIMESTAMPTZ NULL
last_record_at     TIMESTAMPTZ NULL
```

**🍷 style_dna_wine** — 와인 경험 패턴 (4축: variety + region + type + scene)

```sql
-- style_dna_wine_varieties (품종)
user_id            UUID FK → auth.users
variety            VARCHAR NOT NULL      -- 카베르네 소비뇽, 피노 누아, 샤르도네 등
PRIMARY KEY (user_id, variety)
record_count       INTEGER DEFAULT 0
avg_rating         NUMERIC NULL
level              INTEGER DEFAULT 1
xp                 INTEGER DEFAULT 0
xp_to_next         INTEGER DEFAULT 0
volume_score       NUMERIC DEFAULT 0
diversity_score    NUMERIC DEFAULT 0
recency_score      NUMERIC DEFAULT 0
consistency_score  NUMERIC DEFAULT 0
first_record_at    TIMESTAMPTZ NULL
last_record_at     TIMESTAMPTZ NULL

-- style_dna_wine_regions (산지)
user_id            UUID FK → auth.users
region             VARCHAR NOT NULL      -- 프랑스/부르고뉴, 이탈리아/토스카나, 나파밸리 등
PRIMARY KEY (user_id, region)
record_count       INTEGER DEFAULT 0
avg_rating         NUMERIC NULL
level              INTEGER DEFAULT 1
xp                 INTEGER DEFAULT 0
xp_to_next         INTEGER DEFAULT 0
volume_score       NUMERIC DEFAULT 0
diversity_score    NUMERIC DEFAULT 0
recency_score      NUMERIC DEFAULT 0
consistency_score  NUMERIC DEFAULT 0
first_record_at    TIMESTAMPTZ NULL
last_record_at     TIMESTAMPTZ NULL

-- style_dna_wine_types (타입)
user_id            UUID FK → auth.users
type               VARCHAR NOT NULL      -- red, white, sparkling, rose, orange, natural
PRIMARY KEY (user_id, type)
record_count       INTEGER DEFAULT 0
avg_rating         NUMERIC NULL
level              INTEGER DEFAULT 1
xp                 INTEGER DEFAULT 0
xp_to_next         INTEGER DEFAULT 0
volume_score       NUMERIC DEFAULT 0
diversity_score    NUMERIC DEFAULT 0
recency_score      NUMERIC DEFAULT 0
consistency_score  NUMERIC DEFAULT 0
first_record_at    TIMESTAMPTZ NULL
last_record_at     TIMESTAMPTZ NULL

-- style_dna_wine_scenes (상황)
user_id            UUID FK → auth.users
scene              VARCHAR NOT NULL      -- 혼술, 데이트, 페어링, 파티, 테이스팅
PRIMARY KEY (user_id, scene)
record_count       INTEGER DEFAULT 0
avg_rating         NUMERIC NULL
level              INTEGER DEFAULT 1
xp                 INTEGER DEFAULT 0
xp_to_next         INTEGER DEFAULT 0
volume_score       NUMERIC DEFAULT 0
diversity_score    NUMERIC DEFAULT 0
recency_score      NUMERIC DEFAULT 0
consistency_score  NUMERIC DEFAULT 0
first_record_at    TIMESTAMPTZ NULL
last_record_at     TIMESTAMPTZ NULL
```

**🍳 style_dna_cooking** — 요리 경험 패턴 (2축: genre + scene)

```sql
-- style_dna_cooking_genres (장르)
user_id            UUID FK → auth.users
genre              VARCHAR NOT NULL      -- 한식, 양식, 중식, 일식, 베이킹, 디저트, 음료
PRIMARY KEY (user_id, genre)
record_count       INTEGER DEFAULT 0
avg_rating         NUMERIC NULL
level              INTEGER DEFAULT 1
xp                 INTEGER DEFAULT 0
xp_to_next         INTEGER DEFAULT 0
volume_score       NUMERIC DEFAULT 0
diversity_score    NUMERIC DEFAULT 0
recency_score      NUMERIC DEFAULT 0
consistency_score  NUMERIC DEFAULT 0
first_record_at    TIMESTAMPTZ NULL
last_record_at     TIMESTAMPTZ NULL

-- style_dna_cooking_scenes (상황)
user_id            UUID FK → auth.users
scene              VARCHAR NOT NULL      -- 일상식사, 밀프렙, 손님초대, 도시락, 다이어트
PRIMARY KEY (user_id, scene)
record_count       INTEGER DEFAULT 0
avg_rating         NUMERIC NULL
level              INTEGER DEFAULT 1
xp                 INTEGER DEFAULT 0
xp_to_next         INTEGER DEFAULT 0
volume_score       NUMERIC DEFAULT 0
diversity_score    NUMERIC DEFAULT 0
recency_score      NUMERIC DEFAULT 0
consistency_score  NUMERIC DEFAULT 0
first_record_at    TIMESTAMPTZ NULL
last_record_at     TIMESTAMPTZ NULL
```

#### record_taste_profiles (카테고리 B: 객관적 맛 특성)

> 각 기록의 세분화된 맛 특성.
> - **식당**: AI가 웹 리뷰 교차 검증으로 자동 산출. 사용자 조정 불가 (읽기 전용).
> - **와인**: AI가 WSET 기준으로 산출 + 사용자도 별도 기록 → 양쪽 평균을 저장.
> - **요리**: AI 산출 불가. 사용자가 직접 수동 입력.
>
> **핵심 원칙**: 식당의 맛 특성은 사용자가 조정할 수 없다 — "객관적으로 짠 음식인데 맛있다"가 DNA의 본질. 요리는 AI 산출이 불가하므로 사용자가 직접 입력한다. 와인은 테이스팅이 주관+객관 혼합 영역이므로 AI와 사용자 기록을 평균하여 객관성을 확보한다.

```sql
id                UUID PK DEFAULT gen_random_uuid()
record_id         UUID FK → records ON DELETE CASCADE UNIQUE
-- 식당/요리 공통 6축 (0-100)
spicy             NUMERIC NULL           -- 매운맛
sweet             NUMERIC NULL           -- 단맛
salty             NUMERIC NULL           -- 짠맛
sour              NUMERIC NULL           -- 신맛
umami             NUMERIC NULL           -- 감칠맛
rich              NUMERIC NULL           -- 기름진맛
-- 와인 전용: WSET 테이스팅 노트 (0-100)
wine_acidity      NUMERIC NULL           -- 산미
wine_body         NUMERIC NULL           -- 바디감
wine_tannin       NUMERIC NULL           -- 타닌
wine_sweetness    NUMERIC NULL           -- 당도
wine_balance      NUMERIC NULL           -- 균형
wine_finish       NUMERIC NULL           -- 여운
wine_aroma        NUMERIC NULL           -- 향 (단순↔복합)
-- 와인 전용: 사용자 WSET 입력 원본 (AI+사용자 평균은 위 wine_* 컬럼에 저장)
wine_acidity_user   NUMERIC NULL
wine_body_user      NUMERIC NULL
wine_tannin_user    NUMERIC NULL
wine_sweetness_user NUMERIC NULL
wine_balance_user   NUMERIC NULL
wine_finish_user    NUMERIC NULL
wine_aroma_user     NUMERIC NULL
-- 메타
source            VARCHAR DEFAULT 'ai' CHECK (source IN ('ai', 'pending_user', 'ai_user_avg', 'manual'))
                                        -- ai: 식당 AI산출 / pending_user: 와인 사용자 WSET만 저장, AI 병합 대기 / ai_user_avg: 와인 AI+사용자 평균 병합 완료 / manual: 요리 수동입력
confidence        NUMERIC DEFAULT 0      -- 0.0-1.0 (AI 산출 시 신뢰도)
review_count      INTEGER DEFAULT 0      -- AI가 참조한 리뷰 수
summary           TEXT NULL              -- AI 요약
created_at        TIMESTAMPTZ DEFAULT now()
```

#### record_ai_analyses
> **관계**: records와 1:N (재분석 시 새 행 추가, 최신 1건만 활용: `ORDER BY created_at DESC LIMIT 1`)
> **재분석 시 record_taste_profiles 처리**: record_taste_profiles는 record_id UNIQUE(1:1)이므로, 재분석 시 기존 행을 UPSERT (ON CONFLICT UPDATE)한다.

```sql
id                UUID PK DEFAULT gen_random_uuid()
record_id         UUID FK → records ON DELETE CASCADE
raw_response      JSONB NULL          -- Gemini 원본 응답
-- 식당용
identified_restaurant JSONB NULL      -- {name, matchedPlaceId, confidence}
extracted_menu_items  JSONB NULL      -- [{name, price}]
ordered_items     JSONB NULL          -- [{name, estimatedPrice}]
receipt_data      JSONB NULL          -- {totalCost, perPersonCost, itemCount}
companion_data    JSONB NULL          -- {count, occasion}
-- 와인용
wine_info         JSONB NULL          -- {name, vintage, winery, origin, variety, estimated_price_krw, critic_score}
pairing_food      TEXT NULL           -- AI가 사진에서 추출한 페어링 음식
-- 와인 WSET 테이스팅 노트 (AI 산출분)
wine_tasting_ai   JSONB NULL          -- {acidity, body, tannin, sweetness, balance, finish, aroma}
-- 공통
photo_classifications JSONB NULL      -- [{photoIndex, type, confidence, description}]
estimated_visit_time VARCHAR NULL
confidence_score  NUMERIC DEFAULT 0
created_at        TIMESTAMPTZ DEFAULT now()
```

#### record_shares
```sql
record_id         UUID FK → records ON DELETE CASCADE
group_id          UUID FK → groups ON DELETE CASCADE
shared_at         TIMESTAMPTZ DEFAULT now()
PRIMARY KEY (record_id, group_id)
```

#### bookmarks
```sql
user_id           UUID FK → auth.users ON DELETE CASCADE
record_id         UUID FK → records ON DELETE CASCADE
created_at        TIMESTAMPTZ DEFAULT now()
PRIMARY KEY (user_id, record_id)
```

#### reactions
```sql
id                UUID PK DEFAULT gen_random_uuid()
user_id           UUID FK → auth.users ON DELETE CASCADE
record_id         UUID FK → records ON DELETE CASCADE
type              reaction_type NOT NULL  -- 'like' | 'comment' | 'useful' | 'yummy'
comment_text      TEXT NULL               -- type='comment'일 때 사용
created_at        TIMESTAMPTZ DEFAULT now()
```

### 3-4. 소셜 데이터

#### groups
```sql
id                  UUID PK DEFAULT gen_random_uuid()
name                VARCHAR NOT NULL
description         TEXT NULL
owner_id            UUID FK → auth.users NOT NULL
-- 버블 유형: 2축 조합 + 과금 플래그
access_type         VARCHAR DEFAULT 'private' CHECK (access_type IN ('private', 'public'))
sharing_type        VARCHAR DEFAULT 'interactive' CHECK (sharing_type IN ('interactive', 'view_only'))
is_paid             BOOLEAN DEFAULT false
-- 유료 버블
price_monthly       NUMERIC NULL          -- is_paid=true일 때
trial_days          INTEGER NULL
-- 참여 조건
entry_requirements  JSONB NULL
invite_code         VARCHAR UNIQUE NULL   -- 초대 링크용 코드
is_active           BOOLEAN DEFAULT true
created_at          TIMESTAMPTZ DEFAULT now()
```

> **조합 예시**: Private+Interactive(친구모임), Public+View_only(인플루언서 채널), Public+View_only+Paid(유료 구독 채널)

#### group_memberships
```sql
group_id            UUID FK → groups ON DELETE CASCADE
user_id             UUID FK → auth.users ON DELETE CASCADE
role                group_role DEFAULT 'member'  -- 'owner' | 'moderator' | 'member'
status              membership_status DEFAULT 'active'  -- 'active' | 'pending' | 'banned'
joined_at           TIMESTAMPTZ DEFAULT now()
PRIMARY KEY (group_id, user_id)
```

#### group_stats
```sql
group_id            UUID PK FK → groups ON DELETE CASCADE
member_count        INTEGER DEFAULT 0
record_count        INTEGER DEFAULT 0
records_this_week   INTEGER DEFAULT 0
activity_score      NUMERIC DEFAULT 0
quality_score       NUMERIC DEFAULT 0
diversity_score     NUMERIC DEFAULT 0
external_citation   NUMERIC DEFAULT 0
growth_rate         NUMERIC DEFAULT 0
overall_score       NUMERIC DEFAULT 0
top_restaurants     JSONB NULL
top_genres          JSONB NULL
updated_at          TIMESTAMPTZ DEFAULT now()
```

#### comparisons / comparison_matchups (Phase 3)
```sql
-- comparisons
id                UUID PK DEFAULT gen_random_uuid()
user_id           UUID FK → auth.users NOT NULL
genre             VARCHAR NULL             -- 식당/요리: 장르 기반. 와인: null (wine_comparison_criteria 사용)
wine_comparison_criteria JSONB NULL       -- 와인 전용: {variety?, region?, type?, priceRange?} — 2~3개 AND 조합
bracket_size      SMALLINT NOT NULL       -- 4 | 8 | 16
status            VARCHAR DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed'))
winner_record_id  UUID FK → records ON DELETE SET NULL
created_at        TIMESTAMPTZ DEFAULT now()

-- comparison_matchups
id             UUID PK DEFAULT gen_random_uuid()
comparison_id  UUID FK → comparisons ON DELETE CASCADE
round          SMALLINT NOT NULL
match_index    SMALLINT NOT NULL
record_a_id    UUID FK → records ON DELETE CASCADE
record_b_id    UUID FK → records ON DELETE CASCADE
winner_id      UUID FK → records ON DELETE SET NULL
```

### 3-5. 알림

#### notifications
```sql
id              UUID PK DEFAULT gen_random_uuid()
user_id         UUID FK → auth.users NOT NULL   -- 알림 수신자
actor_id        UUID FK → auth.users NULL        -- 알림 유발자
type            VARCHAR NOT NULL CHECK (type IN ('reaction', 'share', 'group_invite', 'level_up', 'streak', 'comparison_complete'))
-- 다형성 참조
target_type     VARCHAR NULL CHECK (target_type IN ('record', 'group', 'comparison'))
target_id       UUID NULL                         -- 대상 PK
-- 표시용
title           TEXT NULL                          -- "김철수님이 좋아요를 눌렀습니다"
body            TEXT NULL
metadata        JSONB NULL                         -- 리액션 종류, 버블 이름 등 확장용
-- 상태
is_read         BOOLEAN DEFAULT false
read_at         TIMESTAMPTZ NULL
created_at      TIMESTAMPTZ DEFAULT now()
```

```sql
-- 미읽은 알림 빠른 조회
CREATE INDEX idx_notifications_user_unread
  ON notifications (user_id, is_read, created_at DESC)
  WHERE is_read = false;
```

> **생성 시점**: 리액션/공유/레벨업 등 이벤트 발생 시 API 로직에서 INSERT. DB 트리거 사용 안 함.
> **Dangling reference 방어**: target_id가 가리키는 대상(record/group/comparison)이 삭제될 수 있음. 알림 표시 시 target 조회 실패하면 "삭제된 콘텐츠입니다" fallback UI로 처리.

### 3-6. 계정 삭제

#### account_deletions
```sql
id              UUID PK DEFAULT gen_random_uuid()
user_id         UUID FK → auth.users UNIQUE NOT NULL
reason          TEXT NULL                         -- 탈퇴 사유 (선택)
reason_category VARCHAR NULL                      -- 'not_useful' | 'privacy' | 'alternative' | 'other'
requested_at    TIMESTAMPTZ DEFAULT now()
scheduled_at    TIMESTAMPTZ NOT NULL              -- requested_at + 30일
cancelled_at    TIMESTAMPTZ NULL
completed_at    TIMESTAMPTZ NULL
status          VARCHAR DEFAULT 'pending' CHECK (status IN ('pending', 'cancelled', 'completed'))
```

> **users 테이블 추가 컬럼**: `is_deactivated BOOLEAN DEFAULT false`, `deactivated_at TIMESTAMPTZ NULL`

### 3-7. FK Cascade 정책

| 자식 테이블 | FK 컬럼 | 삭제 정책 |
|------------|---------|-----------|
| record_photos | record_id (→ records) | CASCADE |
| record_journals | record_id (→ records) UNIQUE | CASCADE |
| record_ai_analyses | record_id (→ records) | CASCADE |
| record_taste_profiles | record_id (→ records) UNIQUE | CASCADE |
| record_shares | record_id (→ records) | CASCADE |
| record_shares | group_id (→ groups) | CASCADE |
| bookmarks | record_id (→ records) | CASCADE |
| bookmarks | user_id (→ auth.users) | CASCADE |
| reactions | record_id (→ records) | CASCADE |
| reactions | user_id (→ auth.users) | CASCADE |
| phase_completions | record_id (→ records) | CASCADE |
| phase_completions | user_id (→ auth.users) | — |
| comparison_matchups | comparison_id (→ comparisons) | CASCADE |
| comparison_matchups | record_a_id, record_b_id (→ records) | CASCADE |
| comparison_matchups | winner_id (→ records) | SET NULL |
| comparisons | user_id (→ auth.users) | — |
| comparisons | winner_record_id (→ records) | SET NULL |
| group_memberships | group_id (→ groups) | CASCADE |
| group_memberships | user_id (→ auth.users) | CASCADE |
| group_stats | group_id (→ groups) | CASCADE |
| restaurant_stats | restaurant_id (→ restaurants) | CASCADE |
| notifications | user_id (→ auth.users) | CASCADE |
| notifications | actor_id (→ auth.users) | SET NULL |
| account_deletions | user_id (→ auth.users) | CASCADE |

---

## 4. API 라우트

### 4-0. 사전 분석 (기록 전)

#### POST /api/analyze-visit

Phase 1 저장 **전에** 사용자가 찍은 사진들을 종합 분석하여 방문 정보를 추출한다. 사용자가 사진을 선택하면 즉시 호출되어 AI 인식 결과를 미리 보여준다.

```
Input: {
  photos: string[]           -- base64 이미지 배열 (최대 8장, 5MB/장)
  recordType: 'restaurant' | 'wine' | 'cooking'  -- 기록 유형 (유형별 분석 분기)
  location: { lat, lng } | null
  nearbyPlaces: [{           -- GPS 기반 주변 식당 목록 (restaurant일 때만)
    externalId, name, address, categoryName
  }]
}

Output: {
  success: boolean
  analysis: {
    photos: [{ index, type, description }]        -- 사진 분류 (공통)
    scene: string | null              -- AI가 사진/인원수 등으로 추정 (공통, 유형별 SCENES 상수)
    -- recordType='restaurant' 전용 (나머지 null)
    restaurant: {
      name: string | null             -- 식당명 (간판 OCR 또는 GPS 매칭)
      matchedPlaceId: string | null
      confidence: number
      genre: string | null            -- FOOD_CATEGORIES key
      orderedItems: string[]          -- 추정 주문 메뉴
      menuBoard: [{ name, price }]    -- 메뉴판 OCR
      receipt: { totalCost, perPersonCost, itemCount } | null
      companions: { count, occasion } | null
      estimatedVisitHour: number | null
      flavorTags: string[]            -- FLAVOR_TAGS
      textureTags: string[]           -- TEXTURE_TAGS
    } | null
    -- recordType='wine' 전용 (나머지 null)
    wine: {
      name: string | null             -- 와인명
      vintage: number | null
      origin: { country, region } | null
      variety: string | null          -- 품종
      confidence: number              -- 0.0-1.0
    } | null
    -- recordType='cooking' 전용 (나머지 null)
    cooking: {
      dishName: string | null         -- 요리명 추정
      genre: string | null            -- COOKING_GENRES key
      flavorTags: string[]            -- FLAVOR_TAGS
      textureTags: string[]           -- TEXTURE_TAGS
    } | null
  }
}
```

**유형별 분기**:
- `recordType='restaurant'`: restaurant + genre + orderedItems + 태그 분석. wine 필드는 null.
- `recordType='wine'`: wine 라벨 OCR + 와인 식별. restaurant/genre/orderedItems는 null.
- `recordType='cooking'`: 요리명, 장르, 맛/식감 태그 추출. 맛 특성 6축은 AI 산출 불가 → Phase 1에서 사용자 수동 입력.

**검증**: genre는 restaurant→`FOOD_CATEGORIES` / cooking→`COOKING_GENRES`, scene은 `RESTAURANT_SCENES` / `WINE_SCENES` / `COOKING_SCENES`, 태그는 `FLAVOR_TAGS` / `TEXTURE_TAGS` 상수로 필터링.

---

### 4-1. Phase 1 저장 후 AI 파이프라인 (비동기)

Phase 1에서 사용자는 사진 + 만족도만 기록하고 즉시 저장한다. 이후 아래 파이프라인이 백그라운드에서 순차 실행된다.

#### Step 1: 식당·메뉴 특정 — POST /api/records/enrich

```
Input: { recordId, photoUrls, location }
```

**프롬프트 (Gemini 2.5 Flash)**:

```
당신은 음식점 방문 분석 전문가입니다. 사진을 분석하여 JSON으로 응답하세요.

## 주변 식당 (GPS 기반)
{nearbyPlaces}

## 필수 규칙
- "genre"는 반드시 허용 목록의 영문 key를 사용하세요.
- "flavorTags", "textureTags"는 허용 목록에서만 선택하세요.

## genre 허용 목록
{FOOD_CATEGORIES.map(c => `"${c.value}" → ${c.label}`)}

## 응답 형식
{
  "restaurantName": "식당 이름 (간판 OCR 또는 주변 매칭)",
  "genre": "korean | chinese | japanese | western | chicken | pizza | burger | snack | jokbal | stew | katsu | bbq | seafood | asian | cafe | salad | lunchbox",
  "orderedItems": ["주문 메뉴 추정"],
  "menuItems": [{"name": "메뉴명", "price": 숫자}],
  "totalCost": 총액 | null,
  "companionCount": 인원수(기본 1)
}
```

**검증**: genre는 `FOOD_CATEGORIES`에서만 허용. 범위 외 → 무시.

**상권명 추출**: 카카오 API 응답의 `address_name`에서 구/동 단위를 추출하여 restaurants.region에 저장. 예: "서울 성동구 성수동1가" → "성수", "서울 강남구 역삼동" → "강남". 매핑 테이블(`shared/constants/areas.ts`)에서 동 → 상권명 변환. 매핑에 없으면 구 단위로 저장.

#### Step 2: 객관적 맛 프로필 산출 — POST /api/records/taste-profile

Step 1에서 식당·메뉴(또는 와인)가 특정된 후 호출. **DNA의 핵심 입력값**이므로 정확성이 매우 중요하다.

```
Input: { recordId }  // 내부에서 record + record_ai_analyses 조회
Output: record_taste_profiles INSERT (source='ai')
```

> **요리일 경우**: 이 Step은 스킵. Phase 1 기록 시 사용자가 맛 특성 6축을 직접 입력하며 record_taste_profiles에 source='manual'로 저장.

---

#### Step 2-A: 식당 맛 프로필 산출

**시퀀스 (3단계 파이프라인)**:

```
2-A-1. 검색 쿼리 생성
  - record_ai_analyses에서 restaurantName + orderedItems 추출
  - 메뉴별로 검색 쿼리 생성: "{식당명} {메뉴명} 맛 후기"
  - 메뉴가 여러 개면 각각 별도 검색 (최대 3개 메뉴)

2-A-2. 리뷰 수집 + 1차 필터링
  - 네이버 블로그 검색 API → 상위 10건 수집 (본문 크롤링)
  - 카카오 리뷰 검색 → 상위 5건 수집
  - 1차 필터링 (LLM): 아래 프롬프트로 유효 리뷰만 선별
    · 최소 3건 이상 확보 목표, 미달 시 검색어 변경 후 재시도 1회
    · 재시도 후에도 미달 시 confidence 0.3 이하로 진행

2-A-3. 맛 특성 점수화 (LLM)
  - 선별된 리뷰 + 메뉴 사진 분석 결과를 종합
  - 6축 점수 산출
```

**2-A-2 프롬프트 (리뷰 필터링)**:

```
아래 리뷰들이 "{식당명} {메뉴명}"에 대한 실제 방문 리뷰인지 판별하세요.

## 리뷰 목록
{rawReviews.map((r, i) => `[${i}] ${r.text.slice(0, 500)}`)}

## 판별 기준
1. **실제 방문**: 직접 먹어본 경험이 기술되어 있는가?
2. **광고 아님**: 협찬/제공/체험단/원고료 언급이 없는가?
3. **맛 언급**: 맛에 대한 구체적 묘사(짜다, 맵다, 달다, 느끼하다 등)가 있는가?
4. **AI 생성 아님**: 기계적이고 반복적인 패턴이 아닌가?

## 응답 형식 (JSON)
{
  "validIndexes": [0, 2, 5],       // 유효 리뷰 인덱스
  "rejectedReasons": {             // 거절 사유 (디버깅용)
    "1": "협찬 리뷰",
    "3": "맛 언급 없음",
    "4": "AI 생성 의심"
  }
}
```

**2-A-3 프롬프트 (식당 맛 특성 산출)**:

```
당신은 음식 맛 분석 전문가입니다. 실제 고객 리뷰와 음식 정보를 기반으로
이 메뉴의 **객관적인 맛 특성**을 정밀하게 점수화하세요.

## 대상
- 식당: {restaurantName}
- 메뉴: {orderedItems.join(', ')}
- 장르: {genre}

## 실제 고객 리뷰 (검증 완료)
{validReviews.map((r, i) => `
리뷰 ${i+1} (출처: ${r.source}):
"${r.text}"
`)}

## AI 사진 분석 결과
{photoAnalysis.description}

## 점수화 규칙

### 기본 원칙
- 리뷰에서 **직접적으로 언급된** 맛 특성만 50에서 벗어나게 하세요.
- "매워요", "불맛이 있어요" → spicy 상향. "안 매워요", "순해요" → spicy 하향.
- 언급이 없는 축은 50(중립)을 유지하세요. 추측하지 마세요.

### 메뉴 유형별 기본값 (리뷰 언급 없을 때 참고)
- 마라탕/떡볶이: spicy 기본 60-80 (매운 음식이 본질)
- 디저트/케이크: sweet 기본 60-75
- 국밥/찌개: umami 기본 55-70, salty 기본 55-65
- 샐러드: 대부분 축 45-55 (자극 약함)

### 빈도 기반 가중
- 5건 이상 동일 언급 → 확신 높게 (±20 이상 이동)
- 2-4건 → 중간 확신 (±10-15 이동)
- 1건만 → 약한 신호 (±5 이동)

### 상충 처리
- "짭짤하면서 달콤" → salty 60, sweet 60 (둘 다 반영)
- "처음엔 달다가 뒤에 매워" → sweet 55, spicy 65 (주된 인상 우선)
- 리뷰 간 의견 분분 → 다수 의견 기준, confidence 하향

## 평가 축
- spicy: 0=전혀 안 매움, 50=보통, 100=극도로 매움
- sweet: 0=전혀 안 달음, 50=보통, 100=매우 달콤
- salty: 0=매우 싱거움, 50=적절, 100=매우 짠
- sour: 0=신맛 없음, 50=약간, 100=매우 신
- umami: 0=깔끔/담백, 50=보통, 100=깊은 감칠맛
- rich: 0=매우 담백, 50=보통, 100=매우 기름진/느끼한

## 응답 형식 (JSON)
{
  "spicy": 0-100,
  "sweet": 0-100,
  "salty": 0-100,
  "sour": 0-100,
  "umami": 0-100,
  "rich": 0-100,
  "confidence": 0.0-1.0,
  "reviewCount": 유효 리뷰 수,
  "reasoning": "각 축 점수의 근거를 1-2문장으로 설명",
  "summary": "이 메뉴의 맛을 한 줄로 요약"
}

주의:
- confidence는 유효 리뷰 수와 의견 일치도에 비례합니다.
  · 리뷰 5건+ 의견 일치 → 0.8-1.0
  · 리뷰 3-4건 → 0.5-0.7
  · 리뷰 1-2건 → 0.2-0.4
  · 리뷰 0건 (사진만) → 0.1-0.2
- 50에서 벗어나는 모든 점수에는 reasoning에서 근거를 밝히세요.
```

**검증 (서버 사이드)**:
- 모든 축 0-100 범위 체크
- confidence < 0.2이면 결과 저장은 하되 DNA 반영 시 가중치 대폭 하향
- 6축 모두 50이면 의미 없는 결과로 판단 → 재시도 1회 (다른 검색어로)

---

#### Step 2-B: 와인 WSET 테이스팅 + 정보 산출

**시퀀스 (3단계 파이프라인)**:

```
2-B-1. 와인 식별 + 객관적 정보 수집
  - record_ai_analyses에서 와인 라벨 OCR 추출
  - LLM에게 와인 식별 요청: 와인명, 빈티지, 와이너리, 산지, 품종 추정
  - 추정된 와인으로 적정 가격대, 비평가 점수 검색
  - 영수증/음식 사진이 있으면: 구입가, 페어링 음식도 자동 추출
  - → record_ai_analyses.wine_info + pairing_food에 저장

2-B-2. AI WSET 테이스팅 노트 산출 (LLM)
  - 와인 정보(품종, 산지, 빈티지, 생산자) 기반으로 7축 테이스팅 점수 산출
  - → record_ai_analyses.wine_tasting_ai에 저장

2-B-3. 사용자 테이스팅 노트 수집 후 병합
  - 사용자가 기록한 WSET 7축 + AI 산출 7축 → 평균
  - → record_taste_profiles에 저장 (source='ai_user_avg')
  - 사용자가 테이스팅 노트를 기록하지 않은 경우: AI 값만 사용 (source='ai')
```

**2-B-2 프롬프트 (와인 WSET 테이스팅 + 정보)**:

```
당신은 WSET Diploma 수준의 와인 전문가입니다.
아래 와인의 객관적 정보를 수집하고, WSET 체계적 테이스팅 기준으로 맛 특성을 점수화하세요.

## 대상 와인
- 라벨 OCR: {labelText}
- 사진 분석: {photoDescription}

## Task 1: 와인 식별 + 객관적 정보

와인을 정확히 식별하고 아래 정보를 수집하세요.
- 정확한 와인명
- 빈티지 (불명 시 null)
- 와이너리/생산자
- 산지 (국가 + 지역)
- 주요 품종
- 적정 가격대 (KRW, 시장 평균 기준)
- 비평가 점수 (Robert Parker, Wine Spectator 등 있으면)

## Task 2: WSET 테이스팅 노트 (0-100 점수)

해당 와인의 일반적 특성을 기준으로 점수화하세요.

### WSET 기준 평가 축
- acidity (산미): 0=매우 낮음(플랫), 50=보통, 100=매우 높음(날카로운)
- body (바디감): 0=극라이트, 50=미디엄, 100=극풀바디
- tannin (타닌): 0=없음(화이트/로제), 50=미디엄, 100=매우 강함
- sweetness (당도): 0=본 드라이, 50=오프드라이, 100=디저트 와인급
- balance (균형): 0=한 요소 극단적 돌출, 50=보통, 100=완벽 균형
- finish (여운): 0=즉시 사라짐, 50=보통(5-10초), 100=매우 긴(30초+)
- aroma (향 복합도): 0=단순(1-2가지), 50=보통, 100=극복합(5가지+)

### 품종·산지별 기본 프로필 (참고)
- 카베르네 소비뇽 (나파): body 80, tannin 75, acidity 50
- 카베르네 소비뇽 (보르도): body 70, tannin 70, acidity 60
- 피노 누아 (부르고뉴): body 40, tannin 30, acidity 70
- 리슬링 (모젤): sweetness 40-70, acidity 85, body 25
- 샤르도네 (오크숙성): body 65, aroma 60
- 샤르도네 (언오크): body 40, acidity 65
- 바로사 쉬라즈: body 85, tannin 65
- 북부 론 시라: body 65, tannin 60, acidity 60

### 정밀도 요구
- 같은 품종이라도 생산자/산지/빈티지에 따라 차이를 반영
- 와인을 식별할 수 없으면 라벨 텍스트에서 최대한 추정, confidence 0.2 이하

## 응답 형식 (JSON)
{
  "wine_info": {
    "name": "와인명",
    "vintage": 2020 | null,
    "winery": "생산자",
    "origin": { "country": "프랑스", "region": "부르고뉴" },
    "variety": "피노 누아",
    "estimated_price_krw": 85000,
    "critic_score": { "source": "Robert Parker", "score": 92 } | null
  },
  "tasting": {
    "acidity": 0-100,
    "body": 0-100,
    "tannin": 0-100,
    "sweetness": 0-100,
    "balance": 0-100,
    "finish": 0-100,
    "aroma": 0-100
  },
  "confidence": 0.0-1.0,
  "reasoning": "각 축 점수 근거",
  "summary": "이 와인의 특성 한 줄 요약"
}

주의:
- 화이트/로제 와인이면 tannin은 0-10.
- 스파클링은 acidity 기본 65+.
- confidence는 와인 식별 정확도에 비례.
```

**검증 (서버 사이드)**:
- 화이트 와인인데 tannin > 20이면 경고 로그
- sweetness > 70이면 디저트 와인 확인
- confidence < 0.3이면 DNA 반영 시 가중치 대폭 하향
- wine_info.estimated_price_krw가 있으면 record_ai_analyses.wine_info에 저장

#### Step 3: DNA 반영 — POST /api/records/post-process

Step 2 완료 후 호출. Taste DNA와 Style DNA를 모두 업데이트하고, `phase_status = 2`로 마킹하여 AI 분석 완료를 표시. 이 단계는 try/finally로 보장되어 앞 단계 실패 시에도 반드시 실행된다.

```
Input: recordId (내부에서 record + taste_profile 조회)
```

**Taste DNA 반영 공식**:

```
카테고리 B(객관적 맛 특성) × 카테고리 A(주관적 종합 경험) → DNA

각 축(axis)에 대해:
  food_score = record_taste_profiles[axis]   // 객관적 맛 특성 (0-100)
                                              // 식당: AI 산출, 와인: AI+사용자 평균, 요리: 수동
  user_satisfaction = record.rating_overall   // 유형별 종합 만족도 (저장 시 자동 계산)
                                              // 식당: (taste+value+service+atmosphere+cleanliness+portion)/6
                                              // 와인: (taste+value)/2
                                              // 요리: (balance+taste)/2

  // confidence 가중치 (AI 산출 정확도 반영)
  conf_weight = record_taste_profiles.confidence   // 0.0-1.0
  if conf_weight < 0.2: skip (DNA 반영하지 않음)

  // 이 음식의 해당 맛 특성이 강할수록(≥50) + 만족도가 높을수록 → 선호 상승
  if food_score >= 50 && user_satisfaction >= 40:
    signal = (food_score / 100) * (user_satisfaction / 100) * conf_weight
    user.tasteDna[axis] = weighted_moving_avg(기존값, signal * 100, 최근 50건 가중)

  // 해당 맛 특성이 강한데(≥50) + 만족도가 낮으면 → 선호 하락
  else if food_score >= 50 && user_satisfaction < 40:
    signal = (food_score / 100) * ((100 - user_satisfaction) / 100) * conf_weight * -1
    user.tasteDna[axis] = weighted_moving_avg(기존값, signal, 최근 50건 가중)

  // 요리(source='manual')의 경우 conf_weight = 1.0 (사용자 직접 입력이므로 최대 신뢰)
```

**유형별 DNA 반영 대상**:
- 식당 → `taste_dna_restaurant` (6축)
- 와인 → `taste_dna_wine` (7축 WSET 기준) + `dna_summary` 한줄 요약 (LLM 생성)
- 요리 → `taste_dna_cooking` (6축 맛 선호)

**Style DNA 반영 (유형별)**:
- 식당: records.genre → `style_dna_restaurant_genres`, restaurants.region → `style_dna_restaurant_areas`, records.scene → `style_dna_restaurant_scenes`
- 와인: record_ai_analyses.wine_info.variety → `style_dna_wine_varieties`, record_ai_analyses.wine_info.origin.region → `style_dna_wine_regions`, record_ai_analyses.wine_info로부터 타입 추론 → `style_dna_wine_types`, records.scene → `style_dna_wine_scenes`
- 요리: records.genre → `style_dna_cooking_genres`, records.scene → `style_dna_cooking_scenes`

### 4-1b. 주변 식당 검색

#### GET /api/restaurants/nearby

GPS 좌표 기반으로 카카오 API에서 주변 음식점을 검색한다. `analyze-visit` 호출 전에 nearbyPlaces를 채우기 위해 사용.

```
Query: ?lat=37.5665&lng=126.9780&radius=500
Output: { places: [{ externalId, name, address, categoryName, lat, lng, phone, url }] }
```

---

### 4-1c. 식당 검색

#### GET /api/restaurants/search

키워드 기반으로 카카오 API에서 음식점을 검색한다. 발견 페이지 등에서 사용.

```
Query: ?query=마라탕&x=126.9780&y=37.5665&radius=1000
Output: { places: [{ externalId, name, address, categoryName, lat, lng, phone, url }] }
```

---

### 4-2. 블로그 생성

#### POST /api/records/generate-review
Phase 2 AI 블로그 리뷰 생성. AI 파이프라인이 이미 완료된 상태에서 호출.

- **Step 1** (answers 빈 객체): 기록 데이터 기반 질문 3~5개 생성 → `{ success, questions }`
- **Step 2** (answers 포함): 답변 + 기록 데이터 → 매거진 스타일 블로그 생성 → `{ success, blog }`

### 4-3. AI 맛집 추천

#### POST /api/recommend
Taste DNA 기반 AI 맛집 추천. 사용자의 맛 선호 프로필 + 상황 + 위치를 종합하여 추천.

```
Input: {
  tasteDna: { flavorSpicy, flavorSweet, flavorSalty, flavorSour, flavorUmami, flavorRich, tasteTypeName }
  situation: "혼밥" | "데이트" | ...
  location?: "강남" (선택)
  additionalContext?: "매운 거 빼고" (선택)
}

Output: {
  success: boolean
  recommendations: [{ food, reason, tip }]  -- 3건
}
```

### 4-4. 버블 초대

#### POST /api/groups/invite
버블 초대 링크 생성. owner만 호출 가능. invite_code가 없으면 새로 생성.

```
Input: { groupId: UUID }
Output: { inviteUrl: string }
```

### 4-5. 단일 이미지 인식 (선택적)

#### POST /api/recognize
기록 전 미리보기용. 단일 사진 → 메뉴 추정.

- **Input**: `{ imageBase64 }`
- **Output**: `{ menuName, genre, recordType, confidence }`
- **검증**: `FOOD_CATEGORIES` 상수 기반 필터링 (이중 방어)

### 4-6. 궁합 매칭

#### POST /api/compatibility

Taste DNA 유사도 + Style DNA 상호보완성으로 궁합 점수 산출. **service_role**로 양쪽 DNA를 서버사이드에서 읽고, 결과만 반환 (상대방 raw DNA 노출 안 함).

```
Input: { targetUserId: UUID }
Auth: 인증 필수

Flow:
  1. service_role로 양쪽 taste_dna_restaurant + style_dna_restaurant_* 조회
  2. Taste DNA 코사인 유사도 산출 (0-100)
  3. Style DNA 상호보완성 산출 (0-100)
  4. 종합 점수 = similarity * 0.6 + complementarity * 0.4

Output: {
  success: boolean
  overall: number           // 0-100 종합 궁합 점수
  similarity: number        // 0-100 맛 유사도
  complementarity: number   // 0-100 스타일 보완성
  highlights: {
    similarTastes: ["매운맛", "감칠맛"]     // 비슷한 맛 선호
    complementary: ["일식 전문가 ↔ 중식 초보"]  // 상호보완 영역
  }
}
```

### 4-7. 계정 삭제

#### POST /api/auth/delete-account

탈퇴 요청. 30일 유예 후 완전 삭제.

```
Input: { reason?: string, reasonCategory?: 'not_useful' | 'privacy' | 'alternative' | 'other' }
Auth: 재인증 필수 (OAuth 재로그인 — 토큰 탈취 방지)

Flow:
  1. 재인증 확인
  2. account_deletions INSERT (scheduled_at = now + 30일)
  3. users.is_deactivated = true, deactivated_at = now
  4. 모든 세션 무효화 (supabase.auth.signOut({ scope: 'global' }))
  5. 확인 이메일 발송 ("30일 내 로그인하면 복구됩니다")

Output: { success: true, scheduledAt: '2026-04-16T...' }
```

#### POST /api/auth/cancel-deletion

탈퇴 철회. 비활성 계정으로 로그인 시 복구 안내 → 동의 시 호출.

```
Flow:
  1. account_deletions WHERE user_id AND status='pending' 확인
  2. status = 'cancelled', cancelled_at = now
  3. users.is_deactivated = false, deactivated_at = null

Output: { success: true }
```

#### Cron: 계정 삭제 실행 (매일 1회)

Vercel Cron 또는 Supabase Edge Function.

```
1. account_deletions WHERE status='pending' AND scheduled_at <= now()
2. 각 계정에 대해 삭제 실행 (순서 중요):
   a. Supabase Storage: record-photos 버킷에서 사용자 파일 삭제
   b. records DELETE (CASCADE → record_photos, record_journals,
      record_ai_analyses, record_taste_profiles, record_shares,
      bookmarks, reactions, phase_completions 자동 삭제)
   c. comparisons DELETE (CASCADE → comparison_matchups)
   d. groups (owner_id = user_id) 처리:
      - 다른 멤버 존재 → 가장 오래된 moderator/member에게 owner 이관
      - 혼자 → groups DELETE (CASCADE → group_stats, group_memberships)
   e. group_memberships DELETE (비소유 버블 탈퇴)
   f. notifications DELETE
   g. taste_dna_restaurant / wine / cooking DELETE
   h. style_dna_restaurant_* / wine_* / cooking_* DELETE
   i. user_stats DELETE
   j. users DELETE
   k. supabase.auth.admin.deleteUser(userId)
3. account_deletions.status = 'completed', completed_at = now
```

**비활성화 중 처리 (proxy.ts 미들웨어)**:
- `users.is_deactivated = true`인 사용자 로그인 시 → 삭제 예정 안내 + 복구 옵션
- 다른 사용자에게는 "탈퇴한 사용자"로 표시 (닉네임 마스킹)
- 버블 피드에서 해당 사용자 기록 숨김

---

## 5. 핵심 알고리즘

### 5-1. 허용 상수 (SSOT)

`shared/constants/categories.ts`에서 정의. 모든 AI 프롬프트 + 서버 응답 필터링에 사용.

```typescript
FOOD_CATEGORIES: korean, chinese, japanese, western, chicken, pizza,
                 burger, snack, jokbal, stew, katsu, bbq,
                 seafood, asian, cafe, salad, lunchbox
                 // 식당(record_type='restaurant') 전용
COOKING_GENRES:  korean, western, chinese, japanese, baking, dessert, beverage
                 // 요리(record_type='cooking') 전용. records.genre에 저장
WINE_TYPES:      red, white, sparkling, rose, orange, natural
                 // 와인 타입. records.genre 사용 안 함 — AI가 wine_info에서 추론 → style_dna_wine_types로 반영
FLAVOR_TAGS:     매운, 달콤한, 짭짤한, 시큼한, 감칠맛, 담백한, 기름진, 고소한, 향긋한, 깔끔한
TEXTURE_TAGS:    바삭한, 부드러운, 쫄깃한, 크리미한, 아삭한, 촉촉한
ATMOSPHERE_TAGS: 조용한, 활기찬, 캐주얼, 포멀, 아늑한, 개방적, 감성적, 모던한
RESTAURANT_SCENES: 혼밥, 데이트, 비즈니스, 가족, 친구모임, 술자리, 브런치, 간단점심
WINE_SCENES:       혼술, 데이트, 페어링, 파티, 테이스팅
COOKING_SCENES:    일상식사, 밀프렙, 손님초대, 도시락, 다이어트
WINE_PRICE_RANGES: [
  { key: 'under_30k', label: '~3만원', max: 30000 },
  { key: '30k_50k',   label: '3~5만원', min: 30000, max: 50000 },
  { key: '50k_100k',  label: '5~10만원', min: 50000, max: 100000 },
  { key: 'over_100k', label: '10만원~', min: 100000 },
]
```

### 5-2. Taste DNA 산출

**공통 공식**: `객관적 맛 특성(카테고리 B) × 주관적 만족도(카테고리 A) → DNA`

| 유형 | 객관적 맛 특성 (B) | 만족도 (A) = rating_overall | DNA 대상 |
|------|-------------------|---------------------------|----------|
| 식당 | AI 웹 리뷰 교차 검증 6축 | (taste+value+service+atmosphere+cleanliness+portion) / 6 | taste_dna_restaurant (6축) |
| 와인 | AI + 사용자 WSET 평균 7축 | (taste+value) / 2 | taste_dna_wine (7축) |
| 요리 | 사용자 수동 입력 6축 | (balance+taste) / 2 | taste_dna_cooking (6축) |

```
예시 (식당):
  - 매운맛 75인 음식에 종합 만족도 90점 → 매운맛 선호 ↑↑
  - 매운맛 75인 음식에 종합 만족도 30점 → 매운맛 선호 ↓
  - 매운맛 20인 음식에 종합 만족도 90점 → 매운맛에 대한 신호 미약 (담백한 음식을 좋아한 것)

예시 (와인):
  - 산미 80인 와인에 종합 만족도 90점 → 높은 산미 선호 ↑↑
  - 타닌 70인 와인에 종합 만족도 30점 → 강한 타닌 선호 ↓
```

누적 방식: 최근 50건 가중 이동 평균 (최신 기록일수록 가중치 높음).

### 5-3. 궁합 알고리즘

> **RLS 처리**: 궁합 매칭 API(`/api/compatibility`)에서 service_role 키로 양쪽 DNA를 서버사이드에서 읽고 계산 후 결과만 반환. 클라이언트에 상대방 raw DNA를 노출하지 않아 프라이버시 보호. taste_dna_* RLS는 "본인만 SELECT" 유지.

```typescript
// Phase 1: 식당 기록 기반으로 산출 (와인/요리 DNA 반영은 Phase 2+)
function calculateOverallCompatibility(userA, userB): number {
  const similarity = cosineSimilarity(
    userA.tasteDnaRestaurant,   // taste_dna_restaurant 6축 벡터
    userB.tasteDnaRestaurant
  )  // 0-100
  const complementarity = styleDnaGap(
    userA.styleDnaRestaurant,   // style_dna_restaurant_genres/areas/scenes
    userB.styleDnaRestaurant
  )  // 0-100
  return similarity * 0.6 + complementarity * 0.4
}
```

- similarity: taste_dna_restaurant 6축 벡터의 코사인 유사도
- complementarity: style_dna_restaurant에서 상대가 전문적(lv≥5)이고 내가 약한(lv≤3) 영역이 많을수록 높음

### 5-4. Phase 3 비교 게임

**시작 조건**: 
- 식당/요리: 동일 genre 값의 기록이 4건 이상인 장르만 비교 가능.
- 와인: 품종(variety)/산지(region)/타입(type)/가격대(priceRange) 중 2~3개 AND 조합으로 4건 이상 모이는 그룹을 자동 탐색. 가격대는 구간(~3만/3~5만/5~10만/10만~)으로 분류.
- 미달 그룹은 UI에서 비활성화.

**점수 보정 (Elo 스타일)**:

```typescript
const K = 8
const expected = 1 / (1 + Math.pow(10, (loser.rating - winner.rating) / 400))
winner.rating += K * (1 - expected)
loser.rating  -= K * expected
```

### 5-5. XP & 레벨 시스템

#### XP 획득 (phase_completions + user_stats.points)

| 활동 | XP | 구현 상태 |
|------|-----|-----------|
| Phase 1 완료 | +5 | ✅ 구현 |
| Phase 2 완료 | +15 | ✅ 구현 |
| Phase 3 참여 | +5 | ✅ 구현 |
| 새 장르 첫 기록 | +10 | ❌ 미구현 — post-process에서 records.genre 중복 체크 |
| 7일 연속 기록 | +20 | ❌ 미구현 — post-process에서 user_stats.current_streak_days 체크 |
| 4종 사진 완성 | +3 | ❌ 미구현 — post-process에서 record_ai_analyses.photo_classifications 체크 |

#### 레벨 산출

```
nyam_level = f(user_stats.points)
  Lv.1:  0 XP
  Lv.5:  300 XP
  Lv.15: 1,200 XP
  Lv.30: 3,600 XP
```

레벨 해금은 user_stats.nyam_level에 저장. points 변경 시 재계산.

> **구현 방식**: 모든 XP 보너스는 post-process API 로직에서 처리 (DB 트리거 사용 안 함). 새 장르/연속 기록/사진 완성 여부를 post-process 단계에서 함께 체크하고, 해당 시 phase_completions에 기록 + user_stats.points 업데이트.

### 5-6. 재분석 파이프라인

기록의 사진이나 정보가 변경되어 AI 재분석이 필요한 경우:

```
1. record_ai_analyses에 새 행 INSERT (이력 보존, 최신 1건만 활용)
2. record_taste_profiles UPSERT (ON CONFLICT record_id → UPDATE, 최신값으로 덮어쓰기)
3. post-process 재호출:
   - MVP: 해당 사용자의 전체 기록 기반 Taste DNA 재계산 (batch)
     → 이전 값 제거/보정의 복잡도를 피하고 정확성 확보
   - Phase 2+: 증분 업데이트 (이전 기여분 차감 → 새 기여분 반영)
```

> **MVP에서 batch 재계산 비용**: 기록 50건 이하에서는 무시할 수 있는 수준. 기록 100건+ 시 최적화 검토.

### 5-7. Today's Pick

1. 고평점 재방문 후보 (rating ≥ 70, 2개월 이상 미방문)
2. 위치 기반 근처 기록
3. Taste DNA 유사 음식 추천
4. 기록 부족 시 온보딩 메시지 fallback

---

## 6. 사진 저장 흐름

```
동기 (사용자 대기):
0. 저장 전 검증: 사진 1장 이상 + 종합 경험 평가(카테고리 A) 1개 이상 필수. 미충족 시 저장 버튼 비활성화.
1. 사용자가 사진 선택 (label + hidden input 패턴, 최대 8장)
2. resizeImage() → 최대 1024px로 리사이즈
3. uploadRecordPhoto() → Supabase Storage (record-photos 버킷)에 업로드
4. repo.create() → records 테이블에 기록 저장 (phase_status=1)
5. record_photos 테이블에 photo_url, order_index 삽입
6. phase_completions에 Phase 1 XP (+5) 기록
6b. 🍷 와인 전용: record_taste_profiles에 사용자 WSET 7축 입력값 저장 (wine_*_user 컬럼, source='pending_user'). 사용자가 WSET 미입력 시 스킵.
6c. 🍳 요리 전용: record_taste_profiles에 사용자 맛 특성 6축 저장 (source='manual')
→ 저장 완료, 사용자에게 즉시 응답

비동기 (백그라운드 — 유형별 분기, try/finally로 post-process 보장):
  🍽️ 식당:
  7. POST /api/records/enrich → 식당·메뉴 특정, record_ai_analyses 저장 (실패 시 non-fatal)
  8. POST /api/records/taste-profile → 웹 리뷰 교차 검증 → record_taste_profiles (source='ai') (실패 시 non-fatal)
  9. POST /api/records/post-process → taste_dna + style_dna 업데이트 + phase_status=2 (항상 실행)

  🍷 와인:
  7. POST /api/records/enrich → 와인 식별 + 객관적 정보 수집 (실패 시 non-fatal)
  8. POST /api/records/taste-profile → WSET 7축 AI 산출 + 사용자 기록 평균 (실패 시 non-fatal)
  9. POST /api/records/post-process → taste_dna_wine + style_dna_wine_* 업데이트 + phase_status=2 (항상 실행)

  🍳 요리:
  7-8. 스킵
  9. POST /api/records/post-process → taste_dna_cooking + style_dna_cooking_* 업데이트 + phase_status=2 (항상 실행)

  ※ enrich/taste-profile 실패 시에도 post-process는 반드시 실행되어 phase_status를 업데이트.
  ※ 기록 상세 페이지에서 SWR 폴링(3초)으로 phase_status 변화를 감지 → 토스트 알림 + Phase 2 CTA 표시.
```

---

## 7. 인증 & 보안

### 7-1. 미들웨어 (proxy.ts)

```
모든 요청 → Supabase Auth 세션 확인
  ├── 인증됨 + is_deactivated=true → 삭제 예정 안내 페이지 (복구 옵션 제공)
  ├── 인증됨 + /auth/login → / 리다이렉트
  ├── 미인증 + 보호된 경로 → /auth/login 리다이렉트
  └── 공개 경로 (/auth, /offline, /api, manifest.json, 정적 파일) → 통과
```

### 7-2. RLS 정책

| 테이블 | SELECT | INSERT | UPDATE | DELETE |
|--------|--------|--------|--------|--------|
| users | 본인 + 버블 멤버 | 트리거 (auth) | 본인 | — |
| records | 본인 OR visibility='public' OR (visibility='group' AND record_shares 통해 본인 가입 버블에 공유됨) | 본인 | 본인 | 본인 |
| record_photos | records와 동일 (JOIN) | 본인 기록 | 본인 기록 | 본인 기록 |
| record_journals | records와 동일 (JOIN) | 본인 기록 | 본인 기록 | 본인 기록 |
| record_ai_analyses | 본인 기록 | service_role | — | — |
| record_taste_profiles | 본인 기록 | service_role(AI) / 본인(요리 수동, 와인 WSET) | service_role(AI 병합) | — |
| record_shares | 버블 멤버 | 본인 기록 | — | 본인 기록 |
| bookmarks | 본인 | 본인 | — | 본인 |
| reactions | 대상 기록 접근 가능 시 | 인증 사용자 | 본인 | 본인 |
| groups | 멤버 OR access_type='public' | 인증 사용자 | owner | owner |
| group_memberships | 멤버 | 인증 사용자 | owner/본인 | owner/본인 |
| taste_dna_restaurant / wine / cooking | 본인 | 본인 | 본인 | — |
| style_dna_restaurant_* | 본인 | service_role | service_role | — |
| style_dna_wine_* | 본인 | service_role | service_role | — |
| style_dna_cooking_* | 본인 | service_role | service_role | — |
| user_stats | 본인 | 본인 | 본인/service_role | — |
| restaurants | 모두 | service_role | service_role | — |
| phase_completions | 본인 | 본인/service_role | — | — |
| comparisons | 본인 | 본인 | 본인 | 본인 |
| comparison_matchups | 본인 비교 | 본인 비교 | 본인 비교 | — |
| restaurant_stats | 모두 | service_role | service_role | — |
| group_stats | 멤버 | service_role | service_role | — |
| notifications | 본인 (수신자) | service_role / 본인 | 본인 (is_read만) | 본인 |
| account_deletions | 본인 | 본인 | 본인 (cancel만) | — |

---

## 8. 성능 & 제약

| 항목 | 제한 |
|------|------|
| 사진 업로드 | 최대 8장/기록, 5MB/장, 1024px 리사이즈 |
| AI 분석 | Gemini 2.5 Flash, 30초 타임아웃 |
| 캘린더 조회 | 월 단위 (year + month 파라미터) |
| 레이아웃 | max-w-lg (512px), 모바일 퍼스트 |
| 지도 | 네이버/카카오 토글, 반경 500m 검색 |
