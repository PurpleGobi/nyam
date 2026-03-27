# 07: 추천 알고리즘 (7종)

> 홈 식당 탭 추천 필터칩에 노출되는 7종 추천 알고리즘 (재방문, 상황별, 사분면, 찜, 권위, 버블, 와인 페어링) 구현

---

## SSOT 출처

| 문서 | 섹션 |
|------|------|
| `systems/RECOMMENDATION.md` | §2 Phase 1 추천 전체 (2-1 ~ 2-8), §5 콜드스타트, §6 API, 추천순 정렬 |
| `pages/06_HOME.md` | §3-2-3 추천 서브탭, §3-2 추천 칩 카운트 |
| `systems/DATA_MODEL.md` | §5-2 ai_recommendations 테이블, records, wishlists, bubbles, bubble_members |
| `prototype/01_home.html` | 추천 카드 (AI/버블/웹 소스 태그) |

---

## 선행 조건

- S2: records 테이블 (satisfaction, scene, axis_x, axis_y, target_type, visit_date)
- S4: restaurants 테이블 (michelin_stars, has_blue_ribbon, naver_rating, kakao_rating, google_rating)
- S4: wishlists 테이블
- S5-02: SavedFilterChips (추천 칩)
- S7: bubbles, bubble_members (버블 추천) — S7 미완 시 버블 추천 스킵

---

## 구현 범위

### 파일 목록

```
src/domain/entities/recommendation.ts                         ← AIRecommendation 엔티티
src/domain/services/recommendation-service.ts                 ← 추천 점수 계산 + 병합 정렬
src/domain/repositories/recommendation-repository.ts          ← RecommendationRepository 인터페이스
src/infrastructure/repositories/supabase-recommendation-repository.ts ← Supabase 구현
src/application/hooks/use-recommendations.ts                  ← 추천 데이터 조회 + 통합
src/presentation/components/home/recommendation-card.tsx      ← 추천 카드 UI
src/presentation/components/home/recommendation-source-tag.tsx ← 소스 태그 (AI/버블/웹)
src/app/api/recommend/revisit/route.ts                        ← 재방문 추천 API
src/app/api/recommend/scene/route.ts                          ← 상황별 추천 API
src/app/api/recommend/authority/route.ts                      ← 권위 추천 API
src/app/api/recommend/bubble/route.ts                         ← 버블 추천 API
src/app/api/recommend/wine-pairing/route.ts                   ← 와인 페어링 API
```

### 스코프 외

- Phase 2 소셜 추천 (취향 유사도 CF)
- Phase 3 ML Hybrid
- 지역 푸시 (geofence 기반, Phase 2)
- 와인 탭 추천 (Phase 2 검토)

---

## 상세 구현 지침

### 1. AIRecommendation 엔티티

```typescript
// src/domain/entities/recommendation.ts

type RecommendationAlgorithm = 'revisit' | 'scene' | 'quadrant' | 'bookmark' | 'authority' | 'bubble' | 'wine_pairing';
type RecommendationSource = 'ai' | 'bubble' | 'web';

interface AIRecommendation {
  id: string;
  userId: string;
  targetId: string;                  // restaurant_id 또는 wine_id
  targetType: 'restaurant' | 'wine';
  reason: string;                    // AI 추천 사유 텍스트
  algorithm: RecommendationAlgorithm;
  confidence: number;                // 0.00 ~ 1.00
  isDismissed: boolean;
  createdAt: string;
  expiresAt: string | null;
}

interface RecommendationCard {
  targetId: string;
  targetType: 'restaurant' | 'wine';
  source: RecommendationSource;
  algorithm: RecommendationAlgorithm;
  normalizedScore: number;           // 0~100 (병합 정렬용)
  reason: string;
  // 식당 정보 (JOIN)
  restaurant?: {
    name: string;
    genre: string;
    area: string;
    photoUrl: string | null;
    michelinStars: number | null;
    hasBlueRibbon: boolean;
    naverRating: number | null;
    kakaoRating: number | null;
    googleRating: number | null;
  };
  // 버블 추천 전용
  bubbleMember?: {
    nickname: string;
    satisfaction: number;
    comment: string | null;
  };
}
```

### 2. RecommendationService (추천 점수 계산)

