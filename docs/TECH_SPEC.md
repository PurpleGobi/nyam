# Nyam — Technical Specification

> 버전: 2.0.0 | 작성일: 2026-03-17
> 관련 문서: [PRD.md](./PRD.md) · [DESIGN_SPEC.md](./DESIGN_SPEC.md)

---

## 1. 기술 스택

| 영역 | 기술 | 비고 |
|------|------|------|
| 프레임워크 | Next.js 16 (App Router, Turbopack) | React 19, TypeScript strict |
| 스타일링 | Tailwind CSS 4 + shadcn/ui | 유틸리티 기반, 컴포넌트 라이브러리 |
| 상태 관리 | SWR | 데이터 페칭 + 캐싱 |
| 데이터베이스 | PostgreSQL (Supabase) | RLS 적용, 실시간 구독 |
| 스토리지 | Supabase Storage | record-photos 버킷 |
| AI | Google Gemini 2.5 Flash | 사진 분석, 블로그 생성 |
| 지도 | 네이버 Maps + 카카오 Maps | 토글 전환 |
| 인증 | Supabase Auth (OAuth) | Google, Kakao, Naver |
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

### 3-1. 핵심 테이블

#### records
```sql
id                UUID PK DEFAULT gen_random_uuid()
user_id           UUID FK → auth.users NOT NULL
restaurant_id     UUID FK → restaurants NULL
record_type       VARCHAR NOT NULL  -- 'restaurant' | 'wine' | 'cooking'
menu_name         TEXT
category          VARCHAR           -- 'korean' | 'japanese' | ... (categories.ts 기반)
sub_category      VARCHAR NULL
rating_overall    NUMERIC           -- 0-100 평균
rating_taste      SMALLINT          -- 0-100 (유형별 항목)
rating_value      SMALLINT
rating_service    SMALLINT
rating_atmosphere SMALLINT
rating_cleanliness SMALLINT
rating_portion    SMALLINT
-- 와인: rating_aroma, rating_body, rating_acidity, rating_finish, rating_balance
-- 요리: rating_difficulty, rating_time_spent, rating_reproducibility, rating_plating
comment           TEXT NULL
tags              TEXT[] DEFAULT '{}'
flavor_tags       TEXT[] DEFAULT '{}'   -- categories.ts FLAVOR_TAGS에서만 선택
texture_tags      TEXT[] DEFAULT '{}'   -- categories.ts TEXTURE_TAGS에서만 선택
atmosphere_tags   TEXT[] DEFAULT '{}'   -- categories.ts ATMOSPHERE_TAGS에서만 선택
visibility        visibility DEFAULT 'private'  -- 'private' | 'group' | 'public'
ai_recognized     BOOLEAN DEFAULT false
completeness_score NUMERIC DEFAULT 0
location_lat      DOUBLE PRECISION NULL
location_lng      DOUBLE PRECISION NULL
phase_status      SMALLINT DEFAULT 1   -- 1 | 2 | 3
phase1_completed_at TIMESTAMPTZ NULL
phase2_completed_at TIMESTAMPTZ NULL
phase3_completed_at TIMESTAMPTZ NULL
scaled_rating     NUMERIC NULL          -- Elo 기반 보정 점수
comparison_count  INTEGER DEFAULT 0
visit_time        VARCHAR NULL
companion_count   SMALLINT NULL
total_cost        INTEGER NULL
price_per_person  INTEGER NULL
created_at        TIMESTAMPTZ DEFAULT now()
```

#### record_photos
```sql
id            UUID PK DEFAULT gen_random_uuid()
record_id     UUID FK → records ON DELETE CASCADE
photo_url     TEXT NOT NULL
thumbnail_url TEXT NULL
order_index   SMALLINT DEFAULT 0
ai_labels     TEXT[] DEFAULT '{}'
photo_type    VARCHAR DEFAULT 'food'  -- 'signboard' | 'menu' | 'companion' | 'receipt' | 'food' | 'other'
ai_description TEXT NULL
```

#### record_journals (Phase 2 블로그)
```sql
id            UUID PK
record_id     UUID FK → records ON DELETE CASCADE UNIQUE
blog_title    TEXT NULL
blog_content  TEXT NULL
blog_sections JSONB NULL    -- [{type: 'text'|'photo', content, photoIndex?, caption?}]
ai_questions  JSONB NULL    -- [{id, question, options[], type: 'select'|'freetext'}]
user_answers  JSONB NULL    -- {questionId: answer}
published     BOOLEAN DEFAULT false
published_at  TIMESTAMPTZ NULL
```

