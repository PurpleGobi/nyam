<!-- updated: 2026-04-20 -->

---
depends_on:
  - DATA_MODEL.md        # records/bubble_members/user_similarities/user_score_means 스키마
  - BUBBLE_SYSTEM.md     # 버블 스코프 CF, visibility 규칙
  - RECORD_SYSTEM.md     # 사분면 2D 좌표(axis_x, axis_y), 만족도 산출식
  - XP_SYSTEM.md         # 기록 수 기반 콜드스타트 기준, prestige 경로
  - SOCIAL_SYSTEM.md     # 팔로우 부스트 — follows.status='accepted' 실시간 조회
  - MAP_LOCATION.md      # Discover 지역 기반 정렬, geofence 푸시 좌표
affects: []              # 최상위 추천 SSOT — 다른 시스템에 위임하지 않는다
---

# RECOMMENDATION — 추천 알고리즘

> **범위**: 홈 `추천` 필터칩, 식당/와인 상세 Nyam 점수, 버블 점수, 와인 페어링, 지역 푸시.
> **비범위**: Discover(탐색) 정렬은 지역 기반이며 `MAP_LOCATION.md`에 위임. XP/레벨은 `XP_SYSTEM.md`에 위임.

---

## 1. 추천 철학

- **내 데이터가 먼저** — 기록 충분하면 외부 데이터는 배경으로
- **상황이 핵심** — 혼밥/데이트/회식에서 원하는 게 다르다
- **신뢰가 필터** — 알고리즘보다 "아는 사람의 경험" 우선
- **이기적 동기 존중** — 추천이 싫으면 무시 가능 (강제 피드 없음). 추천은 `추천` 필터칩으로만 격리 노출, 주인공은 내 기록.
- **규칙 기반 추천은 식당 중심, CF 예측은 식당+와인 통합** — Phase 1 규칙 기반 추천(재방문/상황/권위/버블/지역 푸시 등 §2)은 식당 탭에만 `추천` 필터칩으로 노출된다. 반면 Phase 2 CF 기반 점수 예측(Nyam 점수/버블 점수, §3)은 `user_similarities.category`를 `'restaurant' | 'wine'`으로 분리하여 식당과 와인 모두에 개인화 예측을 제공한다 (`use-nyam-score`, `use-feed-scores` 참조, PRD §4 "식당+와인 통합 취향 적합도"). 와인 탭의 `추천` 필터칩 신설은 Phase 2 후반에 재평가(§9).
- **데이터 오염 방지** — 버블 추천의 신뢰성을 위해 버블 가입 자체가 "이 멤버들을 신뢰한다"는 의사 표시로 작동 (공격 방어 로직 미적용)

> Discover(탐색) 화면은 추천이 아닌 **지역 기반 탐색**이다. 정렬 기준은 `MAP_LOCATION.md` 참조.

---

## 2. Phase 1 추천 (규칙 기반, SQL로 충분)

### 추천 카드 구성

`추천` 필터칩 진입 시 표시되는 카드는 아래 추천 소스를 혼합하여 추천순으로 정렬:

| 소스 태그 | 배경 | 텍스트 | 표시 내용 | 예시 |
|-----------|------|--------|-----------|------|
| `AI` | `rgba(126,174,139,0.15)` | `--positive` | 개인화 추천 메시지 | "오마카세를 좋아하시니까 여기도 좋아하실 거예요" |
| `버블` | `rgba(122,155,174,0.15)` | `--accent-social` | 버블 멤버명 + 점수 + 한줄평 | **박소연** 91 · "을지로 프렌치 최고" |
| `웹` | `var(--bg-page)` | `--text-hint` | N/K/G 외부 평점 | N4.4 K4.2 G4.3 |

- 각 카드에 인게이지먼트 표시: ♡ + 💬
- 미방문 추천 카드 점수는 `not-mine` 스타일 (`--text-hint` 색상), 재방문 추천은 내 점수(accent 색상) 표시
- AI 추천 카드는 개인화 메시지 필수 (취향 분석, 새 동네 탐험, 재방문 제안 등)
- 버블 추천 카드는 Phase 1부터 노출 (버블 멤버의 높은 평가 기록 기반)
- 카드 형식은 HOME.md §3-4 플레이스 카드와 동일 (compact/detail 뷰 모두 지원)

### 2-1. 재방문 추천 — "다시 가고 싶은 곳"
**트리거**: 홈 식당 탭 → `추천` 필터칩 진입
**소스 태그**: AI

```sql
SELECT r.target_id,
       AVG(r.satisfaction) as avg_score,
       MAX(r.created_at) as last_visit,
       COUNT(*) as visit_count
FROM records r
WHERE r.user_id = :user AND r.target_type = 'restaurant'
  AND r.satisfaction >= 80
GROUP BY r.target_id
ORDER BY
  (AVG(r.satisfaction) * 0.6)                          -- 60%: 내 평가
  + (EXTRACT(DAY FROM NOW() - MAX(r.created_at)) * 0.002 * 100) * 0.3  -- 30%: 오래 안 감
  + (LEAST(COUNT(*), 5) * 4) * 0.1                     -- 10%: 재방문 보너스
  DESC
LIMIT 10;
```

