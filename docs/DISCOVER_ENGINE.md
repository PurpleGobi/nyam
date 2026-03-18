# Nyam Discover Engine — 설계 문서

> 버전: 1.0.0 | 작성일: 2026-03-18
> 관련 문서: [PRD.md](./PRD.md) · [TECH_SPEC.md](./TECH_SPEC.md)

---

## 1. 핵심 컨셉

사용자가 여러 앱을 돌아다니며 검색하는 행위를 **LLM이 대신 수행**한다.

```
기존 사용자 행동:
  카카오맵 검색 → 네이버 블로그 후기 확인 → 인스타 사진 확인 → 망설임 → 결정

Nyam Discover:
  "성수에서 데이트 저녁" 한 줄 입력
  → LLM이 카카오/네이버/리뷰를 교차 검증 (1차)
  → 사용자 Taste DNA + Style DNA 적용 (2차)
  → 추천 이유와 함께 최종 결과 제시
```

**차별점**: 검색이 아니라 **큐레이션**. 결과가 10개가 아니라 **3~5개, 이유와 함께**.

### 기존 기능과의 역할 분담

| 기능 | 위치 | 데이터 범위 | 성격 |
|------|------|------------|------|
| **Today's Pick** | 홈 화면 | 내 기록 안에서 | 패시브 — 열면 바로 보임 |
| **Discover** | 발견 탭 | 내 기록 + 외부 소스 | 액티브 — 검색/탐색 |
| ~~/api/recommend~~ | ~~별도~~ | ~~DNA 기반~~ | **Discover에 흡수** |

> **Note**: 기존 TECH_SPEC의 `POST /api/recommend`는 Discover Engine의 DNA 개인화(2차)에 통합한다. 별도 API로 유지하지 않는다.

---

## 2. 아키텍처 개요

```
┌─────────────────────────────────────────────────┐
│                  사용자 요청                       │
│  "성수에서 데이트 저녁" 또는 필터 선택              │
└────────────────────┬────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────┐
│              1차: 후보 수집 (Multi-Source)         │
│                                                   │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐       │
│  │ 카카오 API│  │네이버 검색│  │ 내부 DB  │       │
│  │ 장소 검색 │  │블로그 리뷰│  │ records  │       │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘       │
│       └──────────┬───┘─────────────┘              │
│                  ▼                                 │
│         LLM 교차 검증 + 통합 랭킹                   │
│         → 후보 10~15개 선별                         │
└────────────────────┬────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────┐
│              2차: DNA 개인화                       │
│                                                   │
│  Taste DNA (맛 선호) + Style DNA (패턴)            │
│  → 후보를 사용자 취향으로 재정렬                     │
│  → 최종 3~5개 선정 + 추천 이유 생성                 │
└────────────────────┬────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────┐
│              최종 결과                             │
│                                                   │
│  ┌─────────────────────────────────────────┐     │
│  │ 🏆 을지로 냉면집                         │     │
│  │ "매운맛 선호도 높고, 을지로 자주 가시는   │     │
│  │  패턴에 딱 맞는 곳이에요"                 │     │
│  └─────────────────────────────────────────┘     │
│  ┌─────────────────────────────────────────┐     │
│  │ 🥈 성수 파스타바                         │     │
│  │ "감칠맛 선호 + 데이트 상황에 최적.        │     │
│  │  분위기 평가가 높은 곳이에요"             │     │
│  └─────────────────────────────────────────┘     │
└─────────────────────────────────────────────────┘
```

---

## 3. 1차 — 후보 수집 (Multi-Source Search)

### 3-1. 입력 처리

사용자 입력은 두 가지 형태:

```
A. 자연어: "강남에서 혼밥하기 좋은 일식집"
B. 필터:   scene=혼밥, genre=japanese, area=강남
```

**LLM이 자연어를 구조화**:

```
Input:  "강남에서 혼밥하기 좋은 일식집, 근데 너무 비싸지 않은 곳, 바삭한 튀김"
Output: {
  area: "강남",
  scene: "혼밥",
  genre: "japanese",
  priceRange: "mid",        // 추론
  tags: {
    flavor: ["고소한"],             // FLAVOR_TAGS에서 매칭
    texture: ["바삭한"],            // TEXTURE_TAGS에서 매칭
    atmosphere: []                  // ATMOSPHERE_TAGS에서 매칭
  },
  keywords: ["일식", "혼밥", "강남", "튀김"],
  negativeKeywords: ["고급", "오마카세"]  // "비싸지 않은" → 제외 조건 추론
}
```

> **태그 매칭**: 자연어에서 FLAVOR_TAGS / TEXTURE_TAGS / ATMOSPHERE_TAGS에 해당하는 키워드를 추출하여 구조화. 내부 DB 검색 시 records.flavor_tags, texture_tags, atmosphere_tags와 배열 교집합(&&) 쿼리에 사용.

### 3-2. 병렬 소스 검색

구조화된 쿼리로 **3개 소스를 병렬 호출**:

```
Source 1: 카카오 Places API
  → keyword: "강남 일식"
  → category: FD6 (음식점)
  → radius: 2km
  → 결과: 15개 장소 (이름, 주소, 카테고리, 평점)

Source 2: 네이버 검색 API
  → query: "강남 혼밥 일식 추천"
  → type: blog
  → 결과: 10개 블로그 포스트 (제목, 본문 snippet, URL)

Source 3: 내부 DB (records + restaurants)
  → WHERE genre = 'japanese'
    AND restaurants.region = '강남'
    AND visibility = 'public'
    AND rating_overall >= 70
    AND flavor_tags && ARRAY['고소한']     -- 태그 교집합 (있으면)
    AND texture_tags && ARRAY['바삭한']    -- 태그 교집합 (있으면)
  → 결과: 내부 사용자 기록 기반 식당 목록
```

