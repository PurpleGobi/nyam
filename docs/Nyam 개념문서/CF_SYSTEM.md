# Nyam CF (Collaborative Filtering) 시스템

> 작성: 2026-04-08
> 관련: PRD §3 점수 체계, CF_SIMULATION_PLAN.md, CF_TUNING_LOG.md

---

## 1. 개요

### Nyam에 CF가 필요한 이유

네이버/구글의 단순 평균은 **모든 유저의 점수를 동등하게 취급**한다. 10만 명의 평균은 "아무도의 취향"이며, 광고/악의적 점수가 섞여도 방어할 수 없다.

Nyam CF는 **나와 취향이 비슷한 사람의 점수에 더 큰 가중치**를 준다. 오염 유저는 나와 취향 패턴이 다르므로 적합도가 자연스럽게 낮아지고, 가중치가 자동 감소한다. **누가 오염인지 판별할 필요 없이** 시스템이 방어한다.

### 시뮬레이션 검증 결과

| 항목 | 결과 |
|------|------|
| CF vs 단순 평균 | **63.9% 정확도 개선** (MAE 4.3 vs 11.8, 100점 만점) |
| 오염 내성 | 50명(33%) 오염에도 MAE +0.1 (미미) |
| 오염 적합도 감쇠 | 정직↔오염 gap 0.48 (자동 방어) |
| 콜드스타트 | 기록 8개부터 MAE < 5점 |

---

## 2. 핵심 개념

### 2.1 3-Tier 점수 체계

| 층위 | 이름 | 성격 | 언제 표시 |
|------|------|------|----------|
| **1** | 내 점수 | 내가 직접 평가한 점수 (절대적) | 방문/시음한 곳 |
| **2** | Nyam 점수 | 전체 유저 CF 기반 개인화 예측 | 항상 표시 (내 점수와 병행) |
| **3** | 버블 점수 | 버블 멤버로 스코프 한정한 CF | 가입한 버블 내 |

- Nyam 점수는 **유저마다 다른 점수**가 나온다 (CF의 핵심)
- 버블 점수는 같은 식당이라도 **버블마다 다르다** (맥락 = 렌즈)

### 2.2 용어

| 용어 | 대상 | 의미 | 범위 |
|------|------|------|------|
| **적합도** (similarity) | 나 ↔ 특정 유저 | 취향 패턴 유사도 | 0~100% |
| **신뢰도** (confidence) | 나 ↔ 특정 유저 | 적합도의 정확성 (겹침 수 비례) | 0~100% |
| **예측 확신도** (prediction confidence) | 나 → 특정 식당/와인 | 이 예측을 얼마나 믿을 수 있나 | 0~1 |
| **관계 부스트** | 나 → 특정 유저 | 팔로우/맞팔에 의한 가중치 증폭 | 1.0~1.5 |

### 2.3 사분면 2D 좌표

Nyam의 평가는 1D 점수가 아니라 **2D 사분면 좌표 (0~100)**:

| 카테고리 | X축 | Y축 | 만족도 |
|---------|-----|-----|--------|
| 식당 | 음식 퀄리티 | 경험 만족도 | (X+Y)/2 |
| 와인 | 구조·완성도 | 경험 만족도 | (X+Y)/2 |

**식당 적합도와 와인 적합도는 별개 산출** — 식당 취향은 맞는데 와인 취향은 안 맞을 수 있다.

---

## 3. 알고리즘

### 3.1 적합도 계산

```
1. Mean-centering: 각 유저의 평균 2D 좌표를 빼서 편향 제거 (필수)
   → 후한/박한 유저 보정 (+19점 개선 검증)

2. 겹치는 아이템마다 2D 유클리드 거리 계산
   거리 = √((X_a - X_b)² + (Y_a - Y_b)²)

3. 적합도 = max(0, 1 - 평균거리 / D)     (D = 60)
```

### 3.2 신뢰도

겹치는 기록의 양(수량)과 질(다양성)을 모두 반영.

```
신뢰도 = 기본 신뢰도 × 겹침 다양성 비율

기본 신뢰도 = n / (n + λ)     (λ = 7)
겹침 다양성 비율 = 니치 겹침 수 / 전체 겹침 수

니치 판별: 기록자 수가 전체 유저의 10% 이하인 식당
```

- 기본 신뢰도: 겹침 3개 → 30%, 7개 → 50%, 20개 → 74%
- 다양성 비율: 프랜차이즈에서만 겹치면 0%, 니치가 섞여야 유효
- 시뮬레이션 검증: 공격자 500명(95% 점령)도 부풀림 +0.20으로 완전 무력화. 일반 예측 부작용 없음.

