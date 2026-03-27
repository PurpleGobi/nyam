# 08: Discover 서브스크린

> 홈 내부 서브 스크린으로 구현되는 지역 기반 식당 탐색 화면 (Discover)

---

## SSOT 출처

| 문서 | 섹션 |
|------|------|
| `pages/07_DISCOVER.md` | §1~13 전체 (화면 역할, 헤더, 지역 칩, 카드, 정렬, API, 빈 상태, 인터랙션, 구현 순서, 타입 정의) |
| `systems/RECOMMENDATION.md` | §2-5 권위 추천과의 관계 (Discover는 추천 아님, 지역 기반 탐색) |
| `prototype/01_home.html` | `screen-discover` |

---

## 선행 조건

- S1: 디자인 토큰, 인증
- S4: restaurants 테이블 (area, genre, naver_rating, kakao_rating, google_rating, michelin_stars, has_blue_ribbon, photos, nyam_score)
- S5-01: AppHeader (Discover는 자체 헤더 사용, 앱 공통 헤더 없음)

---

## 구현 범위

### 파일 목록

```
src/domain/entities/discover.ts                              ← DiscoverCard, DiscoverFilter 타입
src/domain/services/composite-score.ts                       ← 복합 점수 계산 서비스
src/domain/repositories/discover-repository.ts               ← DiscoverRepository 인터페이스
src/infrastructure/repositories/supabase-discover-repository.ts ← Supabase 구현
src/application/hooks/use-discover.ts                        ← 지역 필터 + 데이터 + 무한 스크롤
src/presentation/components/discover/discover-card.tsx       ← Discover 카드
src/presentation/components/discover/area-chips.tsx          ← 지역 칩 (가로 스크롤)
src/presentation/components/discover/discover-search-bar.tsx ← 검색바 (Phase 1 placeholder만)
src/presentation/containers/discover-container.tsx           ← Discover 전체 컨테이너
src/app/(main)/discover/page.tsx                             ← 라우트 (또는 홈 서브 뷰)
src/app/api/discover/list/route.ts                           ← 지역별 식당 목록 API
```

### 스코프 외

- 검색바 실제 검색 연동 (Phase 2 — Phase 1은 placeholder만)
- 와인 탭 Discover (Phase 2 검토)
- 취향 유사 추천 CF (Phase 2)

---

## 상세 구현 지침

### 1. DiscoverCard 엔티티

```typescript
// src/domain/entities/discover.ts

interface DiscoverCard {
  id: string;                          // restaurants.id
  name: string;
  genre: string;
  area: string;
  specialty: string | null;            // 메타 세 번째 항목 ("냉면 전문", "오마카세")
  nyamScore: number | null;            // 0~100, null이면 미표시
  naverRating: number | null;
  kakaoRating: number | null;
  googleRating: number | null;
  michelinStars: number | null;        // 1~3 또는 null
  hasBlueRibbon: boolean;
  photoUrl: string | null;
  compositeScore: number;              // 정렬용 복합 점수
}

interface DiscoverFilter {
  area: string;                        // 현재 선택된 지역
}
```

### 2. CompositeScore 서비스

```typescript
// src/domain/services/composite-score.ts

class CompositeScoreService {
  /**
   * 복합 점수 계산
   * score = (외부 평점 평균 정규화) * 0.4
   *       + (Nyam 사용자 평균 만족도 / 100) * 0.3
   *       + (Nyam 기록 수 로그) * 0.2
   *       + (권위 뱃지 보유 여부) * 0.1
   */
  static calculate(params: {
    naverRating: number | null;
    kakaoRating: number | null;
    googleRating: number | null;
    nyamAvgSatisfaction: number | null;  // Nyam 전체 사용자 평균 만족도
    nyamRecordCount: number;             // Nyam 총 기록 수
    michelinStars: number | null;
    hasBlueRibbon: boolean;
  }): number {
    // 외부 평점 (5점 만점 → 0~1 정규화)
    const externalRatings = [params.naverRating, params.kakaoRating, params.googleRating]
      .filter((r): r is number => r !== null);
    const externalAvg = externalRatings.length > 0
      ? externalRatings.reduce((a, b) => a + b, 0) / externalRatings.length / 5
      : 0;

    // Nyam 사용자 평균 만족도 (0~100 → 0~1)
    const nyamScore = (params.nyamAvgSatisfaction ?? 0) / 100;

    // Nyam 기록 수 로그 (0 → 0, 1 → 0, 10 → 1, 100 → 2)
    const recordLog = params.nyamRecordCount > 0
      ? Math.log10(params.nyamRecordCount)
      : 0;
    const normalizedRecordLog = Math.min(recordLog / 2, 1); // 0~1 정규화 (100개 = 1.0)

    // 권위 뱃지 보유 여부 (있으면 1, 없으면 0)
    const hasBadge = (params.michelinStars !== null || params.hasBlueRibbon) ? 1 : 0;

    return externalAvg * 0.4 + nyamScore * 0.3 + normalizedRecordLog * 0.2 + hasBadge * 0.1;
  }
}
```