### 2-2. 상황별 추천 (식당 탭 전용)
**트리거**: 홈 식당 탭 → `추천` 필터칩 + 필터에서 `상황 is [값]` 선택
**소스 태그**: AI

> 와인은 `scene` 컬럼을 공유하지만(RECORD_SYSTEM §5.4), 상황 기반 추천은 식당 탭 전용이다. 와인의 상황 활용은 페어링(§2-7) 및 Phase 2 CF로 대체한다.

#### 상황 태그 매핑

| UI 라벨 (한글) | DB 값 (영문) | 색상 |
|---------------|-------------|------|
| 혼밥 | solo | `--scene-solo` #7A9BAE |
| 데이트 | romantic | `--scene-romantic` #B8879B |
| 친구 | friends | `--scene-friends` #7EAE8B |
| 가족 | family | `--scene-family` #C9A96E |
| 회식 | business | `--scene-business` #8B7396 |
| 술자리 | drinks | `--scene-drinks` #B87272 |

```sql
WHERE r.scene = :selected_scene AND r.satisfaction >= 75
```

### 2-3. 사분면 필터
사분면 좌표는 추천의 **필터 조건**으로만 사용:
```sql
-- "데이트인데 고급스러운 곳"
WHERE r.scene = 'romantic' AND r.axis_x >= 60 AND r.axis_y >= 60 AND r.satisfaction >= 80
```

### 2-4. 찜 리마인드 — 제거됨

> **제거 근거**: `bookmarks` 테이블은 migration `063`에서 DROP됨. PRD §7 "찜 기능 제거 — 버블로 대체" 정책에 따라, 찜 리마인드 추천은 더 이상 존재하지 않는다. 대체 수단은 **1인 비공개 버블 + `bubble_items.added_at` 기반 재발견**이며, 상세 규칙은 `BUBBLE_SYSTEM.md` 참조. 지역 푸시(§2-8)의 "찜 기반 거리 우선순위" 조항도 함께 무효.

### 2-5. 권위 추천 (콜드스타트/새 지역)
**트리거**: 기록 < 5개 or 새 지역
**소스 태그**: AI (+ 웹 소스 병기)

우선순위:
1. 미슐랭/블루리본
2. 외부 평점 상위 (N ≥ 4.3 AND K ≥ 4.0 AND G ≥ 4.2)
3. Nyam 전체 사용자 평균 상위

> ※ prestige 활용 경로: `restaurants.prestige` JSONB 필드 + `search_restaurants_bounds_source` RPC `p_prestige_types` 파라미터 (XP_SYSTEM §18-3 참조)

> 권위 추천은 추천 필터칩에 노출. Discover 탐색 화면은 별도 정렬 기준 사용 (`MAP_LOCATION.md` §7 참조).

### 2-6. 버블 추천
**트리거**: 홈 식당 탭 → `추천` 필터칩 진입
**소스 태그**: 버블

버블 멤버가 높은 점수를 준 식당을 추천 탭에 혼합 노출:

> **집계 기준**: `bubble_items` 큐레이션 여부와 **무관하게** 활성 멤버의 `records` 기반으로 집계한다. `bubble_items`는 버블 상세(리스트 뷰)의 **큐레이션 목록 표시용**이며, 추천 점수 계산은 아래처럼 `records + bubble_members` JOIN으로 **별도** 수행한다. 두 경로를 혼동하지 말 것.

```sql
SELECT br.target_id, br.user_id, br.satisfaction, br.comment, u.nickname,
       b.visibility  -- 'public' | 'private'
FROM records br
JOIN bubble_members bm ON br.user_id = bm.user_id
JOIN bubbles b ON bm.bubble_id = b.id
JOIN users u ON br.user_id = u.id
WHERE bm.bubble_id IN (SELECT bubble_id FROM bubble_members WHERE user_id = :me)
  AND br.target_type = 'restaurant'
  AND br.satisfaction >= 80
  AND br.target_id NOT IN (SELECT target_id FROM records WHERE user_id = :me AND target_type = 'restaurant')
ORDER BY br.satisfaction DESC;
-- ※ bubble_items JOIN 없음 — 추천 집계는 records + bubble_members JOIN으로 충분
```

> **스키마 주의 (2026-04)**: `bubble_shares` 테이블은 `068_drop_bubble_shares.sql`로 제거됨. 버블별 아이템 노출은 `bubble_items` 테이블(`053_bubble_items.sql` 이후)의 순수 큐레이션 구조(`id, bubble_id, target_id, target_type, added_at`)로 처리한다. "누가 기록했는지"는 `records + bubble_members` JOIN으로 파악 — 규칙 상세는 `BUBBLE_SYSTEM.md` 참조.

> ※ 데이터 소스: 수동 `bubble_items` (use-share-record, 첫 회 +3 XP) + 필터 자동 동기화 (useBubbleAutoSync, XP 없음) 모두 포함. XP 정책은 XP_SYSTEM §4-4에 위임.