### 3.3 Nyam 점수 (예측)

```
가중치ᵢ = 적합도ᵢ × 신뢰도ᵢ × 관계부스트ᵢ

예측X = 내 평균X + Σ(가중치ᵢ × (상대Xᵢ - 상대평균Xᵢ)) / Σ|가중치ᵢ|
예측Y = 내 평균Y + Σ(가중치ᵢ × (상대Yᵢ - 상대평균Yᵢ)) / Σ|가중치ᵢ|
```

### 3.4 관계 부스트

| 관계 | 부스트 | 의미 |
|------|--------|------|
| 내가 팔로우 (맞팔 포함) | ×1.5 | 내가 선택한 신뢰 |
| 비팔로우 | ×1.0 | 순수 알고리즘 |

부스트 효과는 미세 조정 수준 (평가자 중 팔로우 비율 ~10%). 높은 부스트(2.0+)는 오염 유저 팔로우 시 피해가 커서 보수적 값으로 확정. 맞팔 여부로 부스트를 나누지 않는 이유: 팔로우는 "나는 이 사람의 취향을 신뢰한다"는 일방적 선언이며, 상대의 팔로백 여부가 상대 점수의 유용성을 바꾸지 않는다.

### 3.5 예측 확신도

```
확신도 = n_factor × 0.50 + agreement × 0.35 + quality × 0.15

  n_factor  = 유효평가자수 / (유효평가자수 + 7)
  agreement = 1 - 가중편차표준편차 / 2      ← mean-centered 편차 기반
  quality   = 평균가중치 / (평균가중치 + 0.3)
```

점수는 항상 보여준다. 숨기지 않는다. 확신도를 **%로 투명하게 표시**하여 유저가 직접 판단:

```
Nyam 82  확신 87%
Nyam 74  확신 12%
```

라벨 없이 % 숫자만으로 충분. 확신 87%일 때 MAE ~4점, 확신 12%일 때 MAE ~6점.

### 3.6 필터링 (속도 최적화)

정확도 손실 0점 검증 완료:

| 필터 | 효과 | 커버리지 |
|------|------|---------|
| 겹침 ≥3 | 노이즈 유저 제거 | 92.3% |
| Top-50 | 가중치 상위 50명만 | 100% (50명 이상인 경우만 발동) |

### 3.7 버블 점수

**Nyam 점수와 동일한 CF 엔진이지만, 스코프와 파라미터가 다르다.**

버블 가입 자체가 "이 멤버들을 신뢰한다"는 의사 표시이므로, 공격 방어 로직을 적용하지 않고 적은 데이터에서도 점수를 산출한다.

| | Nyam 점수 | 버블 점수 |
|---|---|---|
| 대상 | 전체 유저 | 버블 멤버만 |
| 다양성 보정 | 적용 (공격 방어) | **미적용** |
| 최소 겹침 | 3개 | **0개** |
| 최소 기록자 | 3명 | **1명** |
| 팔로우 부스트 | ×1.5 / ×1.0 | **×1.0 균등** |
| 산출 방식 | CF 가중 예측 | 1명이면 그대로, 2명+이면 CF |

**멤버 수별 산출 방식:**

```
멤버 1명 기록 → 해당 멤버의 점수 그대로 표시
멤버 2명+ 기록 → CF 가중 예측 (겹침 요건 없이)
```

**확신도 표시:** % + "N명 평가" 명시. 멤버 1명이면 확신도는 낮지만 점수는 보여준다.

**대표 버블 선택:** 여러 버블에 가입한 경우, 확신도가 가장 높은 버블의 점수를 카드에 표시. 클릭 시 전체 버블 목록 펼침.

**같은 식당이라도 버블마다 다른 점수:**
```
와인동호회  87  확신 72%  5명 ← "내추럴와인 관점에서 훌륭"
가성비버블  63  확신 58%  12명 ← "가성비로는 별로"
대학동기    91  확신 45%  3명 ← "친구들은 좋아함"
```

---

## 4. 데이터 아키텍처

### 4.1 새로 필요한 테이블

#### `user_similarities` — 유저 쌍별 적합도 캐시