### 3. DiscoverRepository 인터페이스

```typescript
// src/domain/repositories/discover-repository.ts

interface DiscoverRepository {
  getByArea(params: {
    area: string;
    page: number;     // 1-based
    limit: number;    // 20
  }): Promise<{ cards: DiscoverCard[]; total: number }>;
}
```

### 4. API Route

```
GET /api/discover/list
  ?area=광화문
  &page=1
  &limit=20
```

**쿼리**:

```sql
SELECT
  r.id, r.name, r.genre, r.area,
  r.photos[1] as photo_url,
  r.naver_rating, r.kakao_rating, r.google_rating,
  r.michelin_stars, r.has_blue_ribbon,
  r.nyam_score,
  -- 복합 점수 계산 (서버 사이드)
  (
    COALESCE(
      (COALESCE(r.naver_rating,0) + COALESCE(r.kakao_rating,0) + COALESCE(r.google_rating,0))
      / NULLIF(
        (CASE WHEN r.naver_rating IS NOT NULL THEN 1 ELSE 0 END
        + CASE WHEN r.kakao_rating IS NOT NULL THEN 1 ELSE 0 END
        + CASE WHEN r.google_rating IS NOT NULL THEN 1 ELSE 0 END), 0)
      / 5, 0
    ) * 0.4
    + COALESCE(r.nyam_score / 100, 0) * 0.3
    + COALESCE(LOG(NULLIF(
      (SELECT COUNT(*) FROM records rec WHERE rec.target_id = r.id AND rec.target_type = 'restaurant')
    , 0)) / 2, 0) * 0.2
    + CASE WHEN r.michelin_stars IS NOT NULL OR r.has_blue_ribbon THEN 0.1 ELSE 0 END
  ) as composite_score
FROM restaurants r
WHERE r.area = :area
ORDER BY composite_score DESC
LIMIT :limit OFFSET (:page - 1) * :limit;
```

**캐싱**: 1시간 TTL, 해당 지역 새 기록 등록 시 무효화.

### 5. AreaChips 컴포넌트

```typescript
interface AreaChipsProps {
  areas: string[];
  activeArea: string;
  onAreaChange: (area: string) => void;
}
```

**지역 목록** (고정):

```typescript
const DISCOVER_AREAS = ['광화문', '을지로', '종로', '강남', '성수', '홍대', '이태원', '연남'];
```

```css
.area-chips {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 10px;
  scrollbar-width: none;
}
.area-chips::-webkit-scrollbar { display: none; }

.area-chip {
  padding: 7px 14px;
  border-radius: 100px;
  border: 1.5px solid var(--border);
  background: var(--bg);
  font-size: 13px;
  font-weight: 600;
  color: var(--text-sub);
  white-space: nowrap;
  flex-shrink: 0;
  min-height: 34px;
  display: flex;
  align-items: center;
  transition: all 0.15s;
  cursor: pointer;
}
.area-chip.active {
  background: var(--accent-food);
  border-color: var(--accent-food);
  color: #fff;
}
.area-chip:active { transform: scale(0.95); }
```

- 단일 선택 (multi 불가)
- "전체" 칩 없음 — 항상 특정 지역 선택
- 기본 선택: 사용자 온보딩 preferred_areas[0] 또는 첫 번째 칩
- 칩 변경 시: 즉시 목록 갱신 + 스크롤 위치 초기화

### 6. DiscoverCard 컴포넌트

```typescript
interface DiscoverCardProps {
  card: DiscoverCard;
  onClick: () => void;
}
```