#### private 버블 처리
- `visibility = 'public'` → 소스 태그 `버블` + 멤버명 + 점수 표시
- `visibility = 'private'` → 소스 태그 `AI`로 표시 (버블 존재 자체를 비노출, `BUBBLE_SYSTEM.md` §6-3 참조)

### 2-7. 와인 페어링
**트리거**: 와인 기록 플로우(풍성화) 진입 시

와인 기록 시 WSET 기반 **8-카테고리 음식 페어링 그리드**를 AI가 자동 추천:

> **라벨 SSOT**: RECORD_SYSTEM §6 + `src/domain/entities/pairing.ts`. DB 값 `vegetable` ↔ 표시 라벨 `채소·곡물` (PRD §8의 "채소" 축약 표기는 잘못이며, 본 문서 및 `pairing.ts`의 `채소·곡물`을 SSOT로 삼는다).

| DB 값 | 카테고리 | 예시 |
|-------|----------|------|
| `red_meat` | 적색육 | 스테이크 · 양갈비 · 오리 · 사슴 |
| `white_meat` | 백색육 | 닭 · 돼지 · 송아지 · 토끼 |
| `seafood` | 어패류 | 생선 · 갑각류 · 조개 · 굴 · 초밥 |
| `cheese` | 치즈·유제품 | 숙성 · 블루 · 브리 · 크림소스 |
| `vegetable` | 채소·곡물 | 버섯 · 트러플 · 리조또 · 파스타 |
| `spicy` | 매운·발효 | 커리 · 마라 · 김치 · 된장 |
| `dessert` | 디저트·과일 | 다크초콜릿 · 타르트 · 건과일 |
| `charcuterie` | 샤퀴트리·견과 | 하몽 · 살라미 · 아몬드 · 올리브 |

```
와인 특성(바디, 산미, 당도 등) → WSET 페어링 규칙 → 카테고리 자동 선택(AI 추천) → 사용자 확인/수정
```

- 와인 상세 페이지에서는 저장된 페어링 정보를 **음식 페어링** 태그로 표시 (읽기 전용)
- 직접 입력 필드도 제공 (예: "트러플 리조또")

### 2-8. 지역 푸시
**트리거**: geofence 진입

내 높은 평가 + 내 1인 비공개 버블 `bubble_items` + 권위 추천 조합 (§2-4에 따라 찜 기반 거리 우선순위 조항은 제거됨 — `bookmarks` 테이블 DROP 이후 무효)

---

## 3. Phase 2 — CF (Collaborative Filtering) 알고리즘

### 3.1 CF가 필요한 이유

네이버/구글의 단순 평균은 **모든 유저의 점수를 동등하게 취급**한다. 10만 명의 평균은 "아무도의 취향"이며, 광고/악의적 점수가 섞여도 방어할 수 없다.

Nyam CF는 **나와 취향이 비슷한 사람의 점수에 더 큰 가중치**를 준다. 오염 유저는 나와 취향 패턴이 다르므로 적합도가 자연스럽게 낮아지고, 가중치가 자동 감소한다. **누가 오염인지 판별할 필요 없이** 시스템이 방어한다.

### 3.2 3-Tier 점수 체계

| 층위 | 이름 | 성격 | 스코프 | 표시 |
|------|------|------|--------|------|
| 1 | 내 점수 | 내가 직접 평가한 절대 점수 | 본인 기록 | 방문/시음한 곳 |
| 2 | Nyam 점수 | 전체 유저 CF 기반 개인화 예측 | 모든 공개 유저 | 항상 표시 (내 점수와 병행) |
| 3 | 버블 점수 | 버블 멤버로 스코프 한정한 CF | 가입한 버블 내 | 가입 시에만 |

- Nyam 점수는 **유저마다 다른 점수**가 나온다 (CF의 핵심)
- 버블 점수는 같은 식당이라도 **버블마다 다르다** (맥락 = 렌즈)

### 3.3 용어

| 용어 | 대상 | 의미 | 범위 |
|------|------|------|------|
| **적합도** (similarity) | 나 ↔ 특정 유저 | 취향 패턴 유사도 | 0~1 |
| **신뢰도** (confidence) | 나 ↔ 특정 유저 | 적합도의 정확성 (겹침 수 비례) | 0~1 |
| **예측 확신도** (prediction confidence) | 나 → 특정 식당/와인 | 이 예측을 얼마나 믿을 수 있나 | 0~1 |
| **관계 부스트** | 나 → 특정 유저 | 팔로우/맞팔에 의한 가중치 증폭 | ×1.0 또는 ×1.5 |

### 3.4 사분면 2D 좌표 기반

Nyam의 평가는 1D 점수가 아니라 **2D 사분면 좌표 (`axis_x`, `axis_y` ∈ [0, 100])**. 만족도 = `(axis_x + axis_y) / 2`. 상세 정의는 `RECORD_SYSTEM.md` 참조.

**식당 적합도와 와인 적합도는 별개 산출** — 식당 취향은 맞는데 와인 취향은 안 맞을 수 있다. `user_similarities.category` 컬럼(`'restaurant' | 'wine'`)으로 분리.

### 3.5 DB 스키마 (실제 구현)

`051_cf_tables.sql` 기준:

```sql
-- 유저 쌍별 적합도 캐시
CREATE TABLE user_similarities (
  user_a UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_b UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN ('restaurant', 'wine')),
  similarity REAL NOT NULL DEFAULT 0,    -- 0~1 (적합도)
  confidence REAL NOT NULL DEFAULT 0,    -- 0~1 (신뢰도, 다양성 보정 반영)
  n_overlap INT NOT NULL DEFAULT 0,      -- 겹치는 기록 수
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_a, user_b, category),
  CHECK (user_a < user_b)  -- 정규화: 작은 ID가 앞
);
CREATE INDEX idx_sim_user_a ON user_similarities(user_a, category);
CREATE INDEX idx_sim_user_b ON user_similarities(user_b, category);

-- 유저별 평균 점수 캐시 (mean-centering용)
CREATE TABLE user_score_means (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN ('restaurant', 'wine')),
  mean_x REAL NOT NULL DEFAULT 50,
  mean_y REAL NOT NULL DEFAULT 50,
  record_count INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, category)
);

-- RLS
ALTER TABLE user_similarities ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_score_means ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_similarities" ON user_similarities
  FOR SELECT USING (auth.uid() = user_a OR auth.uid() = user_b);
CREATE POLICY "read_means" ON user_score_means
  FOR SELECT USING (true);
-- 쓰기는 service_role (Edge Function)만
```

### 3.6 적합도 산출 공식

**실제 구현 기준** (`src/domain/services/cf-calculator.ts` + `supabase/functions/compute-similarity/index.ts`):

```
1. Mean-centering: 각 유저의 평균 (mean_x, mean_y)을 빼서 편향 제거
   (후한/박한 유저 보정)

2. 겹치는 아이템마다 2D 유클리드 거리 계산
   거리 = √((X_a_dev - X_b_dev)² + (Y_a_dev - Y_b_dev)²)
   (dev = 원좌표 − 해당 유저 평균)

3. 적합도(similarity) = max(0, 1 − avgDist / D)        (D = 60)

4. 기본 신뢰도 = n_overlap / (n_overlap + λ)           (λ = 7)

5. 다양성 보정 (Nyam 스코프만):
   nicheRatio = (니치 겹침 수) / (전체 겹침 수)
   니치 판별: 해당 아이템 기록자 수 ≤ 전체 유저 수 × 0.10
   confidence = 기본 신뢰도 × nicheRatio

6. user_similarities UPSERT (n_overlap < MIN_OVERLAP이면 DELETE)
```

> **공식 종류**: 2D 유클리드 거리 기반 — Pearson/Cosine이 아님. 사분면 좌표가 이미 2D이고 절대 위치의 차이를 포착해야 하므로 (Pearson은 상관관계만, Cosine은 방향만 비교) 유클리드가 선택됨. 시뮬레이션 `_archive/simulations/cf_comprehensive/` 참조.

> **개념문서 대비 차이**: `CF_SYSTEM.md`는 "Shrinkage Mean-centering" (μ̂ = (유저평균 × n + 전체평균 × λ) / (n + λ))을 기술하나, 실제 Edge Function (`compute-similarity/index.ts`의 `computeMean`)과 `cf-calculator.ts`의 `computeMeanCentered`는 **단순 평균**을 사용한다. Shrinkage는 아직 미구현. 이 문서는 **코드를 신뢰**한다.

> **MIN_OVERLAP 차이**: 개념문서는 `≥ 3`을 제시하나 실제 `cf-calculator.ts`의 상수는 `MIN_OVERLAP = 1`. Edge Function도 `n < 1`이면 삭제한다. 겹침 1만 있어도 일단 저장하여 초기 데이터 부족을 완화하는 전략.

### 3.7 적합도 산출 — Nyam vs 버블 (파라미터 분리)

`cf-calculator.ts`는 두 파라미터 셋을 export한다:

| 파라미터 | `NYAM_CF_PARAMS` (전체 유저) | `BUBBLE_CF_PARAMS` (버블 멤버) |
|----------|------------------------------|--------------------------------|
| `minOverlap` | 1 | 0 |
| `applyDiversityCorrection` (니치 보정) | true | **false** |
| `uniformBoost` (관계 부스트 균등) | false (팔로우=1.5, 없음=1.0) | **true** (전원 ×1.0) |
| `minRaters` (최소 기록자) | 3 | **1** |

**근거**: 버블 가입 자체가 "이 멤버들을 신뢰한다"는 의사 표시이므로 공격 방어 로직을 적용하지 않고 적은 데이터에서도 점수를 산출한다. 오염 방지는 버블 가입 정책(초대/승인제)과 `XP_SYSTEM`의 활동성 검증에 위임 — `BUBBLE_SYSTEM.md` 참조.

### 3.8 적합도(similarity) × 점수 가중 예측

```
가중치ᵢ = similarityᵢ × confidenceᵢ × boostᵢ
         (가중치 = 0에 가까우면 BASE_WEIGHT = 0.1 적용 — 겹침 없는 기록자도 약한 기여)

예측X = myMean.x + Σ(weightᵢ × deviationᵢ.x) / Σ|weightᵢ|
예측Y = myMean.y + Σ(weightᵢ × deviationᵢ.y) / Σ|weightᵢ|
예측 만족도 = (예측X + 예측Y) / 2

(예측값은 [0, 100] 범위로 클램프)
```