```sql
CREATE TABLE user_similarities (
  user_a UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_b UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN ('restaurant', 'wine')),
  
  similarity REAL NOT NULL DEFAULT 0,    -- 0~1 (적합도)
  confidence REAL NOT NULL DEFAULT 0,    -- 0~1 (신뢰도)
  n_overlap INT NOT NULL DEFAULT 0,      -- 겹치는 기록 수
  
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  PRIMARY KEY (user_a, user_b, category),
  CHECK (user_a < user_b)  -- 정규화: 항상 작은 ID가 앞
);

CREATE INDEX idx_sim_user_a ON user_similarities(user_a, category);
CREATE INDEX idx_sim_user_b ON user_similarities(user_b, category);
```

#### `user_score_means` — 유저별 평균 점수 캐시

```sql
CREATE TABLE user_score_means (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN ('restaurant', 'wine')),
  
  mean_x REAL NOT NULL DEFAULT 50,
  mean_y REAL NOT NULL DEFAULT 50,
  record_count INT NOT NULL DEFAULT 0,
  
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  PRIMARY KEY (user_id, category)
);
```

### 4.2 기존 테이블 활용

| 테이블 | CF에서의 역할 |
|--------|-------------|
| `records` | 2D 좌표(`axis_x`, `axis_y`) + `satisfaction` 조회 |
| `follows` | 관계 부스트 판정 |
| `bubble_members` | 버블 점수 스코프 |

### 4.3 RLS 정책

```sql
-- user_similarities: 본인이 포함된 쌍만 조회 가능
CREATE POLICY "own_similarities" ON user_similarities
  FOR SELECT USING (auth.uid() = user_a OR auth.uid() = user_b);

-- user_score_means: 누구의 평균이든 조회 가능 (예측에 필요)
CREATE POLICY "read_means" ON user_score_means
  FOR SELECT USING (true);

-- 쓰기는 Edge Function(service role)만
```

---

## 5. 속도 아키텍처: 이벤트 기반 증분 업데이트

### 5.1 왜 크론잡이 아닌가

| 방식 | 10만 명 비용 | 실시간성 |
|------|------------|---------|
| 크론 전수 계산 | ~2,500시간 (불가) | ❌ 크론 주기만큼 지연 |
| **이벤트 기반 증분** | **기록당 0.1~4.5초 (백그라운드)** | **✅ 즉시 반영** |

### 5.2 이벤트 흐름

```
[유저 A가 식당 X에 기록 추가]
  │
  ├─ 즉시 (동기): records 테이블에 INSERT
  │
  └─ 백그라운드 (비동기, Supabase trigger → Edge Function):
      │
      ├─ 1. user_score_means 갱신 (유저 A의 평균 재계산)
      │
      ├─ 2. 식당 X의 다른 기록자 목록 조회 → [B, C, D, ...]
      │
      ├─ 3. 각 기록자와 유저 A의 적합도 재계산
      │     - 겹치는 기록 조회
      │     - 겹침 < 3이면 스킵
      │     - 적합도 + 신뢰도 계산
      │     - user_similarities UPSERT
      │
      └─ 4. 완료
      
  비용 (겹침≥3 필터 적용 후, 100K 유저 기준):
    일반 식당 (기록자 20명 → 겹침≥3 후 5명):     0.1초
    인기 식당 (기록자 500명 → 겹침≥3 후 125명):   2.2초
    극인기 (기록자 5,000명 → 겹침≥3 후 1,250명): 22초 → 비동기 큐 분산
```

### 5.3 예측 요청 흐름

```
[유저 A가 식당 Y의 Nyam 점수 요청]
  │
  ├─ 1. 식당 Y의 기록자 목록 조회 (records 테이블)
  │
  ├─ 2. 각 기록자와 유저 A의 적합도 조회 (user_similarities, 캐시됨)
  │     → 겹침 ≥3 필터 (n_overlap < 3인 쌍은 이미 저장 안 됨)
  │
  ├─ 3. follows 테이블에서 관계 부스트 판정
  │
  ├─ 4. 가중치 상위 Top-50 선택
  │
  ├─ 5. 가중 예측 계산 (mean-centered)
  │
  └─ 6. 예측 확신도 계산 → 표시 기준 판정
  
  속도: < 20ms/건, 20건 피드 < 400ms
```

### 5.4 팔로우 변경 시

```
[유저 A가 유저 B를 팔로우/언팔]
  → follows 테이블만 변경
  → 적합도 재계산 불필요 (관계 부스트는 예측 시 실시간 조회)
  → 즉시 반영
```

### 5.5 기록 수정/삭제 시

```
[유저 A가 기존 기록 수정]
  → 기록 추가와 동일한 흐름 (해당 아이템 기록자와 적합도 재계산)

[유저 A가 기록 삭제]
  → user_score_means 재계산
  → 해당 아이템 기록자와의 적합도 재계산 (겹침 -1)
  → 겹침 < 3이 되면 user_similarities에서 삭제
```

