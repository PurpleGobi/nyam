# nyam 3-Phase Record System Architecture

> 전체 아키텍처 설계 및 세부 구현 계획

---

## 1. 설계 철학

**핵심 원칙**: 사용자 입력 최소화, AI 자동화 최대화

| 원칙 | 설명 |
|------|------|
| 10초 규칙 | Phase 1은 식당에서 10초 안에 완료 |
| AI-First | 사진 + 위치만으로 AI가 80% 자동완성 |
| 점진적 완성 | Phase 1만으로도 유효한 기록, 2/3는 선택 |
| 경험치 보상 | 각 Phase 완료가 별도 XP로 기여 |

---

## 2. Phase 개요

### Phase 1: 빠른 캡처 (10초)
```
앱 열기 → + 버튼 → 사진 촬영 → AI 분석 → 확인 + 별점 → 저장
```

### Phase 2: AI 블로그 리뷰 (알림 유도, 2-5분)
```
알림 수신 → AI 정리 자료 확인 → 추가 질문 답변 → AI 잡지 글 생성 → 공유
```

### Phase 3: 맛집 이상형 월드컵 (한가할 때, 3분)
```
비교 시작 → 2개씩 비교 선택 → 토너먼트 진행 → 순위 결정 → 점수 스케일링
```

---

## 3. Phase 1 상세 설계

### 3.1 UX Flow

```
┌─────────────────────────────────────────────────┐
│  [+] 탭                                          │
│   ↓                                              │
│  📸 사진 촬영 화면                                 │
│   ┌──────┬──────┬──────┬──────┐                  │
│   │ 간판  │ 메뉴판│ 동반자│ 영수증│  ← 4종 가이드   │
│   └──────┴──────┴──────┴──────┘    (모두 선택)    │
│   ↓                                              │
│  🤖 "AI 분석 중..." (1-3초)                       │
│   ↓                                              │
│  ┌─────────────────────────────┐                 │
│  │ 🏪 맛있는 김치찌개           │  ← AI 자동완성   │
│  │ 📍 서울 강남구 역삼동         │                  │
│  │ 🍽️ 김치찌개, 계란말이        │                  │
│  │ 💰 9,000원/인               │                  │
│  │ ⭐ ____★____ (별점 탭)      │  ← 유저 입력     │
│  │ 💬 ________________ (한줄평) │  ← 유저 입력     │
│  └─────────────────────────────┘                 │
│   ↓                                              │
│  [저장] → 🎉 완료! (+5 XP)                       │
└─────────────────────────────────────────────────┘
```

### 3.2 Technical Flow

```
[Browser Geolocation API]
        ↓
[Kakao Local API: 반경 500m 식당 목록] ──캐싱(5분)──→ nearbyPlaces[]
        ↓
[Camera API: 사진 촬영] → photos[] (최대 4장)
        ↓
[Client: 이미지 리사이즈 (max 1024px)] → base64[]
        ↓
[POST /api/analyze-visit]
  Request: { photos: base64[], location: {lat, lng}, nearbyPlaces: [] }
        ↓
[Gemini 2.0 Flash: 단일 호출로 전체 분석]
  - 사진 종류 분류 (signboard/menu/companion/receipt/food)
  - 간판 텍스트 → 근처 식당 목록과 매칭
  - 메뉴판 OCR → 메뉴 + 가격 추출
  - 영수증 OCR → 총액 / 1인당 비용
  - 동반자 사진 → 인원수 추정
  - 음식 사진 → 주문 메뉴 추정, 카테고리, 맛 태그
        ↓
[AI Result Card: 자동완성 결과 표시]
        ↓
[User: 별점(1-5) + 한줄평(선택)]
        ↓
[Save Record + Upload Photos]
        ↓
[Async Post-Process: Taste DNA, XP, Experience Atlas]
```

### 3.3 AI 프롬프트 설계