적합도 × 신뢰도 × 부스트 = **최종 가중치**. 가중치 절대값 상위 `TOP_K = 50`명만 참여. 위 공식 정확한 구현은 `cf-calculator.ts#computePrediction`.

### 3.9 예측 확신도 (prediction confidence)

```
확신도 = n_factor × 0.50 + agreement × 0.35 + quality × 0.15

  n_factor  = nRaters / (nRaters + λ)      (λ = 7)
  agreement = max(0, 1 − σ(가중 편차) / 2)
  quality   = avgWeight / (avgWeight + 0.3)
```

점수는 항상 보여주고, 확신도를 **%로 투명하게 표시**하여 유저가 직접 판단한다 (숨기지 않는다). 시뮬레이션 기준 확신 >= 0.5에서 MAE ≈ 3.8~4.2, < 0.3에서 4.3~9.7.

### 3.10 관계 부스트

| 관계 | 부스트 | 적용 |
|------|--------|------|
| 내가 팔로우 (맞팔 포함) | ×1.5 | Nyam 스코프 |
| 비팔로우 | ×1.0 | Nyam 스코프 |
| 버블 멤버 전원 | ×1.0 | 버블 스코프 (`uniformBoost`) |

맞팔 여부로 부스트를 나누지 않는다 — 팔로우는 "나는 이 사람의 취향을 신뢰한다"는 일방적 선언이며 상대의 팔로백 여부가 상대 점수의 유용성을 바꾸지 않는다. 부스트는 예측 시 `follows` 테이블에서 실시간 조회 (팔로우 변경 시 적합도 재계산 불필요).

### 3.11 이벤트 기반 증분 업데이트 (078 pg_net 트리거)

크론 전수 계산은 10만 명에서 ~2,500시간으로 불가능. 대신 `records` 변경 시 **자동 트리거 → Edge Function** 파이프라인:

```
[유저 A가 기록 INSERT/UPDATE/DELETE]
  │
  ├─ 동기: records 테이블 쓰기 (즉시 완료, 유저 대기 없음)
  │
  └─ 비동기 (pg_net → compute-similarity Edge Function):
      ├─ 1. user_score_means 갱신 (유저 A의 평균 재계산)
      ├─ 2. 해당 아이템의 다른 기록자 조회
      ├─ 3. 각 기록자와 유저 A의 적합도 재계산
      │     - 겹침 조회 → mean-centered deviation
      │     - 유클리드 거리 기반 similarity
      │     - 니치 비율 계산 → confidence 보정
      │     - user_similarities UPSERT (n_overlap < MIN_OVERLAP이면 DELETE)
      └─ 4. 완료
```

**실제 트리거 정의** (`078_cf_trigger_with_pg_net.sql` + `082_security_hardening.sql`):

| 이벤트 | 조건 | 동작 |
|--------|------|------|
| INSERT | `axis_x`/`axis_y` 둘 다 NOT NULL | `action = 'insert'` POST |
| UPDATE | `axis_x` 또는 `axis_y` 변경 | NULL로 바뀌면 `'delete'`, 그 외는 `'update'` |
| DELETE | `axis_x`, `axis_y` NOT NULL이었던 경우 | `'delete'` POST |

트리거 함수 `trg_notify_cf_update()`는 `SECURITY DEFINER`지만 RLS 우회 목적이 아니라 `pg_net.http_post` 실행 권한을 얻기 위한 용도 (단일 책임). 082_security_hardening에서 `current_setting('app.service_role_key', true)` + `app.supabase_url` GUC 패턴으로 전환 (키 회전 대응, 하드코딩 JWT 제거). GUC 미설정 시 CF 동기화 스킵.

### 3.12 Edge Function 구조

| Function | 호출 주체 | 인증 | 역할 |
|----------|----------|------|------|
| `compute-similarity` | DB trigger (pg_net) | service_role | 적합도 재계산 (쓰기) |
| `predict-score` (계획) | 클라이언트 | anon + JWT | 단건 예측 (식당/와인 상세) |
| `batch-predict` (계획) | 클라이언트 | anon + JWT | 피드 배치 예측 (최대 50건) |

**`compute-similarity` 구현 요약** (`supabase/functions/compute-similarity/index.ts`):

```
Input: { user_id, item_id, category, action: 'insert'|'update'|'delete' }

Step 1: updateUserScoreMean(user_id, category)
  → records에서 axis_x/axis_y 조회 → 평균 계산 → user_score_means UPSERT

Step 2: getOtherRatersForItem(item_id, category, excludeUserId)
  → 해당 아이템의 다른 기록자 UUID 목록

Step 3: for each otherUserId:
  recomputeSimilarity(userA, userB, category)
  ├─ 두 유저의 (target_id, axis_x, axis_y) 전부 조회
  ├─ 겹치는 target_id만 추출 → deviation 계산 (각자 평균 빼기)
  ├─ computeSimilarityFromDeviations → similarity + confidence + n_overlap
  ├─ 니치 비율 계산 (profiles.count + 겹침 아이템별 기록자 수)
  ├─ confidence ×= nicheRatio
  └─ user_similarities UPSERT (n_overlap < MIN_OVERLAP이면 DELETE)
```