### 5.6 에러 핸들링 / 폴백

```
[predict-score Edge Function 호출 실패 시]
  → 1차 폴백: 캐시된 이전 Nyam 점수 표시 (stale-while-revalidate)
  → 2차 폴백: 점수 숨김 + "잠시 후 다시 시도" 메시지
  (레거시 단순 평균 폴백은 두지 않음 — findPublicSatisfactionAvg는 삭제 대상)

[compute-similarity Edge Function 실패 시]
  → 백그라운드이므로 유저에게 영향 없음
  → 실패 로그 기록 + 주간 크론잡에서 누락분 보정
```

---

## 6. Edge Function 설계

### 6.0 인증 정책

| Edge Function | 호출 주체 | 인증 |
|--------------|----------|------|
| `compute-similarity` | DB trigger (백그라운드) | **service_role** key |
| `predict-score` | 클라이언트 (유저 요청) | **anon key + JWT** (auth.uid() 기반) |
| `batch-predict` | 클라이언트 (피드 로드) | **anon key + JWT** |

### 6.1 `compute-similarity` — 적합도 갱신

**트리거**: records INSERT/UPDATE/DELETE 시 Supabase Database Webhook

```
Input: { user_id, item_id, category, action: 'insert'|'update'|'delete' }

1. user_score_means 갱신 (해당 유저의 평균 재계산)
2. 해당 아이템의 다른 기록자 조회
3. 각 기록자와의 겹치는 아이템 조회
4. 겹침 ≥ 3인 쌍만 적합도 계산
5. user_similarities UPSERT
```

### 6.2 `predict-score` — Nyam 점수 예측

**호출**: 클라이언트에서 직접 호출 (식당/와인 상세 페이지, 피드)

```
Input: { user_id, item_id, category, scope?: bubble_member_ids }
Output: {
  predicted_x, predicted_y, satisfaction,
  confidence,        // 0~1 (예측 확신도)
  n_raters,          // 유효 평가자 수
  breakdown: {
    following_raters: [     // 팔로잉 기여자 (가중↑)
      { user_id, nickname, similarity, score, boost }
    ],
    other_raters: {         // 비팔로우 유사 유저
      count, avg_similarity, avg_score
    }
  }
}

1. 아이템 기록자 조회
2. user_similarities에서 적합도 배치 조회
3. follows에서 관계 배치 조회
4. Top-50 필터 → 가중 예측
5. 확신도 계산
6. breakdown 구성: 팔로잉/비팔로우 분리
```

### 6.3 `batch-predict` — 피드용 배치 예측

```
Input: { user_id, item_ids: string[], category }
Output: { predictions: { item_id, satisfaction, confidence }[] }

item_ids 최대 50건. 내부적으로 predict-score를 최적화하여 배치 실행.
적합도 조회를 한 번에 모아서 DB 라운드트립 최소화.
```

---

## 7. 클린 아키텍처 매핑

```
domain/
  entities/
    similarity.ts          ← SimilarityResult, PredictionResult 타입
    prediction-confidence.ts
  repositories/
    similarity-repository.ts   ← interface: getSimilarities, upsertSimilarity
    prediction-repository.ts   ← interface: predictScore, batchPredict
  services/
    cf-calculator.ts       ← 순수 함수: computeSimilarity, computePrediction, computeConfidence
                              (외부 의존 0, 테스트 가능)

infrastructure/
  repositories/
    supabase-similarity-repository.ts  ← user_similarities 테이블 CRUD
    supabase-prediction-repository.ts  ← Edge Function 호출 래퍼

application/
  hooks/
    use-nyam-score.ts      ← 식당/와인 상세에서 Nyam 점수 조회
    use-feed-scores.ts     ← 피드에서 배치 예측 조회
    use-similarity.ts      ← 두 유저 간 적합도 조회 (프로필용)

presentation/
  components/
    detail/
      confidence-badge.tsx       ← 확신도 레벨 표시 (높음/보통/참고용)
      score-breakdown-panel.tsx  ← Nyam 점수 근거 펼침 UI
      bubble-expand-panel.tsx    ← 버블별 CF 점수 펼침 (기존 파일 리팩토링)
    similarity-indicator.tsx     ← 적합도 % 표시 (프로필/팔로우용)
```

---

## 8. UI 변경 계획

### 8.1 현재 구조 (4종 점수)