### 3-3. LLM 교차 검증 + 통합 랭킹

```
프롬프트:

당신은 맛집 큐레이터입니다. 3개 소스의 검색 결과를 교차 검증하여
최종 후보 10~15개를 선별하세요.

## 사용자 요청
{parsedQuery}

## Source 1: 카카오 Places
{kakakoResults}

## Source 2: 네이버 블로그
{naverResults}

## Source 3: 내부 사용자 기록
{internalResults}

## 교차 검증 규칙
1. 2개 이상 소스에서 언급된 식당 → 신뢰도 상승
2. 내부 기록이 있는 식당 → rating_overall 반영
3. 블로그 리뷰에서 부정 키워드(위생, 불친절, 폐업) → 신뢰도 하락
4. 사용자 제외 조건(negativeKeywords)에 해당 → 제외

## 응답 형식 (JSON)
{
  "candidates": [
    {
      "name": "식당명",
      "address": "주소",
      "genre": "japanese",
      "priceRange": "mid",
      "sourceCount": 3,        // 몇 개 소스에서 언급됐는지
      "internalRating": 85,    // 내부 기록 평균 (없으면 null)
      "highlights": ["혼밥 좌석 있음", "런치 세트 1.2만원"],
      "concerns": [],
      "confidence": 0.85,
      "kakakoId": "12345"      // 카카오 external_id (매칭 시)
    }
  ]
}
```

---

## 4. 2차 — DNA 개인화

### 4-1. Taste DNA 매칭

1차 후보 각각에 대해 맛 프로필을 추정하고 사용자 DNA와 비교:

```
후보 식당의 맛 프로필 확보 방법 (우선순위):
  ① 내부 record_taste_profiles 존재 → 그대로 사용 (가장 정확)
  ② 내부 기록 없음 → 1차에서 수집한 블로그 리뷰 기반 LLM 추정
  ③ 리뷰도 없음 → 장르 기반 기본 프로필 적용

사용자 DNA와 코사인 유사도 산출:
  tasteSimilarity = cosineSimilarity(user.tasteDna, restaurant.tasteProfile)
```

### 4-2. Style DNA 매칭

```
상황 매칭:
  사용자가 "데이트"로 검색 → style_dna_restaurant_scenes에서 데이트 경험치 확인
  → 데이트 lv 높으면 → "경험 많은 상황" → 새로운 곳 추천 가중
  → 데이트 lv 낮으면 → "익숙하지 않은 상황" → 안전한(평점 높은) 곳 추천 가중

지역 매칭:
  style_dna_restaurant_areas에서 해당 지역 경험치 확인
  → 자주 가는 지역 → 안 가본 식당 우선
  → 처음 가는 지역 → 검증된 인기 식당 우선

장르 매칭:
  style_dna_restaurant_genres에서 해당 장르 선호도 확인
  → 선호 장르 → confidence 보정 (이미 좋아하는 장르니까 기대치 충족 확률 높음)
```

### 4-3. 최종 스코어링 + 추천 이유

```typescript
function finalScore(candidate, user, recordCount): {score: number, reason: string} {
  // 기록 수에 따라 가중치 동적 조정 (콜드 스타트 대응)
  const weights = getWeights(recordCount)
  // weights: { taste, style, quality, novelty }
  //   records < 5:  { 0.10, 0.10, 0.60, 0.20 }
  //   records 5~19: { 0.20, 0.20, 0.40, 0.20 }
  //   records 20+:  { 0.35, 0.25, 0.25, 0.15 }

  const taste   = tasteSimilarity(user.tasteDna, candidate.tasteProfile) * weights.taste
  const style   = styleMatch(user.styleDna, candidate, query.scene) * weights.style
  const quality = (candidate.internalRating ?? candidate.confidence * 70) * weights.quality
  const novelty = (isNewForUser(user, candidate) ? 10 : 0) * weights.novelty

  return {
    score: taste + style + quality + novelty,
    reason: generateReason(user, candidate, dominantFactor)
  }
}
```

**추천 이유 생성**:

> **Phase별 구현**: MVP는 템플릿 기반 (LLM 미호출, 속도 우선). Phase 2+에서 LLM 생성으로 전환.

**템플릿 기반 (MVP)**:
```
dominant factor에 따라 선택:
  taste 우세 → "{맛 축} 좋아하시잖아요. 여기 {맛 축} 맛집이에요"
  style 우세 → "{지역} 자주 가시는데, 아직 안 가본 곳이에요"
  quality 우세 → "이 지역 평점 최상위 식당이에요"
  novelty 우세 → "새로운 {장르} 맛집이 생겼어요"
```

**LLM 기반 (Phase 2+)**:

```
프롬프트:

사용자의 맛 선호와 이 식당의 특징을 비교하여
1~2줄의 자연스러운 추천 이유를 작성하세요.

## 사용자 특성
- 맛 DNA: 매운맛 선호 78, 감칠맛 선호 85
- 자주 가는 지역: 성수, 을지로
- 선호 장르: 일식 Lv.8, 한식 Lv.12

## 식당 특성
- 이름: 을지로 냉면집
- 맛 프로필: salty 65, umami 80, spicy 40
- 특징: 혼밥 좌석, 런치 1.2만원

## 규칙
- 존댓말, 친근한 톤
- 구체적 근거 1개 이상 포함
- "~에요", "~거든요" 체
- 15자~40자

예시:
- "감칠맛 강한 국물 좋아하시잖아요. 여기 딱이에요"
- "을지로 자주 가시는데, 아직 안 가본 곳이에요"
```

---

## 5. 사전 계산 (Pre-computation)

### 5-1. 왜 필요한가

```
실시간 처리 시:
  카카오 API (300ms) + 네이버 API (500ms) + LLM 교차 검증 (3~5s) + DNA 매칭 (500ms)
  = 약 5~7초 대기

사전 계산 시:
  캐시에서 결과 조회 (50ms) + DNA 재정렬 (200ms)
  = 약 250ms ← 즉시 응답 느낌
```

### 5-2. 사전 계산 대상

사전 계산의 **조합 결정 로직은 섹션 6(사전 리서치 설정)**에서 관리한다. 자동 모드면 Style DNA 기반으로, 수동 모드면 사용자 설정 기반으로 조합이 결정된다.

```
사전 계산 트리거 조건:
  ① 신규 기록 저장 시 (post-process 완료 후)
  ② discover_preferences의 갱신 주기/시간대에 따라 (pg_cron)
  ③ 발견 페이지 첫 진입 시 (캐시 미스)

조합 단위: area × scene (장르는 1차 후보에서 후필터)

예시 (자동 모드, 사용자 A):
  auto_areas:  [성수, 강남, 을지로]
  auto_scenes: [혼밥, 데이트, 친구모임]

  → "성수_혼밥", "성수_데이트", "성수_친구모임"
  → "강남_혼밥", "강남_데이트", "강남_친구모임"
  → "을지로_혼밥", "을지로_데이트", "을지로_친구모임"
  → 9개 검색을 미리 실행 → 결과 캐싱
```

### 5-3. 캐시 구조

#### discover_cache 테이블

```sql
id              UUID PK DEFAULT gen_random_uuid()
user_id         UUID FK → auth.users NOT NULL
-- 검색 키
query_key       VARCHAR NOT NULL       -- "성수_혼밥" (area_scene 조합)
area            VARCHAR NULL
scene           VARCHAR NULL
genre           VARCHAR NULL
-- 결과
candidates      JSONB NULL             -- 1차 후보 (MVP: 직접 저장 / Phase 2: NULL, shared_cache_key로 참조)
shared_cache_key VARCHAR NULL           -- Phase 2: discover_shared_cache.query_key 참조 (candidates 대체)
personalized    JSONB NULL             -- 2차 DNA 적용된 최종 3~5개 + 추천 이유
-- 메타
source_versions JSONB NULL             -- {kakao: "2026-03-18", naver: "2026-03-18", internal: 1234}
computed_at     TIMESTAMPTZ DEFAULT now()
expires_at      TIMESTAMPTZ NOT NULL   -- computed_at + 24시간
status          VARCHAR DEFAULT 'ready' CHECK (status IN ('computing', 'ready', 'expired', 'failed'))

UNIQUE (user_id, query_key)
```

```sql
-- 만료 캐시 빠른 조회
CREATE INDEX idx_discover_cache_expiry
  ON discover_cache (user_id, expires_at)
  WHERE status = 'ready';
```

> **MVP**: candidates에 직접 저장, shared_cache_key = NULL.
> **Phase 2 (공유 캐시 도입 시)**: candidates = NULL, shared_cache_key로 discover_shared_cache 참조. personalized만 사용자별 보관.

### 5-4. 캐시 TTL 및 무효화

```
TTL: 24시간 (음식점 정보 변동 주기 고려)

즉시 무효화:
  ① 사용자가 새 기록 저장 → DNA 변경 → personalized 재계산
  ② 사용자가 검색 조건 직접 입력 (캐시에 없는 조합)

갱신 주기:
  ① 야간 배치 (02:00~05:00): 활성 사용자(최근 7일 접속) 대상
  ② 발견 페이지 진입 시: expired 캐시 → 백그라운드 갱신 + 기존 결과 먼저 표시 (stale-while-revalidate)
```

---

## 6. 사전 리서치 설정 (`/discover/settings`)

### 6-1. 개요

사전 리서치(Pre-computation)의 조건을 **자동 또는 수동**으로 설정하는 페이지. 발견 탭 내 설정 아이콘으로 진입.

> **강요하지 않는다.** 설정하지 않아도 자동 모드가 기본값으로 잘 동작한다. 설정 페이지는 "더 정밀하게 제어하고 싶은 사용자"를 위한 옵션.

### 6-2. 모드 선택

```
┌─────────────────────────────────────┐
│  사전 리서치 설정                      │
│                                       │
│  ┌─────────────┐  ┌─────────────┐   │
│  │  ● 자동     │  │  ○ 수동     │   │
│  │  내 패턴에   │  │  직접       │   │
│  │  맞게 알아서 │  │  조건 설정   │   │
│  └─────────────┘  └─────────────┘   │
│                                       │
│  자동 모드: 기록 패턴을 분석해서       │
│  최적의 조건으로 미리 검색해둡니다.     │
└─────────────────────────────────────┘
```

### 6-3. 자동 모드 (기본값)

사용자 데이터를 기반으로 **모든 조건을 자동 결정**:

```
분석 대상:
  ├─ style_dna_restaurant_areas  → 자주 가는 지역 상위 3개
  ├─ style_dna_restaurant_scenes → 자주 가는 상황 상위 3개
  ├─ style_dna_restaurant_genres → 선호 장르 상위 3개
  ├─ records.created_at 패턴     → 주로 검색할 시간대 추정
  └─ user_stats.avg_weekly_frequency → 갱신 빈도 결정

자동 결정 항목:
  ① 지역: DNA 상위 3개 + 최근 2주 신규 방문 지역 1개
  ② 상황: DNA 상위 3개
  ③ 장르: 후필터 (별도 계산 불필요)
  ④ 갱신 빈도:
     주 5회+ 기록 → 매일 갱신
     주 2~4회 기록 → 2일마다 갱신
     주 1회 이하   → 3일마다 갱신
  ⑤ 시간대: 기록 생성 시간 분포에서 피크 시간 ±1시간에 갱신 완료
     예: 주로 12시에 기록 → 11시에 점심 추천 사전 계산
         주로 19시에 기록 → 18시에 저녁 추천 사전 계산

표시 (읽기 전용):
  "현재 자동 설정: 성수·강남·을지로 × 혼밥·데이트·친구모임
   2일마다 갱신 / 점심·저녁 시간대 중심"
```

### 6-4. 수동 모드

사용자가 모든 조건을 직접 설정:

```
┌─────────────────────────────────────┐
│  사전 리서치 조건                      │
│                                       │
│  지역 (최대 5개)                      │
│  [성수] [강남] [을지로] [+추가]       │
│                                       │
│  상황 (최대 5개)                      │
│  [혼밥] [데이트] [+추가]              │
│                                       │
│  갱신 빈도                            │
│  ○ 매일  ● 2일마다  ○ 3일마다  ○ 주1회│
│                                       │
│  시간대 (언제 추천이 준비되면 좋을지)   │
│  ☑ 점심 (11시)                        │
│  ☑ 저녁 (17시)                        │
│  ☐ 야식 (21시)                        │
│                                       │
│  가격대                               │
│  ○ 상관없음  ● 보통  ○ 저렴한 곳만    │
│                                       │
│  제외 조건                            │
│  [프랜차이즈 제외] [+추가]             │
│                                       │
│          [저장]                        │
└─────────────────────────────────────┘
```

**수동 설정 항목**:

| 항목 | 선택지 | 저장 위치 |
|------|--------|----------|
| 지역 | 칩 선택 (최대 5개) | discover_preferences.areas |
| 상황 | 칩 선택 (최대 5개) | discover_preferences.scenes |
| 갱신 빈도 | 매일 / 2일 / 3일 / 주1회 | discover_preferences.refresh_interval |
| 시간대 | 점심 / 저녁 / 야식 (복수 선택) | discover_preferences.time_slots |
| 가격대 | 상관없음 / 보통 / 저렴한 곳만 | discover_preferences.price_preference |
| 제외 조건 | 자유 텍스트 태그 (프랜차이즈, 특정 장르 등) | discover_preferences.exclusions |

### 6-5. discover_preferences 테이블

```sql
user_id             UUID PK FK → auth.users ON DELETE CASCADE
mode                VARCHAR DEFAULT 'auto' CHECK (mode IN ('auto', 'manual'))
-- 수동 모드 설정 (mode='manual'일 때만 사용)
areas               TEXT[] DEFAULT '{}'        -- ['성수', '강남', '을지로']
scenes              TEXT[] DEFAULT '{}'        -- ['혼밥', '데이트']
refresh_interval    SMALLINT DEFAULT 2         -- 갱신 주기 (일 단위)
time_slots          TEXT[] DEFAULT '{lunch,dinner}'  -- ['lunch', 'dinner', 'late_night']
price_preference    VARCHAR DEFAULT 'any' CHECK (price_preference IN ('any', 'mid', 'budget'))
exclusions          TEXT[] DEFAULT '{}'        -- ['프랜차이즈']
-- 자동 모드 계산 결과 (mode='auto'일 때 시스템이 채움)
auto_areas          TEXT[] DEFAULT '{}'
auto_scenes         TEXT[] DEFAULT '{}'
auto_refresh_interval SMALLINT NULL
auto_time_slots     TEXT[] DEFAULT '{}'
-- 메타
updated_at          TIMESTAMPTZ DEFAULT now()
```

### 6-6. 사전 리서치 실행 흐름

```
모드 확인:
  ├─ auto → auto_* 필드 기반으로 조합 생성
  └─ manual → areas, scenes 등 수동 설정 기반으로 조합 생성

조합 수:
  auto:   시스템이 최적 조합 수 결정 (보통 6~12개)
  manual: areas × scenes (예: 3지역 × 2상황 = 6개)

갱신 타이밍:
  auto:   기록 패턴 기반 시간대에 맞춰 실행
  manual: time_slots 설정 시간 1시간 전에 실행
          예: lunch 선택 → 10:00에 사전 계산 → 11:00에 결과 준비

트리거:
  ① pg_cron: 매 시간 정각에 "이 시간에 갱신 대상인 사용자" 조회
     → discover_preferences.time_slots + refresh_interval 기준
  ② record 저장 시: post-process에서 자동 트리거 (모드 무관)
```

### 6-7. 자동 모드 패턴 갱신