```
POST /api/analyze-visit

Gemini에 전송할 프롬프트:

"당신은 맛집 방문 기록 분석 AI입니다.
사용자가 맛집에서 찍은 사진들과 위치 정보를 분석하세요.

## 현재 위치
위도: {lat}, 경도: {lng}

## 근처 식당 목록
{nearbyPlaces를 JSON으로}

## 첨부 사진
{N}장의 사진이 첨부되어 있습니다.

## 분석 요청
다음 JSON 형식으로 응답하세요:

{
  "photos": [
    {"index": 0, "type": "signboard|menu|companion|receipt|food|other", "description": "..."}
  ],
  "restaurant": {
    "name": "식당명",
    "matchedPlaceId": "근처 목록에서 매칭된 ID 또는 null",
    "confidence": 0.0-1.0
  },
  "menuBoard": [
    {"name": "메뉴명", "price": 9000}
  ],
  "orderedItems": ["김치찌개", "계란말이"],
  "receipt": {
    "totalCost": 27000,
    "perPersonCost": 9000,
    "itemCount": 3
  },
  "companions": {
    "count": 3,
    "occasion": "친구모임|데이트|가족|비즈니스|혼밥|null"
  },
  "category": "korean|japanese|chinese|western|cafe|dessert|wine|seafood|meat|vegan|street",
  "flavorTags": ["매운", "감칠맛"],
  "textureTags": ["부드러운"],
  "estimatedVisitHour": 12
}

없는 정보는 null로 표시하세요. 추정이 불확실하면 confidence를 낮게 설정하세요."
```

### 3.4 Fallback 전략

| 상황 | Fallback |
|------|----------|
| 위치 권한 거부 | 수동 주소 검색 → Kakao 식당 목록 |
| 간판 인식 실패 | 근처 식당 목록에서 수동 선택 |
| AI 분석 실패 | 기존 수동 입력 폼 (simplified) |
| 사진 0장 | 식당 검색 + 수동 입력 (현재 flow 축소판) |

---

## 4. Phase 2 상세 설계

### 4.1 트리거

- Phase 1 완료 후 2-24시간 뒤 인앱 배너
- 프로필 > 기록 타임라인에서 "완성하기" 버튼
- 홈 화면 "미완성 기록 {N}개" 카드

### 4.2 UX Flow

```
┌─────────────────────────────────────────┐
│ 📋 AI가 정리한 방문 요약                  │
│ ┌─────────────────────────────────┐     │
│ │ 🏪 맛있는 김치찌개               │     │
│ │ 📍 서울 강남구 · 2026.3.16      │     │
│ │ 🍽️ 김치찌개 9,000 · 계란말이     │     │
│ │ 💰 총 27,000원 (3명)            │     │
│ │ ⭐ 4.0                          │     │
│ └─────────────────────────────────┘     │
│                                         │
│ 💬 AI 질문 카드 (스와이프)               │
│ ┌─────────────────────────────────┐     │
│ │ Q1. 가장 맛있었던 메뉴는?        │     │
│ │ [김치찌개] [계란말이] [직접입력]   │     │
│ └─────────────────────────────────┘     │
│ ┌─────────────────────────────────┐     │
│ │ Q2. 이 곳의 분위기를 한마디로?    │     │
│ │ [아늑한] [활기찬] [캐주얼] [직접] │     │
│ └─────────────────────────────────┘     │
│ ┌─────────────────────────────────┐     │
│ │ Q3. 다시 방문하고 싶으세요?       │     │
│ │ [꼭!] [기회되면] [글쎄...]        │     │
│ └─────────────────────────────────┘     │
│                                         │
│ [AI 리뷰 생성하기] → 🤖 생성 중...      │
│                                         │
│ 📖 블로그 프리뷰 (잡지 스타일)           │
│ ┌─────────────────────────────────┐     │
│ │ # 강남의 숨은 김치찌개 맛집       │     │
│ │                                 │     │
│ │ [사진1: 간판]                    │     │
│ │                                 │     │
│ │ 점심시간, 친구 셋이서 찾은        │     │
│ │ 이 작은 식당은...                │     │
│ │                                 │     │
│ │ [사진2: 음식]                    │     │
│ │                                 │     │
│ │ 시그니처 김치찌개는 얼큰하면서도   │     │
│ │ 깊은 감칠맛이 인상적이었다...      │     │
│ │                                 │     │
│ │ ⭐ 총평: 4.0/5.0               │     │
│ │ 💡 추천: 친구모임, 점심           │     │
│ └─────────────────────────────────┘     │
│                                         │
│ [수정] [공유하기] [저장] (+15 XP)        │
└─────────────────────────────────────────┘
```