```
score-cards.tsx              ← 4개 카드 가로 배치
  ┌────┐ ┌────┐ ┌────┐ ┌────┐
  │ 나  │ │팔로잉│ │ 버블 │ │nyam│
  │ 85 │ │ 82 │ │ 78 │ │ 74 │
  └────┘ └────┘ └────┘ └────┘
```

**현재 파일 구조**:

| 파일 | 역할 |
|------|------|
| `domain/entities/score.ts` | `ScoreSource = 'mine'\|'following'\|'bubble'\|'public'`, `TargetScores` 4종 |
| `domain/constants/source-priority.ts` | 폴백 우선순위 `['mine','following','bubble','public','bookmark']` |
| `domain/services/score-fallback.ts` | 나→팔로잉→버블→nyam 순서 폴백 |
| `application/hooks/use-target-scores.ts` | 4종 점수를 카드 데이터로 변환, 토글/선택 관리 |
| `application/hooks/use-restaurant-detail.ts` | 4종 점수 각각 조회 (DB 직접 평균) |
| `application/hooks/use-wine-detail.ts` | 동일 |
| `infrastructure/repositories/supabase-restaurant-repository.ts` | `findFollowingRecordsByTarget()`, `findPublicSatisfactionAvg()` 등 |
| `presentation/components/detail/score-cards.tsx` | 카드 UI (가로 flex, 토글 선택) |
| `presentation/components/detail/bubble-expand-panel.tsx` | 버블 점수 펼침 (미사용) |

**현재 점수 산출 방식** (전부 단순 평균):
- **나**: 내 기록의 `avg(satisfaction)`
- **팔로잉**: 팔로잉 유저 기록의 `avg(satisfaction)`
- **버블**: 버블 공유 기록의 `avg(satisfaction)`
- **nyam**: 공개 프로필 유저 기록의 `avg(satisfaction)`

### 8.2 변경 후 구조 (3종 점수)

```
score-cards.tsx              ← 3개 카드 가로 배치
  ┌──────┐ ┌──────┐ ┌──────┐
  │  나   │ │ Nyam │ │  버블  │
  │  85  │ │  82  │ │  78  │
  │2회 방문│ │확신 높음│ │와인동호회│
  └──────┘ └──────┘ └──────┘
                ↓ 탭하면 펼침
  ┌────────────────────────────┐
  │ 점수 근거                     │
  │ 적합도 91% @kim → 85        │
  │ 적합도 84% @lee → 80        │
  │ 유사 유저 12명 → 평균 81      │
  │                             │
  │ 버블별 점수                   │
  │ 🍷 와인동호회  87 · 5명       │
  │ 🍜 강남맛집   79 · 12명      │
  └────────────────────────────┘
```

**변경 핵심**:
- `following` 소스 **제거** → CF 알고리즘이 팔로잉을 부스트로 통합 처리
- `public` → `nyam`으로 명칭 변경 + **CF 기반 개인화 점수**로 산출 로직 교체
- `bubble` → 유지하되 **CF 기반 버블 점수**로 교체 (버블 멤버 스코프 CF)
- 신뢰도/적합도 표시 추가
- 탭 시 점수 근거 + 버블별 점수 expand 패널

**버블 expand 스코프**: 내가 가입한 버블 중 **해당 식당/와인에 기록이 1건 이상 있는 버블만** 표시. 기록 없는 버블은 생략.

**내 점수 ≠ Nyam 점수 차이 UX**: 별도 설명 없음. 내 점수는 내 경험이고 Nyam은 예측이므로 다른 게 자연스러움. 차이 자체가 정보 — "나는 높게 평가했지만 취향 비슷한 사람들은 보통이다" 등.

### 8.3 파일별 변경 상세

#### domain 레이어

| 파일 | 변경 |
|------|------|
| `domain/entities/score.ts` | `ScoreSource` → `'mine'\|'nyam'\|'bubble'` (3종). `TargetScores`에서 `following` 제거, `public` → `nyam`. **신규 필드**: `confidence: number`, `nRaters: number` |
| `domain/constants/source-priority.ts` | `['mine','nyam','bubble','bookmark']`으로 변경 |
| `domain/services/score-fallback.ts` | 폴백: 나 → nyam → 버블 |
| `domain/entities/similarity.ts` | **신규**: `SimilarityResult`, `PredictionResult`, `PredictionConfidence` 타입 |
| `domain/repositories/similarity-repository.ts` | **신규**: CF 적합도 조회 인터페이스 |
| `domain/repositories/prediction-repository.ts` | **신규**: CF 예측 조회 인터페이스 |
| `domain/services/cf-calculator.ts` | **신규**: 순수 CF 계산 함수 (mean-centering, 적합도, 예측, 확신도) |