```css
.discover-card {
  background: var(--bg-card);
  border-radius: 16px;
  border: 1px solid var(--border);
  overflow: hidden;
  cursor: pointer;
  transition: transform 0.1s;
}
.discover-card:active { transform: scale(0.98); }

.discover-card-photo {
  height: 140px;
  background: center/cover no-repeat;
  position: relative;
}

.discover-card-badges {
  position: absolute;
  top: 10px;
  left: 10px;
  display: flex;
  gap: 6px;
}
.discover-badge {
  font-size: 11px;
  font-weight: 700;
  padding: 4px 9px;
  border-radius: 100px;
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}
.db-michelin { background: rgba(239, 68, 68, 0.9); color: #fff; }
.db-blue { background: rgba(59, 130, 246, 0.9); color: #fff; }

.discover-card-body { padding: 12px 14px; }

.discover-card-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 4px;
}
.discover-card-name {
  font-size: 16px;
  font-weight: 700;
  color: var(--text);
}
.discover-card-score {
  font-size: 16px;
  font-weight: 800;
  color: var(--accent-food);
}

.discover-card-meta {
  font-size: 13px;
  color: var(--text-sub);
  margin-bottom: 10px;
}

.external-scores {
  display: flex;
  gap: 8px;
}
.ext-score {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-sub);
  background: var(--bg);
  border: 1px solid var(--border);
  padding: 3px 8px;
  border-radius: 6px;
}
```

| 뱃지 | 텍스트 | 클래스 |
|------|--------|--------|
| 미슐랭 1성 | 미슐랭 ★ | `db-michelin` |
| 미슐랭 2성 | 미슐랭 ★★ | `db-michelin` |
| 미슐랭 3성 | 미슐랭 ★★★ | `db-michelin` |
| 블루리본 | 블루리본 | `db-blue` |

- 메타: `{genre} · {area} · {specialty}` (specialty null이면 2항목만)
- 외부 평점: N(네이버) / K(카카오) / G(구글) — null이면 해당 pill 미표시
- nyamScore null이면 점수 영역 미표시
- 카드 탭 → `/restaurants/${id}`

### 7. DiscoverSearchBar 컴포넌트

```typescript
interface DiscoverSearchBarProps {
  placeholder: string;   // "식당, 동네, 장르 검색"
}
```

```css
.discover-search-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--bg-card);
  border-radius: 12px;
  padding: 10px 14px;
  border: 1px solid var(--border);
  margin-bottom: 10px;
}

.discover-search-icon {
  width: 16px;
  height: 16px;
  stroke: #9CA3AF;
  stroke-width: 2;
  flex-shrink: 0;
}

.discover-search-placeholder {
  font-size: 14px;
  color: var(--text-hint);
}
```

- Phase 1: placeholder만 표시 (탭 시 무반응)
- Phase 2: 실제 검색 연동

### 8. DiscoverContainer

```typescript
// src/presentation/containers/discover-container.tsx

function DiscoverContainer() {
  // useDiscover() 훅으로 상태 관리
  // 헤더: 타이틀 + 검색바 + 지역 칩
  // 카드 리스트: DiscoverCard × N (무한 스크롤)
  // 하단: "← 홈으로" 버튼
  // 빈 상태: 검색 아이콘 + 메시지 + CTA
}
```

### 9. Discover 헤더

```css
.discover-header {
  padding: 12px 16px 0;
  background: var(--bg);
  position: sticky;
  top: 0;
  z-index: 10;
  border-bottom: 1px solid var(--border);
}

.discover-title {
  font-size: 20px;
  font-weight: 800;
  color: var(--text);
  margin-bottom: 10px;
}
```

- 타이틀: "탐색" + 검색 아이콘 (lucide `search`)
- 앱 공통 헤더(nyam 로고 등)는 표시하지 않음 — Discover 자체 헤더만

### 10. 하단 "← 홈으로" 버튼

```css
.discover-bottom {
  padding: 8px 16px 20px;
  background: var(--bg);
  border-top: 1px solid var(--border);
}

.discover-home-btn {
  width: 100%;
  padding: 12px;
  border-radius: 12px;
  border: 1.5px solid var(--border);
  background: var(--bg-card);
  font-size: 14px;
  font-weight: 600;
  color: var(--text);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  cursor: pointer;
}
```

- 탭 → 홈으로 이동 (슬라이드 전환)

### 11. 빈 상태