```typescript
// src/domain/services/recommendation-service.ts

class RecommendationService {

  /** 2-1. 재방문 추천 점수 계산 */
  static calcRevisitScore(params: {
    avgSatisfaction: number;    // AVG(satisfaction) — satisfaction >= 80 필터 후
    daysSinceLastVisit: number; // NOW() - MAX(created_at) 일수
    visitCount: number;         // COUNT(*)
  }): number {
    // 60% 내 평가 + 30% 오래 안 감 + 10% 재방문 보너스
    const ratingScore = params.avgSatisfaction * 0.6;
    const recencyScore = Math.min(params.daysSinceLastVisit * 0.002 * 100, 100) * 0.3;
    const revisitBonus = Math.min(params.visitCount, 5) * 4 * 0.1;
    return ratingScore + recencyScore + revisitBonus;
  }

  /** 2-4. 찜 리마인드 정렬 점수 (지역 푸시용) */
  static calcBookmarkScore(params: {
    distanceKm: number;
    daysSinceBookmark: number;
  }): number {
    // proximity 60% + age 40%
    const proximity = (1 / (params.distanceKm + 1)) * 0.6;
    const age = (params.daysSinceBookmark * 0.01) * 0.4;
    return (proximity + age) * 100;
  }

  /** 추천 병합 정렬 — 각 타입별 점수 정규화 후 합산 */
  static mergeRecommendations(
    revisits: RecommendationCard[],
    authorities: RecommendationCard[],
    bubbles: RecommendationCard[]
  ): RecommendationCard[] {
    // 1. 각 타입별 normalizedScore 이미 0~100
    const all = [...revisits, ...authorities, ...bubbles];
    // 2. normalizedScore 내림차순 정렬
    // 3. 동점 시 최신 데이터 우선 (createdAt DESC)
    return all.sort((a, b) => {
      if (b.normalizedScore !== a.normalizedScore) {
        return b.normalizedScore - a.normalizedScore;
      }
      return 0; // 동점 시 createdAt 비교는 repository에서 처리
    });
  }

  /**
   * 권위 추천 정규화 점수
   * 외부 평점 평균 정규화 + 뱃지 가산
   */
  static calcAuthorityScore(params: {
    naverRating: number | null;
    kakaoRating: number | null;
    googleRating: number | null;
    michelinStars: number | null;
    hasBlueRibbon: boolean;
  }): number {
    const ratings = [params.naverRating, params.kakaoRating, params.googleRating]
      .filter((r): r is number => r !== null);
    if (ratings.length === 0) return 0;
    // 외부 평점 5점 만점 → 100점 정규화
    const avgRating = ratings.reduce((a, b) => a + b, 0) / ratings.length;
    const ratingScore = (avgRating / 5) * 100;
    // 뱃지 가산: 미슐랭 1성=+5, 2성=+10, 3성=+15, 블루리본=+5
    let badgeBonus = 0;
    if (params.michelinStars) badgeBonus += params.michelinStars * 5;
    if (params.hasBlueRibbon) badgeBonus += 5;
    return Math.min(ratingScore + badgeBonus, 100);
  }

  /**
   * 버블 추천 정규화 점수
   * 멤버 만족도 * (1 + log(평가 멤버 수))
   */
  static calcBubbleScore(params: {
    memberSatisfaction: number;
    ratingMemberCount: number;
  }): number {
    return Math.min(
      params.memberSatisfaction * (1 + Math.log10(Math.max(params.ratingMemberCount, 1))),
      100
    );
  }
}
```

### 3. RecommendationRepository 인터페이스

```typescript
// src/domain/repositories/recommendation-repository.ts

interface RecommendationRepository {
  /** 재방문 추천 (satisfaction >= 80, 그룹핑) */
  getRevisitCandidates(userId: string, limit: number): Promise<RevisitCandidate[]>;

  /** 상황별 추천 (scene 필터, satisfaction >= 75) */
  getSceneCandidates(userId: string, scene: string, limit: number): Promise<SceneCandidate[]>;

  /** 사분면 필터 */
  getQuadrantCandidates(userId: string, params: {
    scene?: string;
    axisXMin: number;
    axisXMax: number;
    axisYMin: number;
    axisYMax: number;
    minSatisfaction: number;
  }, limit: number): Promise<QuadrantCandidate[]>;

  /** 권위 추천 (미슐랭/블루리본 + 외부 평점 상위) */
  getAuthorityCandidates(area: string | null, limit: number): Promise<AuthorityCandidate[]>;

  /** 버블 추천 (멤버 기록 satisfaction >= 80, 내 방문 제외) */
  getBubbleCandidates(userId: string, limit: number): Promise<BubbleCandidate[]>;

  /** 와인 페어링 (WSET 카테고리 기반) */
  getWinePairingCandidates(wineId: string): Promise<PairingCandidate[]>;

  /** AI 추천 저장 */
  saveRecommendation(rec: Omit<AIRecommendation, 'id' | 'createdAt'>): Promise<void>;

  /** 추천 무시 */
  dismissRecommendation(id: string): Promise<void>;
}
```

### 4. API Routes

#### `/api/recommend/revisit`

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
  (AVG(r.satisfaction) * 0.6)
  + (EXTRACT(DAY FROM NOW() - MAX(r.created_at)) * 0.002 * 100) * 0.3
  + (LEAST(COUNT(*), 5) * 4) * 0.1
  DESC