#### infrastructure 레이어

| 파일 | 변경 |
|------|------|
| `supabase-restaurant-repository.ts` | `findPublicSatisfactionAvg()` **삭제** (CF Edge Function으로 대체). `findFollowingRecordsByTarget()`는 상세 페이지에서 제거하되, 홈 피드 팔로잉 탭에서 사용하므로 **메서드 자체는 유지**. `findBubbleScores()`는 사분면 dot 시각화용으로 **유지**, 버블 점수 산출은 CF로 대체. |
| `supabase-wine-repository.ts` | 동일 |
| `supabase-similarity-repository.ts` | **신규**: `user_similarities` 테이블 CRUD |
| `supabase-prediction-repository.ts` | **신규**: `predict-score` / `batch-predict` Edge Function 호출 |

#### application 레이어

| 파일 | 변경 |
|------|------|
| `use-target-scores.ts` | 4종 → 3종. `followingAvgScore` 파라미터 제거. `nyamAvgScore` → CF 예측 결과(satisfaction + confidence). 카드 3개 생성. |
| `use-restaurant-detail.ts` | `followingAvgScore`/`followingCount` 조회 제거. `nyamAvgScore` → `useNyamScore()` 훅으로 대체. 버블 점수도 CF 기반으로 변경. |
| `use-wine-detail.ts` | 동일 |
| `use-nyam-score.ts` | **신규**: Edge Function 호출 → `PredictionResult` 반환 |
| `use-feed-scores.ts` | **신규**: 피드 배치 예측 |
| `use-similarity.ts` | **신규**: 두 유저 간 적합도 조회 (프로필용) |

#### presentation 레이어

| 파일 | 변경 |
|------|------|
| `score-cards.tsx` | `flex gap-1.5` 4칸 → 3칸. `ScoreCardData`에 `confidence?: number` 추가. 확신도 표시 (서브텍스트). |
| `bubble-expand-panel.tsx` | **활성화**: 버블별 CF 점수 표시. 개별 버블 탭 시 해당 버블 점수 세부 표시. |
| `score-breakdown-panel.tsx` | **신규**: Nyam 점수 탭 시 펼침. 팔로잉 기여자(가중↑) + 유사 유저 기여 분리 표시. 적합도/신뢰도 각 기여자별 표시. |
| `confidence-badge.tsx` | **불필요** — 확신도를 %로 직접 표시하므로 별도 뱃지 컴포넌트 불필요. score-cards.tsx에서 직접 표시. |

#### container 레이어

| 파일 | 변경 |
|------|------|
| `restaurant-detail-container.tsx` | `followingAvgScore` 관련 제거. `useNyamScore` 연결. ScoreCards 3카드 + expand 패널 연결. 사분면 dedup에서 `following` 소스 제거. |
| `wine-detail-container.tsx` | 동일 |

### 8.4 상세 페이지 외 영향

#### 홈 피드 카드

| 현재 | 변경 후 |
|------|--------|
| 내 점수만 표시, 미평가는 "평가하기" | 미방문이어도 **Nyam 점수 표시 가능** (확신도 기준) |
| 팔로잉 탭에서 팔로잉 점수 배지 | 팔로잉 탭 유지, 점수는 Nyam 점수(팔로잉 부스트 반영됨)로 통합 |

관련 파일:
- `presentation/components/home/record-card.tsx` — Nyam 점수 배지 추가
- `presentation/components/home/score-source-badge.tsx` — `following` 라벨 제거

#### 프로필 / 버블러 프로필

| 현재 | 변경 후 |
|------|--------|
| 평균 만족도 + XP/레벨 | 타인 프로필에 **적합도 + 신뢰도** 표시 추가 |

관련 파일:
- `presentation/containers/profile-container.tsx` — 버블러 모드에서 `useSimilarity` 연결
- `presentation/components/profile/` — 적합도 표시 컴포넌트 추가

#### 팔로우/팔로워 목록

| 현재 | 변경 후 |
|------|--------|
| 이름 + 레벨 | **적합도 %** 표시 + 적합도순 정렬 옵션 |

관련 파일:
- `presentation/components/follow/` — 적합도 인디케이터 추가
- `application/hooks/use-followers.ts` — 적합도 배치 조회 연결

---

## 9. 구현 계획

### Phase 1: DB + 도메인 기반