### 4.3 AI Blog Generator

```
POST /api/generate-review

Input:
{
  record: { ... Phase 1 데이터 },
  analysis: { ... AI 분석 결과 },
  photos: [ ... 사진 URL + 타입 ],
  answers: { bestMenu: "김치찌개", atmosphere: "아늑한", revisit: "꼭!" }
}

Gemini 프롬프트:
"다음 맛집 방문 데이터를 바탕으로 잡지 스타일의 리뷰 글을 작성하세요.

## 데이터
{record + analysis + answers}

## 작성 규칙
1. 제목 + 부제목
2. 3-5개 문단, 각 문단 2-3문장
3. 사진 배치 위치를 [PHOTO:index] 태그로 표시
4. 자연스럽고 친근한 문체 (반말 OK)
5. 마지막에 한줄 총평 + 추천 대상

JSON 형식:
{
  "title": "...",
  "subtitle": "...",
  "sections": [
    {"type": "text", "content": "..."},
    {"type": "photo", "photoIndex": 0, "caption": "..."},
    {"type": "text", "content": "..."},
    ...
  ],
  "summary": "...",
  "recommendFor": ["친구모임", "점심"]
}"
```

---

## 5. Phase 3 상세 설계

### 5.1 트리거 조건

- 동일 카테고리 기록 4개 이상
- 유사 식당 방문 시 (같은 동네 + 같은 카테고리)
- 프로필에서 "맛집 월드컵" 직접 시작

### 5.2 UX Flow

```
┌─────────────────────────────────────────┐
│ 🏆 한식 맛집 월드컵!                     │
│    8강 시작                              │
│                                         │
│ ┌──────────┐  VS  ┌──────────┐          │
│ │ [사진]    │      │ [사진]    │          │
│ │ 맛있는    │      │ 엄마손   │          │
│ │ 김치찌개  │      │ 순두부   │          │
│ │ ⭐ 4.0   │      │ ⭐ 4.2  │          │
│ │ 💰9,000  │      │ 💰8,000 │          │
│ └──────────┘      └──────────┘          │
│                                         │
│ "맛은 어디가 더 좋았나요?"                │
│                                         │
│ [← 왼쪽]              [오른쪽 →]         │
│                                         │
│ ━━━━●━━━━━━━ 2/7 매치                   │
└─────────────────────────────────────────┘

        ↓ (모든 매치 완료)

┌─────────────────────────────────────────┐
│ 🏆 결과                                 │
│                                         │
│ 1위 🥇 맛있는 김치찌개  (종합 승률 75%)   │
│ 2위 🥈 엄마손 순두부    (종합 승률 62%)   │
│ 3위 🥉 한옥집 된장      (종합 승률 50%)   │
│ 4위    동네 백반         (종합 승률 25%)   │
│                                         │
│ 📊 부문별 1위:                           │
│   맛: 맛있는 김치찌개                     │
│   분위기: 한옥집 된장                     │
│   가성비: 동네 백반                       │
│                                         │
│ [공유하기] [다시하기] (+5 XP)             │
└─────────────────────────────────────────┘
```

### 5.3 점수 스케일링 알고리즘