#### phase_completions
```sql
id          UUID PK
user_id     UUID FK → auth.users
record_id   UUID FK → records ON DELETE CASCADE
phase       SMALLINT  -- 1 | 2 | 3
xp_earned   INTEGER
completed_at TIMESTAMPTZ DEFAULT now()
```

### 3-2. 사용자 데이터

#### user_stats
```sql
user_id           UUID PK FK → auth.users
total_records     INTEGER DEFAULT 0
total_photos      INTEGER DEFAULT 0
groups_count      INTEGER DEFAULT 0
nyam_level        INTEGER DEFAULT 1
points            INTEGER DEFAULT 0
weekly_records    INTEGER DEFAULT 0
monthly_records   INTEGER DEFAULT 0
current_streak    INTEGER DEFAULT 0
longest_streak    INTEGER DEFAULT 0
total_reactions   INTEGER DEFAULT 0
```

#### taste_dna
```sql
user_id              UUID PK FK → auth.users
spicy_preference     NUMERIC DEFAULT 50    -- 0-100
sweet_preference     NUMERIC DEFAULT 50
salty_preference      NUMERIC DEFAULT 50
sour_preference      NUMERIC DEFAULT 50
umami_preference     NUMERIC DEFAULT 50
rich_preference      NUMERIC DEFAULT 50    -- 기름진 ↔ 담백한
texture_preferences  JSONB DEFAULT '{}'
atmosphere_preferences JSONB DEFAULT '{}'
taste_type_code      VARCHAR NULL          -- 'bold-savory' 등
category_preferences JSONB DEFAULT '{}'
price_sensitivity    NUMERIC DEFAULT 50
adventurousness      NUMERIC DEFAULT 50
record_count         INTEGER DEFAULT 0
last_updated         TIMESTAMPTZ
```

#### Style DNA 테이블 — experience_atlas (regions / genres / scenes)
```sql
-- experience_atlas_regions
user_id    UUID FK
region     VARCHAR         -- 지역명
level      INTEGER DEFAULT 1
xp         INTEGER DEFAULT 0
record_count INTEGER DEFAULT 0
unique_restaurants INTEGER DEFAULT 0
last_visited TIMESTAMPTZ

-- experience_atlas_genres (동일 구조, genre 컬럼)
-- experience_atlas_scenes (동일 구조, scene 컬럼)
```

### 3-3. 소셜 데이터

#### groups
```sql
id              UUID PK
name            VARCHAR NOT NULL
description     TEXT NULL
group_type      VARCHAR DEFAULT 'private'  -- 'private' | 'public' | 'viewonly' | 'paid'
owner_id        UUID FK → auth.users
member_count    INTEGER DEFAULT 1
max_members     INTEGER DEFAULT 30
category_tags   TEXT[] DEFAULT '{}'
entry_requirements JSONB DEFAULT '{}'
invite_code     VARCHAR UNIQUE NULL
```

#### comparisons / comparison_matchups (Phase 3)
```sql
-- comparisons
id                UUID PK
user_id           UUID FK
category          VARCHAR
bracket_size      SMALLINT      -- 4 | 8 | 16
status            VARCHAR       -- 'in_progress' | 'completed'
winner_record_id  UUID FK → records ON DELETE SET NULL

-- comparison_matchups
id             UUID PK
comparison_id  UUID FK → comparisons
round          SMALLINT
match_index    SMALLINT
record_a_id    UUID FK → records ON DELETE CASCADE
record_b_id    UUID FK → records ON DELETE CASCADE
winner_id      UUID FK → records ON DELETE SET NULL
```

### 3-4. FK Cascade 정책

| 자식 테이블 | FK 컬럼 | 삭제 정책 |
|------------|---------|-----------|
| record_photos | record_id | CASCADE |
| record_journals | record_id | CASCADE |
| record_ai_analyses | record_id | CASCADE |
| record_shares | record_id | CASCADE |
| bookmarks | record_id | CASCADE |
| reactions | record_id | CASCADE |
| phase_completions | record_id | CASCADE |
| comparison_matchups | record_a_id, record_b_id | CASCADE |
| comparison_matchups | winner_id | SET NULL |
| comparisons | winner_record_id | SET NULL |

---

## 4. API 라우트

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
- "category"는 반드시 허용 목록의 영문 key를 사용하세요.
- "flavorTags", "textureTags"는 허용 목록에서만 선택하세요.

## category 허용 목록
{FOOD_CATEGORIES.map(c => `"${c.value}" → ${c.label}`)}