| # | 태스크 | 레이어 | 산출물 |
|---|--------|--------|--------|
| 1-1 | `user_similarities` 테이블 + RLS + 인덱스 | infra | migration |
| 1-2 | `user_score_means` 테이블 + RLS | infra | migration |
| 1-3 | CF 도메인 엔티티 (`SimilarityResult`, `PredictionResult`, `PredictionConfidence`) | domain | `similarity.ts`, `prediction-confidence.ts` |
| 1-4 | `ScoreSource` 3종으로 변경 + `TargetScores` 리팩토링 | domain | `score.ts`, `source-priority.ts` 수정 |
| 1-5 | CF 순수 계산 서비스 (`cf-calculator.ts`) | domain | service |
| 1-6 | `score-fallback.ts` 폴백 순서 변경 (나→nyam→버블) | domain | service 수정 |
| 1-7 | CF 계산 서비스 단위 테스트 | domain | test |

### Phase 2: 증분 업데이트 파이프라인

| # | 태스크 | 레이어 | 산출물 |
|---|--------|--------|--------|
| 2-1 | `SimilarityRepository` 인터페이스 | domain | repository interface |
| 2-2 | `SupabaseSimilarityRepository` 구현 | infra | repository |
| 2-3 | `compute-similarity` Edge Function | infra | edge function |
| 2-4 | records INSERT/UPDATE/DELETE → DB webhook → Edge Function 연결 | infra | trigger |
| 2-5 | `user_score_means` 자동 갱신 | infra | trigger |

### Phase 3: 예측 API

| # | 태스크 | 레이어 | 산출물 |
|---|--------|--------|--------|
| 3-1 | `PredictionRepository` 인터페이스 | domain | repository interface |
| 3-2 | `predict-score` Edge Function (단건) | infra | edge function |
| 3-3 | `batch-predict` Edge Function (피드 배치) | infra | edge function |
| 3-4 | `SupabasePredictionRepository` 구현 | infra | repository |
| 3-5 | DI 컨테이너 등록 | shared/di | container |

### Phase 4: 새 훅 + UI 컴포넌트 (Phase 5 이전에 완료 필요)

| # | 태스크 | 레이어 | 산출물 |
|---|--------|--------|--------|
| 4-1 | `useNyamScore` 훅 (상세 페이지용, Edge Function 호출) | application | hook |
| 4-2 | `useFeedScores` 훅 (피드 배치용) | application | hook |
| 4-3 | `useSimilarity` 훅 (프로필/팔로우용) | application | hook |
| 4-4 | `confidence-badge.tsx` (확신도 레벨 표시) | presentation | component |
| 4-5 | `score-breakdown-panel.tsx` (점수 근거 펼침) | presentation | component |
| 4-6 | `bubble-expand-panel.tsx` → CF 버블 점수 기반으로 리팩토링 | presentation | component 수정 |
| 4-7 | `similarity-indicator.tsx` (적합도 % 표시) | presentation | component |

### Phase 5: 기존 점수 시스템 마이그레이션 (Phase 4 완료 후)

| # | 태스크 | 레이어 | 변경 파일 |
|---|--------|--------|----------|
| 5-1 | `use-target-scores.ts` → 4종→3종, following 제거, confidence 추가 | application | 수정 |
| 5-2 | `use-restaurant-detail.ts` → following 점수 조회 제거, `useNyamScore` 연결 | application | 수정 |
| 5-3 | `use-wine-detail.ts` → 동일 | application | 수정 |
| 5-4 | `supabase-restaurant-repository.ts` → `findPublicSatisfactionAvg()` 삭제 (`findFollowingRecordsByTarget()`는 홈 피드용으로 유지) | infra | 수정 |
| 5-5 | `supabase-wine-repository.ts` → 동일 | infra | 수정 |
| 5-6 | `score-cards.tsx` → 4칸→3칸, 확신도 서브텍스트 추가 | presentation | 수정 |
| 5-7 | `score-source-badge.tsx` → `following` 라벨 제거 | presentation | 수정 |

### Phase 6: 화면별 통합 (Phase 4+5 완료 후)

| # | 태스크 | 관련 파일 |
|---|--------|----------|
| 6-1 | 식당 상세 → ScoreCards 3종 + breakdown 펼침 + 버블 펼침 | `restaurant-detail-container.tsx` |
| 6-2 | 와인 상세 → 동일 | `wine-detail-container.tsx` |
| 6-3 | 홈 피드 카드 → 미방문 Nyam 점수 배지 | `record-card.tsx` |
| 6-4 | 사분면 시각화 → following 소스 제거, dedup 로직 수정 | `restaurant-detail-container.tsx` quadrant 섹션 |
| 6-5 | 버블러 프로필 → 적합도 + 신뢰도 표시 | `profile-container.tsx` |
| 6-6 | 팔로우 목록 → 적합도 % + 적합도순 정렬 | `follow/` 컴포넌트 |