LIMIT 10;
```

#### `/api/recommend/scene`

```sql
SELECT r.target_id, AVG(r.satisfaction) as avg_score
FROM records r
WHERE r.user_id = :user
  AND r.target_type = 'restaurant'
  AND r.scene = :selected_scene
  AND r.satisfaction >= 75
GROUP BY r.target_id
ORDER BY avg_score DESC
LIMIT 10;
```

사분면 필터 추가 조건:
```sql
AND r.axis_x >= :axis_x_min AND r.axis_x <= :axis_x_max
AND r.axis_y >= :axis_y_min AND r.axis_y <= :axis_y_max
AND r.satisfaction >= :min_satisfaction
```

#### `/api/recommend/authority`

```sql
SELECT r.*
FROM restaurants r
WHERE (r.michelin_stars IS NOT NULL OR r.has_blue_ribbon = true
       OR (r.naver_rating >= 4.3 AND r.kakao_rating >= 4.0 AND r.google_rating >= 4.2))
  AND (:area IS NULL OR r.area = :area)
ORDER BY
  CASE WHEN r.michelin_stars IS NOT NULL THEN 1
       WHEN r.has_blue_ribbon THEN 2
       ELSE 3 END,
  COALESCE(r.naver_rating, 0) + COALESCE(r.kakao_rating, 0) + COALESCE(r.google_rating, 0) DESC
LIMIT 10;
```

#### `/api/recommend/bubble`

```sql
SELECT br.target_id, br.user_id, br.satisfaction, br.comment, u.nickname,
       b.visibility
FROM records br
JOIN bubble_members bm ON br.user_id = bm.user_id
JOIN bubbles b ON bm.bubble_id = b.id
JOIN users u ON br.user_id = u.id
WHERE bm.bubble_id IN (SELECT bubble_id FROM bubble_members WHERE user_id = :me AND status = 'active')
  AND br.target_type = 'restaurant'
  AND br.satisfaction >= 80
  AND br.target_id NOT IN (SELECT target_id FROM records WHERE user_id = :me AND target_type = 'restaurant')
ORDER BY br.satisfaction DESC
LIMIT 10;
```

**private 버블 처리**:
- `visibility = 'public'` → source: 'bubble', 멤버명 + 점수 표시
- `visibility = 'private'` → source: 'ai', 버블 존재 자체 비노출

#### `/api/recommend/wine-pairing`

WSET 8-카테고리 그리드:

| 카테고리 key | 한글 | 예시 음식 |
|-------------|------|----------|
| `red_meat` | 적색육 | 스테이크 · 양갈비 · 오리 · 사슴 |
| `white_meat` | 백색육 | 닭 · 돼지 · 송아지 · 토끼 |
| `seafood` | 어패류 | 생선 · 갑각류 · 조개 · 굴 · 초밥 |
| `cheese` | 치즈·유제품 | 숙성 · 블루 · 브리 · 크림소스 |
| `vegetable` | 채소·곡물 | 버섯 · 트러플 · 리조또 · 파스타 |
| `spicy` | 매운·발효 | 커리 · 마라 · 김치 · 된장 |
| `dessert` | 디저트·과일 | 다크초콜릿 · 타르트 · 건과일 |
| `charcuterie` | 샤퀴트리·견과 | 하몽 · 살라미 · 아몬드 · 올리브 |

- 와인 특성(바디, 산미, 당도) → WSET 규칙으로 카테고리 자동 선택
- records.pairing_categories에 저장
- 와인 상세 페이지에서 읽기 전용 태그 표시

### 5. 콜드스타트 임계값

| 추천 타입 | 최소 (노출 시작) | 충분 (정상 작동) |
|----------|-----------------|-----------------|
| 재방문 | 기록 5개 | 기록 20개 |
| 상황별 | 상황 2종, 각 3개 | 각 10개 |
| 버블 | 가입 버블 1개, 멤버 기록 5+ | 버블 3+, 기록 30+ |

- `기록 < 5개` → 권위 추천만 노출 (콜드스타트 모드)
- `기록 5~19개` → 재방문 + 권위 + 버블
- `기록 20+` → 전체 7종

### 6. 추천순 정렬 (병합)

```
추천 필터칩 진입 시:
1. revisit API → normalizedScore (§2-1 ORDER BY 공식 정규화)
2. authority API → normalizedScore (외부 평점 평균 정규화 + 뱃지 가산)
3. bubble API → normalizedScore (멤버 만족도 * (1 + log(평가 멤버 수)))
4. RecommendationService.mergeRecommendations() → 통합 리스트
5. 동점 시 최신 데이터 우선
```

캐싱: 30분 TTL, 위치 변경 시 무효화.

### 7. RecommendationCard 컴포넌트

```typescript
interface RecommendationCardProps {
  card: RecommendationCard;
  onClick: () => void;
}
```

- 기본 구조: RecordCard (03_view_modes.md)와 동일 레이아웃
- 추가 요소: 소스 태그 (AI/버블/웹) + 추천 사유 텍스트
- 미방문 추천: 점수는 `not-mine` 스타일 (`--text-hint`)
- 재방문 추천: 내 점수(accent 색상) 표시
- AI 카드: 개인화 메시지 필수 (reason 필드)
- 인게이지먼트: ♡ + 💬 표시

### 8. RecommendationSourceTag 컴포넌트

```typescript
interface RecommendationSourceTagProps {
  source: RecommendationSource;
  children: React.ReactNode;
}
```

| 소스 | 배경 | 텍스트 색 | 예시 |
|------|------|----------|------|
| `ai` | `rgba(126,174,139,0.15)` | `--positive` (#7EAE8B) | "오마카세를 좋아하시니까 여기도 좋아하실 거예요" |
| `bubble` | `rgba(122,155,174,0.15)` | `--accent-social` (#7A9BAE) | "**박소연** 91 · 을지로 프렌치 최고" |
| `web` | `var(--bg-page)` | `--text-hint` (#B5AFA8) | "N4.4 K4.2 G4.3" |

### 9. useRecommendations 훅

```typescript
// src/application/hooks/use-recommendations.ts

