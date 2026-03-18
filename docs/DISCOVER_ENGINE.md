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
Input:  "강남에서 혼밥하기 좋은 일식집, 근데 너무 비싸지 않은 곳"
Output: {
  area: "강남",
  scene: "혼밥",
  genre: "japanese",
  priceRange: "mid",        // 추론
  keywords: ["일식", "혼밥", "강남"],
  negativeKeywords: ["고급", "오마카세"]  // "비싸지 않은" → 제외 조건 추론
}
```

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
function finalScore(candidate, user): {score: number, reason: string} {
  const taste   = tasteSimilarity(user.tasteDna, candidate.tasteProfile) * 0.35
  const style   = styleMatch(user.styleDna, candidate, query.scene) * 0.25
  const quality = candidate.internalRating ?? candidate.confidence * 70   * 0.25
  const novelty = isNewForUser(user, candidate) ? 10 : 0                  * 0.15

  return {
    score: taste + style + quality + novelty,
    reason: generateReason(user, candidate, dominantFactor)
  }
}
```

**추천 이유 생성 (LLM)**:

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

사용자의 **Style DNA에서 추출한 핵심 축** 기반으로 미리 검색해둔다:

```
사전 계산 트리거 조건:
  ① 신규 기록 저장 시 (post-process 완료 후)
  ② 하루 1회 야간 배치 (02:00~05:00)
  ③ 발견 페이지 첫 진입 시 (캐시 미스)

추출 기준:
  style_dna_restaurant_areas  → 상위 3개 지역
  style_dna_restaurant_scenes → 상위 3개 상황
  style_dna_restaurant_genres → 상위 3개 장르

조합 생성:
  3 지역 × 3 상황 = 9개 쿼리 (장르는 필터로 적용)

예시 (사용자 A):
  areas:  [성수, 강남, 을지로]
  scenes: [혼밥, 데이트, 친구모임]

  → "성수 혼밥", "성수 데이트", "성수 친구모임"
  → "강남 혼밥", "강남 데이트", "강남 친구모임"
  → "을지로 혼밥", "을지로 데이트", "을지로 친구모임"
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
candidates      JSONB NOT NULL         -- 1차 교차 검증 완료된 후보 10~15개
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

## 6. 콜드 스타트 전략

### 6-1. 기록 0건 — 완전 신규 사용자

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

④ 백그라운드 사전 계산 시작
   → 선택한 필터 조합으로 즉시 사전 계산 트리거
   → 앱을 닫아도 서버에서 계속 진행
   → 완료 시 push 알림: "맞춤 추천이 준비됐어요!"
```

### 6-2. 기록 1~4건 — 초기 사용자

```
DNA가 불안정한 상태 → DNA 가중치를 낮추고 일반 품질 가중치를 높임

finalScore 가중치 조정:
  records < 5:  taste 0.10, style 0.10, quality 0.60, novelty 0.20
  records 5~19: taste 0.20, style 0.20, quality 0.40, novelty 0.20
  records 20+:  taste 0.35, style 0.25, quality 0.25, novelty 0.15  ← 정상

추천 이유도 달라짐:
  "이 지역 평점 최상위 식당이에요" (품질 기반)
  vs
  "매운맛 좋아하시잖아요. 여기 딱이에요" (DNA 기반, 20건 이후)
```

### 6-3. 기록 있지만 발견 페이지 첫 진입

```
① 기존 기록에서 seed 데이터 추출
   → 가장 많이 간 지역 + 가장 많이 먹은 장르 + 최근 상황

② 이를 기반으로 즉시 사전 계산 트리거 (3~5개 조합)
   → 로딩 UI 표시: 스켈레톤 카드 + "취향 분석 중..."

③ 첫 조합 결과가 나오는 대로 즉시 표시 (progressive loading)
   → 나머지 조합은 백그라운드에서 계속 진행
```

---

## 7. 백그라운드 처리