## 응답 형식
{
  "restaurantName": "식당 이름 (간판 OCR 또는 주변 매칭)",
  "category": "korean | japanese | ...",
  "orderedItems": ["주문 메뉴 추정"],
  "menuItems": [{"name": "메뉴명", "price": 숫자}],
  "totalCost": 총액 | null,
  "companionCount": 인원수(기본 1)
}
```

**검증**: category는 `FOOD_CATEGORIES`에서만 허용. 범위 외 → 무시.

#### Step 2: 리뷰 교차 검증 → 맛 프로필 산출 — POST /api/records/taste-profile

Step 1에서 식당·메뉴가 특정된 후 호출.

```
Input: { recordId, restaurantName, menuItems }
```

**처리 흐름**:

```
1. 웹 검색: "{식당명} {메뉴명} 후기" → 네이버 블로그/카카오 리뷰 수집 (상위 5-10건)
2. 리뷰 텍스트 → Gemini에게 맛 특성 추출 요청
3. 추출된 맛 특성 → 6축 점수화 (0-100)
4. record_taste_profile 테이블에 저장
```

**프롬프트 (리뷰 분석)**:

```
아래는 "{식당명}"의 "{메뉴명}"에 대한 실제 고객 리뷰입니다.
리뷰들을 종합 분석하여 이 음식의 객관적인 맛 특성을 0-100 점수로 평가하세요.

## 리뷰
{reviews.map((r, i) => `리뷰 ${i+1}: ${r.text}`)}

## 평가 기준
- spicy (매운맛): 0=전혀 안 매움, 50=보통, 100=극도로 매움
- sweet (단맛): 0=전혀 안 달음, 100=매우 달콤
- salty (짠맛): 0=매우 싱거움, 100=매우 짠
- sour (신맛): 0=신맛 없음, 100=매우 신
- umami (감칠맛): 0=깔끔/담백, 100=깊은 감칠맛
- rich (기름진맛): 0=매우 담백, 100=매우 기름진/느끼한

## 응답 형식
{
  "spicy": 0-100,
  "sweet": 0-100,
  "salty": 0-100,
  "sour": 0-100,
  "umami": 0-100,
  "rich": 0-100,
  "confidence": 0.0-1.0,
  "reviewCount": 분석한 리뷰 수,
  "summary": "이 음식의 맛을 한 줄로 요약"
}

리뷰에서 해당 맛 특성에 대한 언급이 없으면 50(중립)으로 설정하세요.
언급 빈도가 높을수록 확신을 갖고 점수를 높이거나 낮추세요.
```

**와인일 경우 대체 프롬프트 축**:

```
- body (바디감): 0=라이트, 100=풀바디
- acidity (산미): 0=낮음, 100=높음
- tannin (타닌): 0=부드러운, 100=강한
- sweetness (당도): 0=드라이, 100=스위트
- aroma (향): 0=심플, 100=복합적
- finish (여운): 0=짧은, 100=긴
```

#### Step 3: DNA 반영 — POST /api/records/post-process

Step 2 완료 후 호출. Taste DNA와 Style DNA를 모두 업데이트.

```
Input: recordId (내부에서 record + taste_profile 조회)
```

**Taste DNA 반영 공식**:

```
각 축(axis)에 대해:
  food_score = taste_profile[axis]   // AI가 산출한 이 음식의 맛 특성 (0-100)
  user_satisfaction = record.ratings.taste  // 사용자가 준 만족도 (0-100)

  // 이 음식의 해당 맛 특성이 강할수록(≥50) + 만족도가 높을수록 → 선호 상승
  if food_score >= 50:
    signal = (food_score / 100) * (user_satisfaction / 100)  // 0~1
    user.tasteDna[axis] = weighted_moving_avg(기존값, signal * 100, 최근 50건 가중)

  // 해당 맛 특성이 강한데(≥50) + 만족도가 낮으면 → 선호 하락
  if food_score >= 50 && user_satisfaction < 40:
    signal = (food_score / 100) * ((100 - user_satisfaction) / 100) * -1
    user.tasteDna[axis] = weighted_moving_avg(기존값, signal, 최근 50건 가중)
```

**Style DNA 반영**: category, location, occasion 태그를 각각 WHAT/WHERE/WHEN 테이블에 누적.

### 4-2. 블로그 생성

#### POST /api/records/generate-review
Phase 2 AI 블로그 리뷰 생성. AI 파이프라인이 이미 완료된 상태에서 호출.

- **Step 1** (answers 빈 객체): 기록 데이터 기반 질문 4개 생성 → `{ success, questions }`
- **Step 2** (answers 포함): 답변 + 기록 데이터 → 매거진 스타일 블로그 생성 → `{ success, blog }`

### 4-3. 단일 이미지 인식 (선택적)

#### POST /api/recognize
기록 전 미리보기용. 단일 사진 → 메뉴 추정.

- **Input**: `{ imageBase64 }`
- **Output**: `{ menuName, category, recordType, confidence }`
- **검증**: `FOOD_CATEGORIES` 상수 기반 필터링 (이중 방어)

---

## 5. 핵심 알고리즘

### 5-1. 허용 상수 (SSOT)

`shared/constants/categories.ts`에서 정의. 모든 AI 프롬프트 + 서버 응답 필터링에 사용.

```typescript
FOOD_CATEGORIES: korean, japanese, chinese, western, cafe, dessert,
                 wine, cooking, seafood, meat, vegan, street