속도 기준 (설계 목표): 일반 식당(기록자 20명) 0.1초, 인기 식당(500명) 2.2초, 극인기(5000명)는 비동기 큐 분산.

### 3.13 기록 수정/삭제 시

- **수정**: 좌표가 바뀌면 INSERT와 동일 경로 (재계산)
- **좌표가 NULL → 값**: INSERT로 취급
- **좌표가 값 → NULL**: DELETE로 취급 (겹침 -1, n_overlap < MIN_OVERLAP이면 행 삭제)
- **DELETE**: 해당 아이템 기록자와 적합도 재계산

---

## 4. CF 시뮬레이션 결과 요약

**출처**: `_archive/simulations/cf_comprehensive/RESULTS.md` (10,000명 × 1,000식당 시뮬레이션).

### 4.1 예측 정확도 (MAE, 100점 만점)

| 그룹 | CF (10,000명) | 단순 평균 | 개선율 |
|------|---------------|-----------|--------|
| 헤비 (기록 200+) | **3.6** | 6.6 | 45% ↑ |
| 활성 (50~200) | **4.0** | 6.3 | 37% ↑ |
| 일반 (10~50) | **4.3** | 7.1 | 39% ↑ |
| 라이트 (2~5) | 5.9 | 5.5 | -7% (열위) |
| 신규 (0~2) | N/A | N/A | 측정 불가 |

**핵심**: 헤비/활성/일반에서 CF가 단순 평균 대비 37~45% 개선. 라이트 유저는 CF가 오히려 불리 (겹침 부족). 신규 유저는 예측 불가 → **온보딩에서 최소 3개 기록 강력 유도**.

### 4.2 의미있는 경험률 (확신도 ≥ 0.3)

| 유저 수 | 헤비 | 활성 | 일반 | 라이트 |
|---------|------|------|------|--------|
| 100명 | 94% | 96% | 92% | N/A |
| 500명 | 98% | 99% | 99% | 70% |
| 1,000명 | 99% | 99% | 100% | 92% |
| 3,000명+ | 100% | 100% | 100% | 100% |

**100명만 있어도** 헤비/활성/일반 유저의 92%+가 의미있는 점수를 본다. 출시 전략: 초기에 얼리어답터 100~500명 확보.

### 4.3 공격 방어 (niche diversity correction)

`_archive/simulations/cf_diversity_simulation.py`, `cf_rarity_simulation.py` 기반:

- 프랜차이즈 대량 리뷰 후 타겟 조작 공격: **기본 CF 부풀림 +57**, 다양성 보정 적용 후 +57 (비슷한 수준)
- 핵심 깨달음: 다양성 보정은 공격자를 걸러내지만, **D/E등급(기록자 5명 이하) 식당은 어떤 알고리즘도 방어 불가**
- 추가 방어: 기록자 수 하한 + 확신도 투명 공개 + 시간 기반 감쇠 (미구현)

### 4.4 다양성/희귀도 고려

- **니치 판별**: 기록자 ≤ 전체 유저의 10% → 적합도 가중치 ↑ (프랜차이즈만 겹친 오염 유저의 영향 감소)
- **겹침 최소 필터**: n_overlap ≥ MIN_OVERLAP (현행 1) → 노이즈 제거
- **Top-K**: 가중치 상위 50명만 → 정확도 손실 0, 속도 개선

---

## 5. 클린 아키텍처 매핑 (실제 구현)

```
domain/
  entities/similarity.ts           ← ScorePoint, SimilarityResult, PredictionResult, RaterInput
  repositories/
    similarity-repository.ts       ← SimilarityRepository, UserScoreMean, BubbleSimilarityResult
    prediction-repository.ts       ← PredictionRepository, PredictionWithBreakdown
  services/
    cf-calculator.ts               ← 순수 함수: computeMeanCentered, computeSimilarity,
                                     computePrediction, computePredictionConfidence,
                                     computeNicheRatio, filterByMinOverlap, selectTopK
                                     + NYAM_CF_PARAMS / BUBBLE_CF_PARAMS

infrastructure/
  repositories/
    supabase-similarity-repository.ts   ← user_similarities / user_score_means CRUD
    supabase-prediction-repository.ts   ← Edge Function 호출 래퍼 (predict-score, batch-predict)

supabase/functions/compute-similarity/index.ts  ← 적합도 재계산 (service_role)
supabase/migrations/051_cf_tables.sql           ← 스키마
supabase/migrations/078_cf_trigger_with_pg_net.sql ← 트리거

application/hooks/
  use-nyam-score.ts             ← 상세 페이지 Nyam 점수
  use-feed-scores.ts            ← 피드 배치 예측
  use-similarity.ts             ← 두 유저 간 적합도
  use-bubble-similarity.ts      ← 버블 단위 적합도 집계
  use-follow-list-with-similarity.ts  ← 팔로우 목록 + 적합도

presentation/ (개념문서 §8 참조)
  components/detail/
    score-cards.tsx             ← 내 점수 / Nyam / 버블 3카드
    score-breakdown-panel.tsx   ← 점수 근거 펼침 (기여자 목록)
    bubble-expand-panel.tsx     ← 버블별 CF 점수 펼침
    confidence-badge.tsx        ← 확신도 % 표시
    similarity-indicator.tsx    ← 적합도 % (프로필/팔로우)
```