```
자동 모드의 auto_* 필드는 주기적으로 재계산:

갱신 시점:
  ① 새 기록 저장 시 (post-process 후)
  ② 주 1회 (일요일 야간 배치)

갱신 로직:
  auto_areas = style_dna_restaurant_areas 상위 3 + 최근 신규 지역 1
  auto_scenes = style_dna_restaurant_scenes 상위 3
  auto_refresh_interval = avg_weekly_frequency 기반
    5+/주 → 1일 | 2~4/주 → 2일 | 1이하/주 → 3일
  auto_time_slots = records.created_at 시간 분포 피크에서 결정
    11~14시 피크 → ['lunch']
    17~21시 피크 → ['dinner']
    양쪽 피크 → ['lunch', 'dinner']
```

---

## 7. 콜드 스타트 전략

### 7-1. 기록 0건 — 완전 신규 사용자

```
① 온보딩 필터 유도
   "어떤 음식을 좋아하세요?" → 장르 3개 선택
   "자주 가는 지역은?" → 지역 2개 선택
   "주로 어떤 상황에서?" → 상황 2개 선택

② 필터 기반 일반 추천 (DNA 없이)
   → 카카오 + 네이버 교차 검증만 수행
   → 추천 이유: DNA 대신 "이 지역 인기 맛집이에요" 수준

③ 안내 메시지
   "첫 검색은 30초~1분 정도 걸릴 수 있어요.
    기록이 쌓이면 더 정확하고 빠른 추천을 받을 수 있어요!"

④ 온보딩 선택 → discover_preferences 초기화
   → mode = 'auto'
   → auto_areas = 선택한 지역, auto_scenes = 선택한 상황
   → (사용자가 선택한 값을 auto_*에 seed로 저장. 기록이 쌓이면 데이터 기반으로 덮어씀)

⑤ 백그라운드 사전 계산 시작
   → 선택한 필터 조합으로 즉시 사전 계산 트리거
   → 앱을 닫아도 서버에서 계속 진행
   → 완료 시 push 알림: "맞춤 추천이 준비됐어요!"
```

### 7-2. 기록 1~4건 — 초기 사용자

```
DNA가 불안정한 상태 → finalScore의 가중치가 자동 조정됨 (섹션 4-3 참조)

추천 이유도 단계별로 달라짐:
  records < 5:  "이 지역 평점 최상위 식당이에요" (품질 기반)
  records 5~19: "한식 자주 드시네요. 여기 평점 높아요" (약한 DNA + 품질)
  records 20+:  "매운맛 좋아하시잖아요. 여기 딱이에요" (강한 DNA 기반)
```

### 7-3. 기록 있지만 발견 페이지 첫 진입

```
① 기존 기록에서 seed 데이터 추출
   → 가장 많이 간 지역 + 가장 많이 먹은 장르 + 최근 상황

② 이를 기반으로 즉시 사전 계산 트리거 (3~5개 조합)
   → 로딩 UI 표시: 스켈레톤 카드 + "취향 분석 중..."

③ 첫 조합 결과가 나오는 대로 즉시 표시 (progressive loading)
   → 나머지 조합은 백그라운드에서 계속 진행
```

---

## 8. 백그라운드 처리

### 8-1. 서버 사이드 Job Queue

앱을 닫아도 서버에서 계속 실행되어야 하므로 **클라이언트 의존 없는 서버 Job**.

```
기술 선택지:
  ① Vercel Background Functions (Edge, 최대 5분) ← MVP 권장
  ② Supabase Edge Functions + pg_cron
  ③ 별도 워커 (Phase 2+, 대규모)

Job 유형:
  ├─ discover_precompute  — 사전 계산 (area × scene 조합)
  ├─ discover_refresh     — 만료 캐시 갱신
  └─ discover_cold_start  — 신규 사용자 초기 계산
```

#### discover_jobs 테이블

```sql
id              UUID PK DEFAULT gen_random_uuid()
user_id         UUID FK → auth.users ON DELETE CASCADE NOT NULL
job_type        VARCHAR NOT NULL CHECK (job_type IN ('precompute', 'refresh', 'cold_start'))
query_key       VARCHAR NULL           -- "성수_혼밥" (precompute/refresh 시, 조합당 1 Job)
status          VARCHAR DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed'))
priority        SMALLINT DEFAULT 5     -- 1=최고 (콜드스타트), 5=보통 (야간배치), 10=최저
attempts        SMALLINT DEFAULT 0
max_attempts    SMALLINT DEFAULT 3
error_message   TEXT NULL
created_at      TIMESTAMPTZ DEFAULT now()
started_at      TIMESTAMPTZ NULL
completed_at    TIMESTAMPTZ NULL
```

> **Job 분리 원칙**: 사전 계산 시 9개 조합이면 9개 별도 Job으로 INSERT. Vercel Background Functions 5분 제한 대비. 1 Job = 1 query_key = 약 15~30초.

> **Job 정리**: pg_cron으로 매일 04:00에 `DELETE FROM discover_jobs WHERE status IN ('completed', 'failed') AND completed_at < now() - interval '7 days'` 실행.

### 8-2. Job 실행 흐름