FLAVOR_TAGS:     매운, 달콤한, 짭짤한, 시큼한, 감칠맛, 담백한, 기름진, 고소한, 향긋한, 깔끔한
TEXTURE_TAGS:    바삭한, 부드러운, 쫄깃한, 크리미한, 아삭한, 촉촉한
ATMOSPHERE_TAGS: 조용한, 활기찬, 캐주얼, 포멀, 아늑한, 개방적, 감성적, 모던한
SITUATIONS:      혼밥, 데이트, 비즈니스, 가족, 친구모임, 술자리, 브런치, 간단점심
```

### 5-2. Taste DNA 산출

```
Taste DNA = f(음식의 객관적 맛 특성 × 사용자의 주관적 만족도)

  음식의 맛 특성: AI가 리뷰 교차 검증으로 산출 (식당·메뉴별 고유값)
  사용자 만족도:  Phase 1에서 기록한 100점 슬라이더 값

  예시:
  - 매운맛 75인 음식에 맛 90점 → 매운맛 선호 ↑↑
  - 매운맛 75인 음식에 맛 30점 → 매운맛 선호 ↓
  - 매운맛 20인 음식에 맛 90점 → 매운맛에 대한 신호 미약 (담백한 음식을 좋아한 것)
```

누적 방식: 최근 50건 가중 이동 평균 (최신 기록일수록 가중치 높음).

### 5-3. 궁합 알고리즘

```typescript
function calculateOverallCompatibility(userA, userB): number {
  const similarity = cosineSimilarity(userA.tasteDna, userB.tasteDna)    // 0-100
  const complementarity = styleDnaGap(userA.styleDna, userB.styleDna)    // 0-100
  return similarity * 0.6 + complementarity * 0.4
}
```

- similarity: Taste DNA 6축 벡터의 코사인 유사도
- complementarity: Style DNA에서 상대가 전문적(lv≥5)이고 내가 약한(lv≤3) 영역이 많을수록 높음

### 5-4. Phase 3 점수 보정 (Elo 스타일)

```typescript
const K = 8
const expected = 1 / (1 + Math.pow(10, (loser.rating - winner.rating) / 400))
winner.rating += K * (1 - expected)
loser.rating  -= K * expected
```

### 5-5. Today's Pick

1. 고평점 재방문 후보 (rating ≥ 70, 2개월 이상 미방문)
2. 위치 기반 근처 기록
3. Taste DNA 유사 음식 추천
4. 기록 부족 시 온보딩 메시지 fallback

---

## 6. 사진 저장 흐름

```
1. 사용자가 사진 선택 (label + hidden input 패턴, 최대 8장)
2. resizeImage() → 최대 1024px로 리사이즈
3. uploadRecordPhoto() → Supabase Storage (record-photos 버킷)에 업로드
4. repo.create() → records 테이블에 기록 저장
5. record_photos 테이블에 photo_url, order_index, photo_type 삽입
6. fire-and-forget: /api/records/enrich에 photoUrls 전달 → AI 분석
```

---

## 7. 인증 & 보안

### 7-1. 미들웨어 (proxy.ts)

```
모든 요청 → Supabase Auth 세션 확인
  ├── 인증됨 + /auth/login → / 리다이렉트
  ├── 미인증 + 보호된 경로 → /auth/login 리다이렉트
  └── 공개 경로 (/auth, /offline, /api, manifest.json, 정적 파일) → 통과
```

### 7-2. RLS 정책

- `records`: 본인 기록 CRUD + public visibility 조회
- `record_photos`: records와 동일 조건 (JOIN 기반)
- `groups`: 멤버만 조회, owner만 수정/삭제

---

## 8. 성능 & 제약

| 항목 | 제한 |
|------|------|
| 사진 업로드 | 최대 8장/기록, 5MB/장, 1024px 리사이즈 |
| AI 분석 | Gemini 2.5 Flash, 30초 타임아웃 |
| 캘린더 조회 | 월 단위 (year + month 파라미터) |
| 레이아웃 | max-w-lg (512px), 모바일 퍼스트 |
| 지도 | 네이버/카카오 토글, 반경 500m 검색 |