```typescript
// Elo-style rating adjustment
function adjustRating(winner: Record, loser: Record, aspect: string) {
  const K = 16 // adjustment factor
  const expectedWin = 1 / (1 + Math.pow(10, (loser.scaledRating - winner.scaledRating) / 400))

  winner.scaledRating += K * (1 - expectedWin)
  loser.scaledRating += K * (0 - (1 - expectedWin))

  winner.comparisonCount++
  loser.comparisonCount++
}
```

---

## 6. DB 스키마 변경

### 6.1 기존 테이블 수정

```sql
-- records 테이블 확장
ALTER TABLE records ADD COLUMN phase_status SMALLINT DEFAULT 1;
ALTER TABLE records ADD COLUMN phase1_completed_at TIMESTAMPTZ;
ALTER TABLE records ADD COLUMN phase2_completed_at TIMESTAMPTZ;
ALTER TABLE records ADD COLUMN phase3_completed_at TIMESTAMPTZ;
ALTER TABLE records ADD COLUMN scaled_rating NUMERIC;
ALTER TABLE records ADD COLUMN comparison_count INT DEFAULT 0;
ALTER TABLE records ADD COLUMN visit_time TIMESTAMPTZ;
ALTER TABLE records ADD COLUMN companion_count SMALLINT;
ALTER TABLE records ADD COLUMN total_cost INT;
ALTER TABLE records ADD COLUMN ai_analysis_id UUID;

ALTER TABLE records ADD CONSTRAINT records_phase_status_check
  CHECK (phase_status BETWEEN 1 AND 3);

-- 기존 레코드 마이그레이션
UPDATE records SET phase_status = 1, phase1_completed_at = created_at;

-- record_photos 확장
ALTER TABLE record_photos ADD COLUMN photo_type VARCHAR(20) DEFAULT 'food';
ALTER TABLE record_photos ADD COLUMN ai_description TEXT;

ALTER TABLE record_photos ADD CONSTRAINT record_photos_type_check
  CHECK (photo_type IN ('signboard', 'menu', 'companion', 'receipt', 'food', 'other'));

-- record_journals 확장 (Phase 2 블로그)
ALTER TABLE record_journals ADD COLUMN blog_title VARCHAR(200);
ALTER TABLE record_journals ADD COLUMN blog_content TEXT;
ALTER TABLE record_journals ADD COLUMN blog_sections JSONB;
ALTER TABLE record_journals ADD COLUMN ai_questions JSONB;
ALTER TABLE record_journals ADD COLUMN user_answers JSONB;
ALTER TABLE record_journals ADD COLUMN published BOOLEAN DEFAULT false;
ALTER TABLE record_journals ADD COLUMN published_at TIMESTAMPTZ;
```

### 6.2 신규 테이블