```
① 트리거 (record 저장 / 페이지 진입 / 야간 배치 / 사전 리서치 설정 기반 스케줄)
   → discover_preferences 조회 (auto/manual 모드에 따라 조합 결정)
   → discover_jobs INSERT (status='pending')

② Worker (Vercel Background Function)
   → pending job 가져오기 (priority ASC, created_at ASC)
   → status = 'processing'
   → 1차 검색 + LLM 교차 검증 + 2차 DNA 개인화
   → discover_cache UPSERT
   → status = 'completed'

③ 실패 시
   → attempts++
   → attempts < max_attempts → status = 'pending' (재시도)
   → attempts >= max_attempts → status = 'failed'

④ 클라이언트
   → 발견 페이지 진입 시 discover_cache 조회
   → status = 'ready' → 즉시 표시
   → status = 'computing' → 스켈레톤 + SWR 폴링 (3초)
   → status = 'expired' → 기존 결과 표시 + 백그라운드 갱신 트리거
```

### 8-3. 파생 작업 (Cascade Precompute)

하나의 검색 결과에서 **관련 검색을 자동으로 파생**:

```
사용자가 "성수 데이트" 검색
  → 결과에 이탈리안 식당이 3개 포함
  → 파생: "성수 이탈리안" 사전 계산 자동 트리거

사용자가 기록 저장 (장르: japanese, 지역: 강남)
  → 파생: "강남 일식 혼밥", "강남 일식 데이트" 사전 계산

파생 규칙:
  ① 검색 결과 상위 3개의 장르 → 해당 장르로 세분화 검색
  ② 신규 기록의 (지역, 장르) → 상위 3개 상황 조합으로 검색
  ③ 파생 job의 priority = 7 (원본보다 낮음, 야간배치보다 높음)
```

---

## 9. API 설계

### 9-1. 발견 페이지 메인

#### GET /api/discover

발견 페이지 진입 시 호출. 캐시된 사전 계산 결과를 반환.

```
Query: ?area=성수&scene=데이트&genre=japanese (선택적 필터)
Auth: 필수

Response:
{
  "success": true,
  "source": "cache" | "realtime",     // 캐시 히트 여부
  "computedAt": "2026-03-18T02:00:00Z",
  "results": [
    {
      "rank": 1,
      "restaurant": {
        "name": "을지로 냉면집",
        "address": "서울 중구 을지로...",
        "genre": "korean",
        "kakakoId": "12345",
        "photo": "https://..."        // 카카오 or 내부 record_photos
      },
      "scores": {
        "overall": 87,
        "taste": 92,                   // DNA 매칭 점수
        "quality": 85,
        "novelty": 80
      },
      "reason": "감칠맛 강한 국물 좋아하시잖아요. 여기 딱이에요",
      "highlights": ["혼밥 좌석", "런치 1.2만원"],
      "internalRecordCount": 3,        // 내부 사용자 기록 수
      "hasVisited": false              // 이 사용자가 방문한 적 있는지
    }
  ],
  "filters": {                         // 현재 적용된 필터 (UI 표시용)
    "area": "성수",
    "scene": "데이트",
    "genre": null
  },
  "suggestions": ["성수 이탈리안", "성수 와인바"],  // 연관 검색어
  "cacheStatus": "ready" | "computing" | "expired"
}
```

### 9-2. 자연어 검색

#### POST /api/discover/search

필터가 아닌 자연어 입력 시 호출.

```
Input: {
  query: "강남에서 혼밥하기 좋은 일식집, 비싸지 않은 곳",
  location?: { lat, lng }              // 현재 위치 (선택)
}

Flow:
  ① LLM으로 쿼리 구조화
  ② discover_cache에서 매칭 조합 검색
  ③ 캐시 히트 → DNA 재정렬 후 반환
  ④ 캐시 미스 → 실시간 처리 + 결과 캐싱 + 파생 작업 트리거

Response: GET /api/discover와 동일 형식
```

### 9-3. 사전 계산 트리거

#### POST /api/discover/precompute

기록 저장 후 post-process에서 자동 호출. 또는 야간 배치에서 호출.

```
Input: {
  userId: UUID,
  trigger: "new_record" | "page_visit" | "batch" | "cold_start",
  seedData?: {                         // cold_start 시
    genres: ["japanese", "korean"],
    areas: ["강남", "성수"],
    scenes: ["혼밥", "데이트"]
  }
}

Flow:
  ① Style DNA에서 상위 조합 추출 (또는 seedData 사용)
  ② discover_jobs INSERT (조합 수만큼)
  ③ Worker가 비동기 처리

Response: { success: true, jobCount: 9 }
```

### 9-4. 내 주변 실시간 검색

#### GET /api/discover/nearby

GPS 기반 실시간 검색. **사전 계산 불가** (위치가 매번 다름) → 항상 실시간 처리.

```
Query: ?lat=37.5445&lng=127.0567&radius=500&scene=혼밥&genre=japanese
Auth: 필수

Flow:
  ① 카카오 nearby API로 반경 내 식당 검색
  ② 내부 DB에서 해당 식당 records 조회 (있으면)
  ③ LLM 교차 검증 스킵 (속도 우선) — 카카오 + 내부 DB만
  ④ DNA 개인화 적용 (가벼운 점수 재정렬, LLM 호출 없이)
  ⑤ 추천 이유는 템플릿 기반 (LLM 미호출)
     → "여기서 200m, 감칠맛 선호에 맞는 곳이에요"

Response: GET /api/discover와 동일 형식 + distance 필드 추가
  results[].distance: 150  // 미터 단위
```

> **성능 목표**: 1.5초 이내 (LLM 호출 없이). 네이버 블로그 검색도 스킵.
> **사전 계산 연계**: nearby 결과에서 자주 등장하는 지역 → 해당 area의 사전 계산 트리거.

---

### 9-5. 추천 피드백