### 7-1. 서버 사이드 Job Queue

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
user_id         UUID FK → auth.users NOT NULL
job_type        VARCHAR NOT NULL CHECK (job_type IN ('precompute', 'refresh', 'cold_start'))
query_key       VARCHAR NULL           -- "성수_혼밥" (precompute/refresh 시)
status          VARCHAR DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed'))
priority        SMALLINT DEFAULT 5     -- 1=최고 (콜드스타트), 5=보통 (야간배치), 10=최저
attempts        SMALLINT DEFAULT 0
max_attempts    SMALLINT DEFAULT 3
error_message   TEXT NULL
created_at      TIMESTAMPTZ DEFAULT now()
started_at      TIMESTAMPTZ NULL
completed_at    TIMESTAMPTZ NULL
```

### 7-2. Job 실행 흐름

```
① 트리거 (record 저장 / 페이지 진입 / 야간 배치)
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

### 7-3. 파생 작업 (Cascade Precompute)

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

## 8. API 설계

### 8-1. 발견 페이지 메인

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

### 8-2. 자연어 검색

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

### 8-3. 사전 계산 트리거

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

### 8-4. 와인 발견

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

## 9. 비용 관리

### 9-1. API 호출 비용

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

### 9-2. 비용 최적화

```
① 공유 캐시 (같은 조합은 1번만 계산)
  "강남 혼밥 일식" → 1차 후보는 모든 사용자 공통
  → 2차 DNA 개인화만 사용자별 처리
  → LLM 호출 3회 → 1회 (교차 검증) + 사용자별 0.5회 (추천 이유)

  공유 캐시 적용 시:
  고유 조합 수 ≈ 500개 (지역 50 × 상황 8 × 장르 2)
  500 × $0.02 = $10/일 (1차)
  15,000 × $0.005 = $75/일 (2차 개인화)
  총: $85/일 = $2,550/월 ← 96% 절감

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

### 9-3. 공유 캐시 구조

#### discover_shared_cache 테이블

```sql
id              UUID PK DEFAULT gen_random_uuid()
query_key       VARCHAR UNIQUE NOT NULL  -- "강남_혼밥_japanese"
area            VARCHAR NULL
scene           VARCHAR NULL
genre           VARCHAR NULL
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

## 10. 푸시 알림 연동

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

## 11. 데이터 모델 요약

### 신규 테이블

| 테이블 | 역할 | 크기 (5만 유저 기준) |
|--------|------|---------------------|
| `discover_shared_cache` | 공통 1차 후보 캐시 | ~500행 (조합 수) |
| `discover_cache` | 사용자별 개인화 결과 | ~45만행 (사용자 × 9조합) |
| `discover_jobs` | 백그라운드 Job Queue | 롤링 (완료 건 7일 후 삭제) |

### 기존 테이블 의존성

```
discover_cache
  ├─ user_id FK → auth.users
  └─ 참조: taste_dna_*, style_dna_* (개인화 시)

discover_shared_cache
  └─ 참조: restaurants, records, record_taste_profiles (1차 후보 생성 시)

discover_jobs
  └─ user_id FK → auth.users
```

---

## 12. 구현 우선순위

### Phase 1 (MVP)

```
① GET /api/discover — 필터 기반 검색 (캐시 없이, 실시간)
  → 카카오 + 내부 DB만 (네이버 블로그 크롤링은 후순위)
  → DNA 개인화 적용 (있으면)
  → 추천 이유 1줄

② 콜드 스타트 필터 UI
  → 장르/지역/상황 선택 → 결과 표시
  → "분석 중..." 로딩 (실시간 5~7초 허용)
```

### Phase 2

```
③ discover_shared_cache + discover_cache 도입
  → 사전 계산으로 즉시 응답

④ POST /api/discover/search — 자연어 검색

⑤ 네이버 블로그 교차 검증 추가

⑥ 파생 작업 (cascade precompute)
```

### Phase 3

```
⑦ 푸시 알림 연동 (시간대 맞춤 추천)
⑧ 와인 발견 (/api/discover/wine)
⑨ 야간 배치 최적화 + 비용 모니터링 대시보드
```

---

## 13. 성공 지표

| 지표 | 목표 | 측정 방법 |
|------|------|----------|
| 검색→기록 전환율 | > 15% | 발견에서 찾은 식당에 실제 기록 생성 |
| 평균 응답 시간 | < 1초 (캐시 히트) | API 응답 시간 모니터링 |
| 추천 만족도 | > 4.0/5.0 | 추천 결과에 별점/피드백 |
| 콜드 스타트 이탈률 | < 30% | 필터 선택 후 결과 보기 전 이탈 |
| DAU 중 발견 사용률 | > 40% | 발견 페이지 진입 / DAU |