```sql
-- AI 분석 결과 저장
CREATE TABLE record_ai_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  record_id UUID NOT NULL REFERENCES records(id) ON DELETE CASCADE,
  raw_response JSONB,
  identified_restaurant JSONB,    -- {name, matchedPlaceId, confidence}
  extracted_menu_items JSONB,     -- [{name, price}]
  ordered_items JSONB,            -- [{name, estimatedPrice}]
  receipt_data JSONB,             -- {totalCost, perPersonCost}
  companion_data JSONB,           -- {count, occasion}
  photo_classifications JSONB,    -- [{photoIndex, type, confidence}]
  estimated_visit_time TIMESTAMPTZ,
  confidence_score NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_analyses_record ON record_ai_analyses(record_id);

-- Phase 3 비교 세션
CREATE TABLE comparisons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  category VARCHAR(50) NOT NULL,
  bracket_size SMALLINT NOT NULL DEFAULT 4,
  status VARCHAR(20) NOT NULL DEFAULT 'in_progress',
  winner_record_id UUID REFERENCES records(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,

  CONSTRAINT comparisons_status_check
    CHECK (status IN ('in_progress', 'completed', 'abandoned')),
  CONSTRAINT comparisons_bracket_check
    CHECK (bracket_size IN (4, 8, 16))
);

CREATE INDEX idx_comparisons_user ON comparisons(user_id);

-- Phase 3 개별 매치업
CREATE TABLE comparison_matchups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comparison_id UUID NOT NULL REFERENCES comparisons(id) ON DELETE CASCADE,
  round SMALLINT NOT NULL,
  aspect VARCHAR(30) NOT NULL,
  record_a_id UUID NOT NULL REFERENCES records(id),
  record_b_id UUID NOT NULL REFERENCES records(id),
  winner_id UUID REFERENCES records(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT matchups_aspect_check
    CHECK (aspect IN ('taste', 'atmosphere', 'value', 'revisit', 'overall'))
);

CREATE INDEX idx_matchups_comparison ON comparison_matchups(comparison_id);

-- Phase 완료 이력 (XP 트래킹)
CREATE TABLE phase_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  record_id UUID REFERENCES records(id),
  phase SMALLINT NOT NULL,
  xp_earned INT NOT NULL,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT phase_completions_phase_check CHECK (phase BETWEEN 1 AND 3)
);

CREATE INDEX idx_phase_completions_user ON phase_completions(user_id);
```

---

## 7. Clean Architecture 파일 구조

### 7.1 변경/신규 파일 전체 목록

```
domain/
├── entities/
│   ├── record.ts                    ← UPDATE: phase 필드 추가
│   ├── record-analysis.ts           ← NEW
│   ├── record-journal.ts            ← UPDATE: blog 필드 추가
│   ├── comparison.ts                ← NEW
│   └── phase-completion.ts          ← NEW
├── repositories/
│   ├── record-repository.ts         ← UPDATE: phase 메서드 추가
│   ├── analysis-repository.ts       ← NEW
│   └── comparison-repository.ts     ← NEW

infrastructure/
├── repositories/
│   ├── supabase-record-repository.ts     ← UPDATE
│   ├── supabase-analysis-repository.ts   ← NEW
│   └── supabase-comparison-repository.ts ← NEW
├── api/
│   ├── visit-analyzer.ts                 ← NEW (food-recognition.ts 대체)
│   ├── kakao-local.ts                    ← UPDATE: 반경 검색 추가
│   └── external-reviews.ts              ← NEW (Sprint 4, 선택)
├── storage/
│   └── image-upload.ts                   ← UPDATE: 리사이즈, photo_type

application/
├── hooks/
│   ├── use-create-record.ts              ← REWRITE: Phase 1 flow
│   ├── use-nearby-restaurants.ts         ← NEW
│   ├── use-visit-analysis.ts             ← NEW
│   ├── use-record-completion.ts          ← NEW (Phase 2)
│   ├── use-comparison.ts                 ← NEW (Phase 3)
│   └── use-phase-xp.ts                  ← NEW

presentation/
├── containers/
│   ├── quick-capture-container.tsx        ← NEW (Phase 1)
│   ├── review-completion-container.tsx    ← NEW (Phase 2)
│   └── comparison-container.tsx           ← NEW (Phase 3)
├── components/
│   ├── capture/                           ← NEW folder
│   │   ├── photo-capture-sheet.tsx        ← 4종 사진 가이드 카메라
│   │   ├── ai-result-card.tsx             ← AI 자동완성 결과
│   │   ├── quick-rating.tsx               ← 별점 + 한줄평
│   │   └── nearby-restaurant-picker.tsx   ← fallback 수동 선택
│   ├── review/                            ← NEW folder
│   │   ├── ai-question-card.tsx           ← 질문 카드 UI
│   │   ├── blog-preview.tsx               ← 잡지 스타일 프리뷰
│   │   └── blog-editor.tsx                ← 편집 기능
│   └── comparison/                        ← NEW folder
│       ├── matchup-card.tsx               ← VS 비교 카드
│       ├── bracket-view.tsx               ← 토너먼트 브래킷
│       └── comparison-result.tsx          ← 최종 순위

app/
├── api/
│   ├── analyze-visit/route.ts             ← NEW
│   ├── generate-review/route.ts           ← NEW
│   └── restaurants/nearby/route.ts        ← NEW
├── record/page.tsx                        ← UPDATE: QuickCaptureContainer
├── records/[id]/complete/page.tsx         ← NEW (Phase 2 진입)
└── comparison/page.tsx                    ← UPDATE: ComparisonContainer

di/
└── repositories.ts                        ← UPDATE: 신규 repo 등록
```