function useRecommendations(): {
  cards: RecommendationCard[];
  isLoading: boolean;
  totalCount: number;
  coldStartMode: boolean;
  dismiss: (id: string) => Promise<void>;
}
```

- 진입 시 revisit + authority + bubble 병렬 호출
- `mergeRecommendations()`으로 병합
- `totalCount`: 추천 칩 카운트용 (찜 리마인드 제외, 와인 페어링/지역 푸시 제외)
- `coldStartMode`: 기록 < 5개 시 true → 권위 추천만

---

## 목업 매핑

| 목업 요소 | 컴포넌트 |
|-----------|----------|
| `prototype/01_home.html` 추천 서브탭 카드 | `RecommendationCard` |
| `prototype/01_home.html` AI 태그 | `RecommendationSourceTag source="ai"` |
| `prototype/01_home.html` 버블 태그 | `RecommendationSourceTag source="bubble"` |
| `prototype/01_home.html` 웹 태그 | `RecommendationSourceTag source="web"` |

---

## 데이터 흐름

```
[추천 칩 탭] → useRecommendations()
  → 병렬 API 호출:
    /api/recommend/revisit   → RevisitCandidate[] → normalizedScore
    /api/recommend/authority  → AuthorityCandidate[] → normalizedScore
    /api/recommend/bubble     → BubbleCandidate[] → normalizedScore
  → mergeRecommendations() → RecommendationCard[]
  → RecommendationCard × N (추천순 정렬)

[콜드스타트 < 5개] → authority만 호출 → 소스: AI + 웹

[상황 필터 추가] → /api/recommend/scene?scene=romantic → SceneCandidate[]

[버블 private] → source='ai'로 변환, 버블 존재 비노출

[카드 탭] → router.push(`/restaurants/${targetId}`)
```

---

## 검증 체크리스트

```
□ 재방문: satisfaction >= 80 필터, 공식 (0.6 rating + 0.3 recency + 0.1 revisit)
□ 상황별: scene 필터, satisfaction >= 75
□ 사분면: axis_x/y 범위 + scene + satisfaction 복합 필터
□ 찜: 기본 저장순, 지역 푸시 시 proximity 0.6 + age 0.4
□ 권위: 미슐랭/블루리본 우선 → 외부 평점 상위 → Nyam 전체 평균
□ 버블: satisfaction >= 80, 내 방문 제외, private → AI 태그
□ 와인 페어링: WSET 8-카테고리 매핑 정확
□ 콜드스타트: < 5개 권위만, 5~19개 재방문+권위+버블, 20+ 전체
□ 병합 정렬: normalizedScore DESC, 동점 시 최신 우선
□ AI 태그: rgba(126,174,139,0.15) 배경, --positive 텍스트
□ 버블 태그: rgba(122,155,174,0.15) 배경, --accent-social 텍스트
□ 웹 태그: --bg-page 배경, --text-hint 텍스트
□ 미방문 카드: 점수 --text-hint (not-mine)
□ 캐싱: 30분 TTL
□ API: /api/recommend/revisit, /scene, /authority, /bubble, /wine-pairing 모두 작동
□ R1~R5 위반 없음 (RecommendationService → domain/services, 순수)
□ pnpm build 에러 없음
□ pnpm lint 경고 0개
```