#### POST /api/discover/feedback

추천 결과에 대한 사용자 피드백. DNA 개인화 가중치 보정에 사용.

```
Input: {
  discoverResultId: UUID,              // discover_cache 내 결과 항목 ID
  restaurantName: string,
  feedback: "good" | "bad",            // 👍 / 👎
  reason?: string                      // "너무 비쌌어요" (선택)
}

Flow:
  ① discover_feedback INSERT
  ② feedback = "bad" → 해당 식당의 개인화 가중치 하향
     → discover_cache 갱신 시 반영
  ③ 동일 식당에 bad 3회+ → 해당 사용자 추천에서 제외

Output: { success: true }
```

#### discover_feedback 테이블

```sql
id              UUID PK DEFAULT gen_random_uuid()
user_id         UUID FK → auth.users ON DELETE CASCADE NOT NULL
restaurant_name VARCHAR NOT NULL
kakao_id        VARCHAR NULL
feedback        VARCHAR NOT NULL CHECK (feedback IN ('good', 'bad'))
reason          TEXT NULL
query_context   JSONB NULL             -- 어떤 검색에서 추천됐는지 {area, scene, genre}
created_at      TIMESTAMPTZ DEFAULT now()
```

> **개인화 반영**: bad 피드백이 쌓인 식당의 맛 프로필 → 사용자 DNA와의 "반-선호" 신호로 처리. 해당 식당뿐 아니라 유사한 맛 프로필의 식당도 약하게 감점.

---

### 9-6. 와인 발견

#### GET /api/discover/wine

와인 전용 발견. 식당과 로직은 동일하되 검색 소스와 필터가 다름.

```
Query: ?type=red&region=부르고뉴&priceRange=50k_100k&scene=데이트

검색 소스:
  ① 내부 records (record_type='wine') + record_ai_analyses.wine_info
  ② 와인 관련 블로그 검색 (네이버)
  ③ (Phase 2+) 외부 와인 DB API 연동

DNA 매칭:
  taste_dna_wine (7축 WSET) + style_dna_wine_* (품종/산지/타입/상황)

Response: GET /api/discover와 동일 형식 (restaurant → wine 치환)
```

---

### 9-7. Rate Limiting

```
Discover API는 LLM 호출을 트리거하므로 비용 보호가 필수.

사용자당 제한:
  /api/discover          → 분당 10회, 일 100회
  /api/discover/search   → 분당 5회, 일 50회 (LLM 호출 더 많으므로 엄격)
  /api/discover/nearby   → 분당 10회, 일 200회 (LLM 미호출이므로 여유)
  /api/discover/feedback → 분당 20회, 일 500회

구현: Vercel Edge Middleware + Upstash Redis (sliding window)
초과 시: 429 Too Many Requests + Retry-After 헤더

비인증 요청: 차단 (모든 Discover API는 Auth 필수)
```

---

## 10. 비용 관리

### 10-1. API 호출 비용

```
1건의 사전 계산:
  카카오 API:  1~2회     → 무료 (일 30만건)
  네이버 API:  1~2회     → 무료 (일 25,000건)
  LLM 호출:   2~3회     → 약 $0.01~0.03 (Gemini Flash)
    ① 쿼리 구조화
    ② 교차 검증 + 랭킹
    ③ 추천 이유 생성

사용자당 사전 계산:
  9 조합 × $0.02 = 약 $0.18/일

5만 유저 (활성 30% = 15,000명):
  15,000 × $0.18 = $2,700/일 = $81,000/월 ← 비쌈!
```

### 10-2. 비용 최적화

```
① 공유 캐시 (같은 area×scene 조합은 1번만 계산)
  "강남 혼밥" → 1차 후보는 모든 사용자 공통 (장르는 후필터)
  → 2차 DNA 개인화만 사용자별 처리
  → LLM 호출 3회 → 1회 (교차 검증) + 사용자별 0.5회 (추천 이유)

  공유 캐시 적용 시:
  고유 조합 수 ≈ 400개 (주요 지역 50 × 상황 8)
  장르는 1차 후보에서 후필터 → 별도 조합 불필요
  400 × $0.02 = $8/일 (1차)
  15,000 × $0.005 = $75/일 (2차 개인화)
  총: $83/일 = $2,490/월 ← 97% 절감

② 활성도 기반 계산 빈도
  매일 접속: 매일 갱신
  주 2~3회: 접속일만 갱신
  비활성 (7일+): 갱신 중단

③ DNA 변화량 기반 재계산
  새 기록 저장 → DNA 변화량 체크
  변화 < 5% → personalized만 재정렬 (LLM 호출 없이 점수 재계산)
  변화 ≥ 5% → 전체 재계산

최종 예상:
  $800~1,500/월 (5만 유저, 활성 30%)
```

### 10-3. 공유 캐시 구조

#### discover_shared_cache 테이블

```sql
id              UUID PK DEFAULT gen_random_uuid()
query_key       VARCHAR UNIQUE NOT NULL  -- "강남_혼밥" (area_scene 조합, 장르 미포함 — 후필터)
area            VARCHAR NOT NULL
scene           VARCHAR NOT NULL
-- 1차 교차 검증 결과 (사용자 무관, 공통)
candidates      JSONB NOT NULL           -- 후보 10~15개 (DNA 미적용)
source_versions JSONB NULL
computed_at     TIMESTAMPTZ DEFAULT now()
expires_at      TIMESTAMPTZ NOT NULL     -- computed_at + 24시간
hit_count       INTEGER DEFAULT 0        -- 조회 횟수 (인기도 추적)
```