### 7.2 의존성 방향 (Clean Architecture 준수)

```
app → presentation → application → domain ← infrastructure

Phase 1:
  app/record/page.tsx
    → QuickCaptureContainer
      → useCreateRecord (rewritten)
      → useNearbyRestaurants
      → useVisitAnalysis
        → domain/RecordRepository (interface)
        → domain/AnalysisRepository (interface)
          ← infrastructure/supabase-* (구현)
          ← infrastructure/visit-analyzer (AI)

Phase 2:
  app/records/[id]/complete/page.tsx
    → ReviewCompletionContainer
      → useRecordCompletion
        → domain/RecordRepository
        → /api/generate-review (Gemini)

Phase 3:
  app/comparison/page.tsx
    → ComparisonContainer
      → useComparison
        → domain/ComparisonRepository
        → domain/RecordRepository
```

---

## 8. XP 시스템 재설계

### 8.1 Phase별 XP

| 이벤트 | XP | 설명 |
|--------|-----|------|
| Phase 1 완료 | 5 | 빠른 캡처 |
| Phase 2 완료 | 15 | AI 리뷰 완성 |
| Phase 3 참여 | 5 | 비교 세션 1회 |
| 신규 카테고리 첫 기록 | 10 | 탐험 보너스 |
| 7일 연속 기록 | 20 | 스트릭 보너스 |
| 사진 4종 모두 촬영 | 3 | 완전한 기록 보너스 |

### 8.2 레벨 시스템 (기존 유지)

```
Level 1:  0 XP    Level 5:  300 XP    Level 9:  1800 XP
Level 2:  30 XP   Level 6:  500 XP    Level 10: 2600 XP
Level 3:  80 XP   Level 7:  800 XP    Level 11: 3600 XP
Level 4:  160 XP  Level 8:  1200 XP
```

### 8.3 phase_completions 활용

```typescript
// post-process에서 XP 부여
async function awardPhaseXP(userId: string, recordId: string, phase: number) {
  const xpMap = { 1: 5, 2: 15, 3: 5 }
  const xp = xpMap[phase]

  await supabase.from('phase_completions').insert({
    user_id: userId, record_id: recordId, phase, xp_earned: xp
  })

  // user_stats.points 업데이트
  const { data: totalXP } = await supabase
    .from('phase_completions')
    .select('xp_earned')
    .eq('user_id', userId)

  const points = totalXP.reduce((sum, r) => sum + r.xp_earned, 0)
  const level = calculateLevel(points)

  await supabase.from('user_stats')
    .update({ points, nyam_level: level })
    .eq('user_id', userId)
}
```

---

## 9. 구현 스프린트 계획

### Sprint 1: Phase 1 Core (1주)

**목표**: 10초 캡처 플로우 완성

| Day | 작업 | 산출물 |
|-----|------|--------|
| 1 | DB 마이그레이션 | records, record_photos, record_ai_analyses, phase_completions |
| 1 | Domain entities | record-analysis.ts, phase-completion.ts, record.ts 업데이트 |
| 2 | AI Pipeline | /api/analyze-visit, visit-analyzer.ts, Gemini 프롬프트 |
| 2 | Location hook | useNearbyRestaurants, /api/restaurants/nearby |
| 3 | Phase 1 Container | QuickCaptureContainer + state machine |
| 3 | Photo Capture UI | PhotoCaptureSheet (4종 가이드) |
| 4 | AI Result UI | AIResultCard, QuickRating |
| 4 | 저장 + XP | Repository 업데이트, post-process 수정 |
| 5 | 통합 테스트 | E2E flow, fallback 검증, 에러 핸들링 |