### Phase 7: 성능 검증

| # | 태스크 | 산출물 |
|---|--------|--------|
| 7-1 | Edge Function 속도 벤치마크 (단건 < 20ms, 배치 < 400ms) | 리포트 |
| 7-2 | 인기 식당 부하 테스트 (기록자 1,000명+) | 리포트 |
| 7-3 | 비동기 큐 분산 (극인기 5,000명+) | 필요 시 구현 |
| 7-4 | 주간 정합성 크론잡 | pg_cron |
| 7-5 | 에러 폴백 시나리오 테스트 (Edge Function 실패 → 레거시 폴백) | 테스트 |

### Phase 의존성

```
Phase 1 (DB + 도메인) ── 선행 없음
  ↓
Phase 2 (증분 파이프라인) ── Phase 1 필요
  ↓
Phase 3 (예측 API) ── Phase 1, 2 필요
  ↓
Phase 4 (새 훅 + 컴포넌트) ── Phase 3 필요 (Edge Function 호출 대상)
  ↓
Phase 5 (기존 마이그레이션) ── Phase 4 필요 (useNyamScore 등 연결 대상)
  ↓
Phase 6 (화면 통합) ── Phase 4, 5 필요
  ↓
Phase 7 (성능 검증) ── Phase 6 완료 후

Phase 4와 5는 병렬 불가: Phase 5에서 useNyamScore를 연결하므로 Phase 4가 먼저.
Phase 1~3은 UI 변경 없이 백엔드만 구축하므로 기존 UI 유지 상태에서 진행 가능.
```

---

## 10. 확정 파라미터 (시뮬레이션 검증 완료)

### Nyam 점수 파라미터

| 파라미터 | 값 | 근거 |
|---------|-----|------|
| D (거리 정규화) | 60 | 클러스터 분리 p<0.005, MAE 최적 |
| λ (신뢰도 감쇠) | 7 | 겹침 7개에서 conf 0.5 |
| 관계 부스트 (팔로우/비팔로우) | 1.5/1.0 | 팔로우=일방적 신뢰 선언, 맞팔 구분 불필요 |
| 겹침 다양성 보정 | 적용 | 프랜차이즈 공격 방어. 시뮬레이션: 공격자 95% 점령에도 부풀림 +0.20 |
| 니치 판별 기준 | 전체 유저의 10% 이하 | 시뮬레이션 검증 |
| Mean-centering | 필수 | +19점 개선 |
| 겹침 최소 필터 | ≥3 | 커버리지 92.3%, 정확도 손실 0 |
| Top-K | 50 | 정확도 손실 0 |
| 확신도 표시 | 항상 %로 표시, 숨기지 않음 | 유저가 직접 판단 |

### 버블 점수 파라미터

| 파라미터 | 값 | 근거 |
|---------|-----|------|
| 겹침 최소 필터 | 0 (없음) | 신뢰 그룹이므로 겹침 불필요 |
| 최소 기록자 | 1명 | 멤버 1명의 기록도 유효한 정보 |
| 관계 부스트 | ×1.0 균등 | 멤버 간 차등 없음 (가입 자체가 신뢰) |
| 겹침 다양성 보정 | 미적용 | 신뢰 그룹이므로 공격 방어 불필요 |
| 산출 방식 | 1명이면 그대로, 2명+이면 CF | 데이터가 적어도 점수 산출 |
| 확신도 표시 | %로 표시 + "N명 평가" 명시 | 소수 데이터 투명 공개 |

---

## 11. 참조

| 문서 | 내용 |
|------|------|
| `development_docs/00_PRD.md` §3 | 점수 체계 정의 |
| `docs/system_brainstorming/CF_SIMULATION_PLAN.md` | 시뮬레이션 계획 + 결과 (§8) |
| `docs/system_brainstorming/simulation/CF_TUNING_LOG.md` | V1~V6 튜닝 이터레이션 상세 |
| `docs/system_brainstorming/simulation/cf_engine.py` | Python CF 엔진 (참조 구현) |
| `development_docs/systems/RECOMMENDATION.md` | Phase 1 규칙 기반 추천 (CF 이전) |
| `development_docs/systems/DATA_MODEL.md` | 기존 DB 스키마 |