```
흐름:
  사용자 요청 "강남 혼밥"
    → discover_shared_cache에서 1차 후보 조회 (공통)
    → 사용자별 DNA로 2차 개인화 (가벼움, LLM 불필요 가능)
    → discover_cache에 개인화 결과 저장
```

---

## 11. 푸시 알림 연동

```
① 콜드 스타트 완료
   → "맞춤 추천이 준비됐어요! 확인해보세요"

② 새 기록 기반 추천 갱신
   → "새 기록을 반영한 추천이 업데이트됐어요"
   → (하루 1회 이하, 스팸 방지)

③ 시간대 맞춤 추천
   → 점심 11:30: "오늘 점심 뭐 드세요? 추천 준비했어요"
   → 저녁 17:30: "저녁 약속 있으세요? 맞춤 추천이에요"
   → (사용자가 알림 설정에서 on/off)
```

---

## 12. 데이터 모델 요약

### 신규 테이블

| 테이블 | 역할 | 크기 (5만 유저 기준) |
|--------|------|---------------------|
| `discover_preferences` | 사전 리서치 설정 (자동/수동) | ~5만행 (사용자당 1행) |
| `discover_shared_cache` | 공통 1차 후보 캐시 | ~400행 (area×scene 조합) |
| `discover_cache` | 사용자별 개인화 결과 | ~45만행 (사용자 × 9조합) |
| `discover_jobs` | 백그라운드 Job Queue | 롤링 (완료 건 7일 후 삭제) |
| `discover_feedback` | 추천 피드백 (good/bad) | 사용자 행동에 비례 |

### FK Cascade 정책

| 자식 테이블 | FK 컬럼 | 삭제 정책 |
|------------|---------|-----------|
| discover_preferences | user_id (→ auth.users) | CASCADE |
| discover_cache | user_id (→ auth.users) | CASCADE |
| discover_jobs | user_id (→ auth.users) | CASCADE |
| discover_feedback | user_id (→ auth.users) | CASCADE |
| discover_shared_cache | — (FK 없음) | 만료 시 배치 삭제 |

### 기존 테이블 의존성

```
discover_preferences
  └─ user_id FK → auth.users ON DELETE CASCADE

discover_cache
  ├─ user_id FK → auth.users ON DELETE CASCADE
  ├─ shared_cache_key → discover_shared_cache.query_key (논리적 참조)
  └─ 참조: taste_dna_*, style_dna_* (개인화 시)

discover_shared_cache
  └─ 참조: restaurants, records, record_taste_profiles (1차 후보 생성 시)

discover_jobs
  └─ user_id FK → auth.users ON DELETE CASCADE

discover_feedback
  └─ user_id FK → auth.users ON DELETE CASCADE
```

---

## 13. 구현 우선순위

### Phase 1 (MVP)

```
① GET /api/discover — 필터 기반 검색 (캐시 없이, 실시간)
  → 카카오 + 내부 DB만 (네이버 블로그 크롤링은 후순위)
  → DNA 개인화 적용 (있으면)
  → 추천 이유 1줄 (템플릿 기반)

② GET /api/discover/nearby — 내 주변 실시간 검색
  → 카카오 + 내부 DB, LLM 미호출 (속도 우선)

③ 콜드 스타트 필터 UI
  → 장르/지역/상황 선택 → 결과 표시
  → "분석 중..." 로딩 (실시간 5~7초 허용)

④ POST /api/discover/feedback — 추천 피드백 (👍/👎)
```

### Phase 2

```
⑤ discover_shared_cache + discover_cache 도입
  → 사전 계산으로 즉시 응답

⑥ /discover/settings — 사전 리서치 설정 페이지 (자동/수동)
  → discover_preferences 테이블
  → 자동 모드 패턴 분석 로직

⑦ POST /api/discover/search — 자연어 검색

⑧ 네이버 블로그 교차 검증 추가

⑨ 파생 작업 (cascade precompute)

⑩ Rate Limiting (Upstash Redis)
```

### Phase 3

```
⑪ 푸시 알림 연동 (시간대 맞춤 추천)
⑫ 와인 발견 (/api/discover/wine)
⑬ 요리 발견 검토 (외부 레시피 API 연동 or 내부 요리 기록 기반)
⑭ 야간 배치 최적화 + 비용 모니터링 대시보드
```

> **요리 발견**: 식당/와인과 달리 외부 검색 소스가 제한적 (레시피 DB 없음). Phase 3에서 (1) 내부 공개 요리 기록 탐색 + (2) 만개의레시피 등 외부 API 연동 가능성을 검토한다. MVP에서는 요리 발견 미지원.

---

## 14. 성공 지표

| 지표 | 목표 | 측정 방법 |
|------|------|----------|
| 검색→기록 전환율 | > 15% | 발견에서 찾은 식당에 실제 기록 생성 |
| 평균 응답 시간 | < 1초 (캐시 히트), < 1.5초 (nearby) | API 응답 시간 모니터링 |
| 추천 만족도 | 👍 비율 > 70% | discover_feedback good/(good+bad) |
| 콜드 스타트 이탈률 | < 30% | 필터 선택 후 결과 보기 전 이탈 |
| DAU 중 발견 사용률 | > 40% | 발견 페이지 진입 / DAU |
| 비용 효율 | < $0.01/검색 | LLM 비용 / 총 검색 수 |