### Sprint 2: Phase 2 Foundation (1주)

**목표**: AI 블로그 리뷰 생성

| Day | 작업 | 산출물 |
|-----|------|--------|
| 1 | DB 마이그레이션 | record_journals 확장 |
| 1 | Domain entities | record-journal.ts 업데이트 |
| 2 | Blog Generator API | /api/generate-review, Gemini 프롬프트 |
| 3 | Phase 2 Container | ReviewCompletionContainer |
| 3 | Question Flow UI | AIQuestionCard (3-5개 질문) |
| 4 | Blog Preview UI | BlogPreview (잡지 스타일) |
| 4 | 공유 기능 | ShareableCard 업데이트 |
| 5 | 트리거 시스템 | 홈 배너, 기록 상세 CTA, XP |

### Sprint 3: Phase 3 Foundation (1주)

**목표**: 맛집 이상형 월드컵

| Day | 작업 | 산출물 |
|-----|------|--------|
| 1 | DB 마이그레이션 | comparisons, comparison_matchups |
| 1 | Domain entities | comparison.ts |
| 2 | Matching Engine | 카테고리별 브래킷 생성 |
| 3 | Comparison Container | ComparisonContainer + flow |
| 3 | Matchup UI | MatchupCard (VS 비교) |
| 4 | Result UI | BracketView, ComparisonResult |
| 4 | Score Scaling | Elo-style 점수 조정 |
| 5 | Taste DNA 연동 | 비교 결과 → DNA 업데이트, XP |

### Sprint 4: Polish & Integration (1주)

| Day | 작업 |
|-----|------|
| 1-2 | 외부 리뷰 API 연동 (Naver/Google, 선택) |
| 3 | 프로필 Phase 현황, 블로그 피드 |
| 4 | PWA Push 알림 (Phase 2 리마인더) |
| 5 | 성능 최적화 (이미지 리사이즈, 캐싱, Optimistic UI) |

---

## 10. 리스크 및 대응

| 리스크 | 영향 | 대응 |
|--------|------|------|
| Gemini 간판 인식 실패 | Phase 1 자동완성 불가 | 근처 식당 수동 선택 fallback |
| 위치 권한 거부 | 근처 식당 pre-filter 불가 | 주소 검색 → Kakao API |
| AI 응답 지연 (>5초) | 10초 목표 초과 | 즉시 저장 후 AI 결과 비동기 보강 |
| 사진 0장 제출 | AI 분석 불가 | 수동 입력 축소 폼 (현재 flow 단순판) |
| 기존 레코드 호환성 | 마이그레이션 오류 | 모든 신규 컬럼 nullable/default |

### 마이그레이션 안전장치

```
- 모든 ALTER TABLE은 nullable 또는 DEFAULT 값
- 기존 records: phase_status=1, phase1_completed_at=created_at 로 일괄 업데이트
- Feature flag: NEXT_PUBLIC_PHASE_RECORD=true 로 점진적 롤아웃
- 기존 RecordContainer는 /record/legacy 로 유지 (전환기)
```

---

## 11. 성공 지표

| 지표 | 현재 | 목표 |
|------|------|------|
| Phase 1 완료 시간 | ~3분 (5단계 위저드) | <10초 |
| 기록 완료율 | 측정 필요 | Phase 1: 90%+ |
| Phase 2 전환율 | N/A | 40%+ (알림 후) |
| Phase 3 참여율 | N/A | 20%+ (조건 충족 시) |
| AI 자동완성 정확도 | 식당명만 | 식당+메뉴+가격 70%+ |