---

## 6. 추천 품질 원칙

### 6.1 이기적 동기 존중
- 추천은 `추천` 필터칩에만 노출 — 내 기록 뷰를 침범하지 않는다
- 추천 카드 무시 가능 — 좋아요/싫어요 버튼 강요 없음
- 점수는 항상 보여주고 확신도를 %로 투명하게 공개 (숨기지 않음)
- "내 점수 ≠ Nyam 점수"는 설명하지 않는다 — 차이 자체가 정보

### 6.2 데이터 오염 방지
- **버블 가입 = 신뢰 의사 표시**: 버블 스코프 CF는 니치 보정 미적용, `uniformBoost` 적용 (멤버 간 차등 없음)
- **공격 방어**: Nyam 스코프는 니치 다양성 보정 적용 (프랜차이즈 공격 완화)
- **기록자 수 공개**: "N명 평가" 항상 표시 → 유저가 데이터 부족 여부 직접 판단
- **private 버블 보호**: `visibility = 'private'` 버블의 기록은 `AI` 소스 태그로 바꿔 노출 (버블 존재 자체를 비노출)
- **SECURITY DEFINER 최소화**: CF 트리거 함수만 사용 (pg_net 실행 권한 목적). 쓰기는 service_role Edge Function만.

---

## 7. 콜드스타트 해소 기준

| 유형 | 최소 | 충분 |
|------|------|------|
| 재방문 | 5개 | 20개 |
| 상황별 | 상황 2종, 각 3개 | 각 10개 |
| 와인 페어링 | 3개 | 10개 |
| 버블 추천 | 가입 버블 1개, 멤버 기록 5+ | 버블 3+, 기록 30+ |
| CF Nyam 점수 | 전체 100+, 개인 3+ | 전체 500+, 개인 20+ |
| CF 버블 점수 | 버블 멤버 1명 기록 | 멤버 3명+ 기록 |

시뮬레이션 기준 100명에서도 헤비/활성/일반 유저 92%+가 의미있는 경험. **신규 유저(기록 < 3개)는 예측 자체가 불가** — 온보딩에서 최소 3개 기록 강제 유도 필수.

---

## 8. API 구조

### Phase 1 규칙 기반 — 별도 REST API 없음
Phase 1 추천(§2)은 전용 `/api/recommend/*` 엔드포인트 없이, 홈 컨테이너가 `추천` 필터칩 상태에서 §2의 SQL 쿼리를 직접 실행하여 결과를 병합한다 (재방문 + 권위 + 버블을 추천순 정렬). 상황 필터/사분면 필터는 WHERE 절로 누적 적용한다. 와인 페어링(§2-7)은 와인 기록 풍성화 플로우 내부에서 AI 추천으로 처리되며 별도 엔드포인트가 아니다.

### Phase 2 CF (Edge Functions)
```
supabase/functions/compute-similarity  — 적합도 재계산 (DB 트리거 전용)
supabase/functions/predict-score       — 단건 예측 (계획)
supabase/functions/batch-predict       — 피드 배치 예측, 최대 50건 (계획)
```

### 추천순 정렬 기준

각 추천 타입별 점수를 정규화(0~100)한 뒤 병합 정렬:

```
추천 점수 = 타입별_관련도_점수 (0~100)
  - 재방문: §2-1 ORDER BY 공식 결과 정규화
  - 권위: 외부 평점 평균 정규화 + 뱃지 가산
  - 버블: 멤버 만족도 × (1 + log(평가 멤버 수))
  - CF (Phase 2): Nyam 예측 만족도 × 예측 확신도
```

동점 시 최신 데이터 우선. 기본 정렬은 "추천순"이며, 소팅 버튼으로 최신순/권위순/별점순 등으로 전환 가능 (HOME.md §3-3 정렬 행 참조).

---

## 9. Phase 3: ML Hybrid (미래)

```
최종 점수 = α×Content + β×CF + γ×Context + δ×Social
가중치 동적: 기록<10 → α높음, 기록50+ → β,δ높음
```

Phase 2 CF 운영 데이터 누적 후 재평가.

### 와인 추천 (검토 중)
와인 탭에 `추천` 필터칩 추가 여부 — 후보:
- 품종 유사도 기반 추천
- 버블 와인 추천
- 음식 페어링 역매칭 (식당 기록 → 어울리는 와인)

---

## 10. 추천 타입 요약