```
┌──────────────────────────────┐
│         검색 아이콘            │
│   이 지역에 등록된             │
│   식당이 아직 없어요           │
│   첫 번째로 등록해 보세요!      │
│   [+ 식당 등록하기]            │
└──────────────────────────────┘
```

- 아이콘: `search` lucide 40x40, `--text-hint`
- 텍스트: 14px `--text-sub`, text-align center
- CTA: `+ 식당 등록하기` → FAB (+) 동일 플로우

### 12. useDiscover 훅

```typescript
// src/application/hooks/use-discover.ts

function useDiscover(): {
  cards: DiscoverCard[];
  isLoading: boolean;
  area: string;
  setArea: (area: string) => void;
  hasMore: boolean;
  loadMore: () => void;
  isEmpty: boolean;
}
```

- 20개씩 무한 스크롤 페이지네이션
- 지역 변경 시 리셋 (page=1, 스크롤 초기화)
- SWR + 1시간 캐시

### 13. 화면 전환 애니메이션

| 전환 | 방향 | 타이밍 |
|------|------|--------|
| 홈 → 탐색 | `screen-home` slide-out-left, `screen-discover` slide-in-right | `0.35s cubic-bezier(0.4, 0, 0.2, 1)` |
| 탐색 → 홈 | `screen-discover` slide-out-right, `screen-home` slide-in-left | `0.3s` |
| 탐색 → 식당 상세 | 외부 페이지 이동 | Next.js 라우팅 |

- 전환 후 이전 화면 → `display: none` (350ms 후)

---

## 목업 매핑

| 목업 요소 | 컴포넌트 |
|-----------|----------|
| `prototype/01_home.html` `screen-discover` | `DiscoverContainer` |
| `prototype/01_home.html` `.discover-header` | Discover 헤더 |
| `prototype/01_home.html` `.area-chips` | `AreaChips` |
| `prototype/01_home.html` `.discover-card` | `DiscoverCard` |
| `prototype/01_home.html` `.discover-badge` | `.db-michelin`, `.db-blue` |

---

## 데이터 흐름

```
[홈 탐색 진입점 탭] → router.push('/discover') + 슬라이드 전환

[useDiscover()] → area 기본값 (preferred_areas[0] 또는 '광화문')
              → GET /api/discover/list?area=광화문&page=1&limit=20
              → CompositeScoreService.calculate() (서버에서 계산)
              → DiscoverCard[] (composite_score DESC)
              → DiscoverCard 컴포넌트 렌더

[지역 칩 변경] → setArea('성수') → page=1 리셋 → API 재호출 → 스크롤 초기화

[무한 스크롤] → loadMore() → page++ → 추가 데이터 append

[카드 탭] → router.push(`/restaurants/${id}`)

[← 홈으로] → router.back() + 슬라이드 전환
```

---

## 검증 체크리스트

```
□ 헤더: sticky top:0 z-index:10, "탐색" 20px 800 + 검색바 + 지역 칩
□ 검색바: --bg-card 배경, radius 12px, placeholder "식당, 동네, 장르 검색"
□ 지역 칩: 8개 (광화문/을지로/종로/강남/성수/홍대/이태원/연남), 단일 선택
□ 지역 칩 active: --accent-food 배경, 흰색 텍스트
□ 카드: 사진 h-140, radius 16px, border 1px --border
□ 카드 뱃지: 미슐랭 rgba(239,68,68,0.9), 블루리본 rgba(59,130,246,0.9)
□ 카드 이름: 16px 700, 점수: 16px 800 --accent-food
□ 카드 메타: 13px --text-sub, "{genre} · {area} · {specialty}"
□ 외부 평점: pill 12px 600, --bg 배경, 1px --border, radius 6px
□ 복합 점수: external*0.4 + nyam*0.3 + log(records)*0.2 + badge*0.1
□ 무한 스크롤: 20개씩 페이지네이션
□ 빈 상태: 검색 아이콘 + "이 지역에 등록된 식당이 아직 없어요" + CTA
□ "← 홈으로" 버튼: 100% width, 14px 600, radius 12px
□ 캐싱: 1시간 TTL
□ 화면 전환: 슬라이드 0.35s cubic-bezier
□ 360px: 카드 좌우 16px 마진, 칩 가로 스크롤
□ R1~R5 위반 없음 (CompositeScoreService → domain/services, 순수)
□ pnpm build 에러 없음
□ pnpm lint 경고 0개
```