| # | 타입 | Phase | 소스 태그 | 노출 위치 |
|---|------|-------|-----------|-----------|
| 1 | 재방문 | P1 | AI | 추천 필터칩 |
| 2 | 상황별 | P1 | AI | 추천 필터칩 + 상황 필터 |
| 3 | 사분면 유사 | P1 | AI | 추천 필터칩 + 사분면 필터 |
| 4 | 권위 | P1 | AI + 웹 | 추천 필터칩 (콜드스타트) |
| 5 | 버블 | P1 | 버블 | 추천 필터칩 |
| 6 | 와인 페어링 | P1 | AI | 와인 기록 풍성화 |
| 7 | 지역 푸시 | P1 | 혼합 | 푸시 알림 |
| 8 | CF Nyam 점수 | P2 | — (점수) | 식당/와인 상세 score-cards |
| 9 | CF 버블 점수 | P2 | — (점수) | 식당/와인 상세 bubble-expand-panel |
| 10 | 프로필 적합도 | P2 | — (뱃지) | 버블러 프로필, 팔로우 목록 |

---

## 11. 품질 지표

| 지표 | 목표 |
|------|------|
| CTR (추천 카드 → 상세 진입) | > 15% |
| 추천 → 기록 전환 | > 5% |
| 추천 → 버블 큐레이션 추가 | > 10% |
| 추천 기반 방문 만족도 | >= 80 |
| CF MAE (일반 유저, 10K명 기준) | < 5 (시뮬 검증: 4.3) |
| CF 의미있는 경험률 (확신 ≥ 0.3) | > 90% |
| CF Edge Function p95 | 단건 < 20ms, 배치(50건) < 400ms |

---

## 12. 확정 파라미터 (시뮬레이션 검증)

### Nyam 스코프 (`NYAM_CF_PARAMS`)

| 파라미터 | 값 | 근거 |
|----------|-----|------|
| D (거리 정규화) | 60 | 클러스터 분리 p<0.005, MAE 최적 |
| λ (신뢰도 감쇠) | 7 | 겹침 7개에서 conf 0.5 |
| MIN_OVERLAP | 1 | 코드 기준 (개념문서는 3 제안) |
| TOP_K | 50 | 정확도 손실 0 |
| BASE_WEIGHT | 0.1 | 겹침 0인 기록자 약한 기여 |
| 관계 부스트 | 팔로우 1.5 / 비팔로우 1.0 | 일방적 신뢰 선언 |
| 니치 판별 | 기록자 ≤ 전체 유저 × 0.10 | 시뮬 검증 |
| 다양성 보정 | 적용 | 프랜차이즈 공격 방어 |

### 버블 스코프 (`BUBBLE_CF_PARAMS`)

| 파라미터 | 값 | 근거 |
|----------|-----|------|
| minOverlap | 0 | 신뢰 그룹 — 겹침 요건 불필요 |
| minRaters | 1 | 멤버 1명 기록도 유효 |
| uniformBoost | true (×1.0) | 멤버 간 차등 없음 |
| 다양성 보정 | 미적용 | 가입 자체가 신뢰 표시 |
| 산출 방식 | 1명 → 그대로, 2명+ → CF | 적은 데이터에서도 점수 산출 |

### 확신도 가중치

| 요소 | 가중 | 의미 |
|------|------|------|
| n_factor | 0.50 | 평가자 수 충분성 |
| agreement | 0.35 | 가중 편차 표준편차 (합의도) |
| quality | 0.15 | 평균 가중치 (적합도 품질) |

---

## 13. 참조

| 문서/경로 | 내용 |
|----------|------|
| `development_docs/systems/DATA_MODEL.md` | records, bubble_members, follows 스키마 |
| `development_docs/systems/BUBBLE_SYSTEM.md` | 버블 visibility, bubble_items 큐레이션 |
| `development_docs/systems/RECORD_SYSTEM.md` | 사분면 axis_x/y, 만족도 공식 |
| `development_docs/systems/XP_SYSTEM.md` | 콜드스타트 유저 활동성, prestige 경로 (§18-3) |
| `development_docs/systems/SOCIAL_SYSTEM.md` | 팔로우 부스트(§3.10) `follows.status='accepted'` 실시간 조회 |
| `development_docs/systems/MAP_LOCATION.md` | Discover 정렬(§7), 지역 푸시 geofence 좌표 |
| `supabase/migrations/051_cf_tables.sql` | user_similarities, user_score_means |
| `supabase/migrations/078_cf_trigger_with_pg_net.sql` | pg_net 비동기 트리거 (초기 구현) |
| `supabase/migrations/082_security_hardening.sql` | 트리거 함수 GUC 전환(`app.service_role_key`/`app.supabase_url`), action 소문자화, search_path 잠금 |
| `supabase/functions/compute-similarity/index.ts` | 적합도 재계산 Edge Function |
| `src/domain/services/cf-calculator.ts` | 순수 CF 계산 (SSOT 코드) |
| `src/domain/entities/similarity.ts` | CF 도메인 엔티티 |
| `_archive/simulations/cf_comprehensive/` | 10K명 종합 시뮬레이션 |
| `_archive/simulations/cf_diversity_simulation.py` | 니치 다양성 보정 검증 |
| `_archive/simulations/cf_rarity_simulation.py` | 희소성 가중치 공격 방어 |
| `_archive/개념문서_원본/CF_SYSTEM.md` | CF 개념문서 원본 (일부 코드와 불일치 — 코드 우선) |
