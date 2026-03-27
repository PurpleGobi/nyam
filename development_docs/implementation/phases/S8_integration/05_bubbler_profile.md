# 8.5: 버블러 프로필

> 다른 유저의 공개 프로필 페이지를 구현한다. 팔로우 3단계 접근 레벨에 따라 가시성이 달라지며, 버블 컨텍스트에서 진입하면 해당 버블 내 활동 정보를 추가 표시한다.

---

## SSOT 출처

| 문서 | 섹션 |
|------|------|
| `pages/08_BUBBLE.md` | §13 버블러 프로필 (§13-1~§13-8 전체 레이아웃) |
| `prototype/04_bubbler_profile.html` | 전체 목업 — CSS 클래스, 스타일, 레이아웃 |
| `pages/08_BUBBLE.md` | §2-3 개인 팔로우 3단계 접근 |
| `systems/DATA_MODEL.md` | users, bubble_members, records, follows |
| `systems/XP_SYSTEM.md` | 레벨 칭호, XP 계산 |

---

## 선행 조건

- **8.1**: `FollowRepository`, `getAccessLevel()`, `<FollowButton>`
- S6: `UserExperience`, XP 계산, 레벨 표시
- S7: `BubbleMember`, `BubbleRepository` (컨텍스트 카드용)
- S4: 식당/와인 상세 페이지 (picks 카드 탭 → 상세 이동)

---

## 구현 범위

### 파일 목록

```
src/app/(main)/users/[id]/page.tsx
src/presentation/containers/bubbler-profile-container.tsx
src/presentation/components/bubbler/bubbler-hero.tsx
src/presentation/components/bubbler/bubble-context-card.tsx
src/presentation/components/bubbler/taste-profile.tsx
src/presentation/components/bubbler/picks-grid.tsx
src/presentation/components/bubbler/recent-records.tsx
src/presentation/components/bubbler/activity-section.tsx
src/application/hooks/use-bubbler-profile.ts
```

### 스코프 외

- 취향 비교 기능 ("취향 비교" 버튼 탭 시 비교 페이지) — v2
- 차단/신고 기능 (ellipsis 메뉴 내 항목)
- 맞팔 유저의 전체 기록 무한 스크롤 (최근 3건만 표시)

---

## 상세 구현 지침

### 1. 라우트

```
/users/[id]                          ← 일반 진입 (홈, 검색 등)
/bubbles/[bubbleId]/members/[userId]  ← 버블 멤버 탭에서 진입 (redirect → /users/[id]?from=bubble&bubble=[bubbleId])
```

- `from=bubble&bubble=[bubbleId]` 쿼리 파라미터로 버블 컨텍스트 결정
- 버블 컨텍스트가 있으면 `<BubbleContextCard>` 표시

### 2. Application Layer

#### `src/application/hooks/use-bubbler-profile.ts`

```typescript
interface BubblerProfileData {
  user: {
    id: string;
    nickname: string;
    handle: string;                // @username
    avatarColor: string;
    bio: string | null;
    tasteSummary: string | null;
    tasteTags: string[];           // 순서 = 중요도 (앞쪽 N개 = highlight)
    recordCount: number;
    followerCount: number;
    followingCount: number;
    totalXp: number;
    level: number;
    levelTitle: string;
    currentStreak: number;
    createdAt: string;
    privacyProfile: string;
  };
  /** 접근 레벨 */
  accessLevel: AccessLevel;        // 'none' | 'follow' | 'mutual'
  /** 버블 컨텍스트 (from=bubble일 때만) */
  bubbleContext: BubbleContextData | null;
  /** 취향 프로필 (follow 이상에서 표시) */
  tasteProfile: TasteProfileData | null;
  /** 강력 추천 picks (mutual에서만 표시) */
  picks: PickItem[];
  /** 최근 기록 (mutual에서만 표시) */
  recentRecords: RecentRecordItem[];
  /** 활동 히트맵 데이터 (follow 이상에서 표시) */
  activity: ActivityData | null;
}

interface BubbleContextData {
  bubbleId: string;
  bubbleName: string;
  /** 이번 주 순위 */
  weeklyRank: { rank: number; total: number };
  /** 멤버십 기간 */
  membershipDuration: string;      // "8개월"
  /** 나와 취향 일치도 */
  tasteMatchPct: number | null;    // ≥3 겹치는 대상일 때만
  tasteMatchDetail: string | null; // "78% (9/12곳 일치)"
  /** 같이 가본 곳 */
  commonTargetCount: number;
}

interface TasteProfileData {
  /** 카테고리 비율 (식당: 한식/일식/양식/..., 와인: 레드/화이트/...) */
  categories: { name: string; percentage: number; color: string }[];
  /** 평점 성향 척도 (0~100, 50=중간, 100=후한) */
  scoreTendency: number;
  scoreTendencyLabel: string;      // "조금 후한 편"
  /** 주요 지역 (식당: 을지로/광화문/..., 와인: 보르도/부르고뉴/...) */
  regions: { name: string; isTop: boolean }[];
}

interface PickItem {
  id: string;
  targetId: string;
  targetType: 'restaurant' | 'wine';
  name: string;
  meta: string;                    // "일식 · 광화문" 또는 "레드 · 보르도"
  thumbnailUrl: string | null;
  score: number;
}

interface RecentRecordItem {
  id: string;
  targetId: string;
  targetType: 'restaurant' | 'wine';
  name: string;
  meta: string;                    // "한식 · 을지로 · 3일 전"
  comment: string | null;
  thumbnailUrl: string | null;
  score: number;
}

interface ActivityData {
  totalRecords: number;
  currentStreak: number;
  activeDuration: string;          // "11개월"
  /** 히트맵: 91셀 (13주 × 7일), 0~4 밀도 레벨 */
  heatmapCells: number[];          // 0=빈, 1=l1, 2=l2, 3=l3, 4=l4
  /** 월 라벨 */
  heatmapMonths: string[];         // ["1월", "2월", "3월"]
}

export function useBubblerProfile(
  userId: string,
  options?: { bubbleId?: string; tab?: 'restaurant' | 'wine' },
): {
  data: BubblerProfileData | null;
  isLoading: boolean;
  activeTab: 'restaurant' | 'wine';
  setActiveTab: (tab: 'restaurant' | 'wine') => void;
} {
  // 1. getAccessLevel(followRepo, currentUserId, userId)
  // 2. 접근 레벨에 따라 데이터 범위 결정:
  //    - 'none': user 기본 정보만 (level, recordCount, followerCount)
  //    - 'follow': + tasteProfile(이름/점수/지역), activity
  //    - 'mutual': + picks, recentRecords (풀 액세스)
  // 3. bubbleId가 있으면 bubble_members에서 컨텍스트 데이터 조회
  // 4. 탭 전환 시 taste/picks/records 데이터 교체
}
```

**취향 일치도 계산** (BUBBLE.md §5-1):

```typescript
/**
 * match_pct = (matching targets within ±5% satisfaction / overlapping targets) × 100%
 * 겹치는 대상이 3개 미만이면 null (표시 안 함)
 */
function calculateTasteMatch(
  viewerRecords: { targetId: string; satisfaction: number }[],
  targetRecords: { targetId: string; satisfaction: number }[],
): { pct: number; matched: number; total: number } | null {
  const viewerMap = new Map(viewerRecords.map(r => [r.targetId, r.satisfaction]));
  const overlapping: { viewerScore: number; targetScore: number }[] = [];

  for (const tr of targetRecords) {
    const vs = viewerMap.get(tr.targetId);
    if (vs !== undefined) {
      overlapping.push({ viewerScore: vs, targetScore: tr.satisfaction });
    }
  }

  if (overlapping.length < 3) return null;

  const matched = overlapping.filter(
    o => Math.abs(o.viewerScore - o.targetScore) <= 5,
  ).length;

  return {
    pct: Math.round((matched / overlapping.length) * 100),
    matched,
    total: overlapping.length,
  };
}
```

### 3. Presentation Layer

#### `src/presentation/components/bubbler/bubbler-hero.tsx`

```typescript
interface BubblerHeroProps {
  user: BubblerProfileData['user'];
  accessLevel: AccessLevel;
}
```

**레이아웃** (prototype/04_bubbler_profile.html 기준):

```
┌──────────────────────────────────────┐
│ [아바타72]  김영수                    │
│ [Lv.9]     @youngsoo_eats           │
│            72 기록  38 팔로워  21 팔로잉 │
│                                      │
│ [한식] [국수] [을지로] [혼밥] [가성비]   │  ← taste tags
│                                      │
│ [    팔로우    ] [📊 취향 비교]       │  ← actions
└──────────────────────────────────────┘
```

**CSS (목업 정확 복제)**:

| 요소 | 클래스/스타일 |
|------|-------------|
| 컨테이너 | `.profile-hero`, `padding: 20px 20px 0; display: flex; gap: 14px` |
| 아바타 | `.profile-avatar`, `72×72px; border-radius: 50%; border: 3px solid var(--bg); box-shadow: 0 0 0 2px var(--accent-food)` |
| 아바타 배경 | `avatar_color` 또는 기본 `var(--accent-food)`, 이니셜 `26px 700 #fff` |
| 레벨 배지 | `.profile-level-badge`, `position: absolute; bottom: -2px; right: -4px; font-size: 9px; font-weight: 700; padding: 2px 6px; border-radius: 10px; bg: var(--accent-food); color: #fff; border: 2px solid var(--bg)` |
| 이름 | `.profile-name`, `18px 800 var(--text)` |
| 핸들 | `.profile-handle`, `12px var(--text-hint)` |
| 통계 행 | `.profile-stats-row`, `display: flex; gap: 14px` |
| 통계 값 | `.profile-stat-val`, `16px 800 var(--text)` |
| 통계 라벨 | `.profile-stat-lbl`, `10px var(--text-sub)` |
| 맛 태그 | `.profile-taste-tags`, `padding: 12px 20px 0; display: flex; gap: 5px; flex-wrap: wrap` |
| 일반 태그 | `.taste-pill`, `11px 600 var(--text-sub); bg: var(--bg-section); border: 1px solid var(--border); border-radius: 20px; padding: 3px 10px` |
| 하이라이트 태그 | `.taste-pill.highlight`, `bg: var(--accent-food-light); color: var(--accent-food); border-color: transparent` |
| 액션 행 | `.profile-actions`, `padding: 12px 20px 0; display: flex; gap: 8px` |
| 팔로우 버튼 | 8.1에서 구현한 `<FollowButton>` 사용 |
| 취향 비교 | `.btn-compare`, `padding: 9px 14px; border-radius: 10px; 13px 600; bg: var(--bg-section); border: 1px solid var(--border)` + `bar-chart-2` 아이콘 14px |

**접근 레벨별 가시성**:

| 요소 | none | follow | mutual |
|------|------|--------|--------|
| 아바타+레벨 | O | O | O |
| 이름+핸들 | X (이니셜만) | O | O |
| 통계 (기록/팔로워/팔로잉) | 숫자만 | O | O |
| 맛 태그 | X | O | O |
| 팔로우 버튼 | O | O | O |
| 취향 비교 | X | X | O |

#### `src/presentation/components/bubbler/bubble-context-card.tsx`

```typescript
interface BubbleContextCardProps {
  context: BubbleContextData;
}
```

**레이아웃** (§13-3, 목업):

```
┌──────────────────────────────────────┐
│ [●] 직장 맛집 안에서     직장 맛집 → │  ← 헤더
│ ┌────────┐ ┌────────┐              │
│ │ 이번 주 │ │ 멤버십 │              │  ← 2×2 그리드
│ │ 1위/8명 │ │ 8개월  │              │
│ ├────────┤ ├────────┤              │
│ │ 취향    │ │ 같이   │              │
│ │ 78%    │ │ 8곳    │              │
│ └────────┘ └────────┘              │
└──────────────────────────────────────┘
```

**CSS (목업 정확 복제)**:

| 요소 | 스타일 |
|------|--------|
| 상단 구분선 | `.section-divider`, `height: 8px; bg: var(--bg-section); margin: 16px 0 0` |
| 컨테이너 | `.bubble-context`, `padding: 16px 20px` |
| 헤더 아이콘 | `.bc-bubble-icon`, `20×20px; border-radius: 6px; bg: var(--accent-social-light); color: var(--accent-social)` 아이콘 11px |
| 헤더 타이틀 | `.bc-title`, `12px 700 var(--text-sub)` |
| 버블 링크 | `.bc-bubble-name`, `12px 700 var(--accent-social)` |
| 그리드 | `.bc-grid`, `grid-template-columns: 1fr 1fr; gap: 8px` |
| 카드 | `.bc-card`, `bg: var(--bg-section); border-radius: 12px; padding: 10px 12px` |
| 카드 라벨 | `.bc-card-label`, `10px var(--text-hint)` + 아이콘 10px |
| 카드 값 | `.bc-card-val`, `20px 800 var(--text)` |
| 1위 카드 | `.bc-card.rank1`, `bg: linear-gradient(135deg, rgba(201,169,110,0.15), rgba(201,169,110,0.05)); color: var(--caution)` |
| 일치도 카드 | `.bc-card.match`, `.bc-card-val { color: var(--accent-social) }` |
| 일치도 바 | `.bc-match-bar`, `height: 4px; border-radius: 2px; bg: var(--border)` + `.bc-match-fill` `bg: var(--accent-social)` |

**일치도 표시 조건**: 겹치는 대상 3개 이상일 때만 퍼센트 + 진행 바 표시. 미만이면 "데이터 부족" 텍스트.

#### `src/presentation/components/bubbler/taste-profile.tsx`

```typescript
interface TasteProfileProps {
  data: TasteProfileData;
  /** 현재 탭 (식당/와인)에 따른 accent */
  accentType: 'food' | 'wine';
}
```

**레이아웃** (§13-5, 목업):

1. **카테고리 비율 바**: 각 행 — 카테고리명(52px) + 진행 바(6px 높이) + 퍼센트(28px)
2. **평점 성향 척도**: 그라디언트 바 (positive → caution) + 닷 마커
3. **지역 태그**: pill 리스트, 상위 태그 highlight

**CSS (목업)**:

| 요소 | 스타일 |
|------|--------|
| 섹션 | `.taste-profile`, `padding: 16px 20px` |
| 섹션 타이틀 | `.section-title`, `13px 700 var(--text)` + 아이콘 14px `var(--text-sub)` |
| 카테고리 행 | `.taste-cat-row`, `display: flex; align-items: center; gap: 8px` |
| 카테고리명 | `.taste-cat-name`, `12px 600 var(--text); width: 52px` |
| 진행 바 | `.taste-cat-bar`, `flex: 1; height: 6px; bg: var(--border); border-radius: 3px` |
| 퍼센트 | `.taste-cat-pct`, `11px 600 var(--text-sub); width: 28px; text-align: right` |
| 성향 척도 | `.taste-scale`, `margin-top: 14px; bg: var(--bg-section); border-radius: 12px; padding: 10px 14px` |
| 척도 트랙 | `.taste-scale-track`, `height: 6px; bg: var(--border); border-radius: 3px` |
| 척도 fill | `.taste-scale-fill`, `background: linear-gradient(90deg, var(--positive), var(--caution))` |
| 척도 dot | `.taste-scale-dot`, `12×12px; border-radius: 50%; bg: var(--caution); border: 2px solid #fff` |
| 척도 양끝 | `.taste-scale-ends`, `display: flex; justify-content: space-between; 9px var(--text-hint)` — "까다로운 편" / "후한 편" |
| 지역 태그 (일반) | `.taste-region-pill`, `11px; padding: 3px 9px; border-radius: 20px; bg: var(--bg-section); border: 1px solid var(--border)` |
| 지역 태그 (식당 상위) | `.taste-region-pill.top`, `bg: var(--accent-food-light); color: var(--accent-food); border-color: transparent` |
| 지역 태그 (와인 상위) | `.taste-region-pill.top` (와인탭), `bg: var(--accent-wine-light); color: var(--accent-wine)` |

#### `src/presentation/components/bubbler/picks-grid.tsx`

```typescript
interface PicksGridProps {
  title: string;                   // "[이름]의 강력 추천"
  picks: PickItem[];
  accentType: 'food' | 'wine';
}
```

**레이아웃** (§13-6, 목업):

- 가로 스크롤, gap 6px
- 카드: 82×82px 썸네일 + gradient overlay + 점수(우하단 흰색) + 이름(11px) + 메타(10px)
- 식당 5개 / 와인 4개

**CSS (목업)**:

| 요소 | 스타일 |
|------|--------|
| 컨테이너 | `.picks`, `padding: 16px 20px` |
| 그리드 | `.picks-grid`, `display: flex; gap: 6px; overflow-x: auto; scrollbar-width: none` |
| 카드 | `.pick-card`, `flex-shrink: 0; width: 82px; cursor: pointer` |
| 썸네일 | `.pick-thumb`, `82×82px; border-radius: 12px; bg: var(--bg-section) center/cover` |
| 오버레이 | `.pick-thumb-overlay`, `linear-gradient(to top, rgba(0,0,0,0.55) 0%, transparent 55%)` |
| 점수 | `.pick-score`, `position: absolute; bottom: 5px; right: 5px; 11px 800 #fff` |
| 이름 | `.pick-name`, `11px 600 var(--text)` |
| 메타 | `.pick-meta`, `10px var(--text-hint)` |
| 탭 피드백 | `.pick-card:active { transform: scale(0.96) }` |

#### `src/presentation/components/bubbler/recent-records.tsx`

```typescript
interface RecentRecordsProps {
  records: RecentRecordItem[];
  accentType: 'food' | 'wine';
  onViewAll?: () => void;
}
```

**레이아웃** (§13-7, 목업):

- 헤더: `clock` 아이콘 + "최근 기록" + "전체보기 →" 링크
- 3개 행: 썸네일(44×44) + 이름(13px 700) + 메타(11px) + 한줄평(11px, 1줄 클램프) + 점수(15px 800)

**CSS (목업)**:

| 요소 | 스타일 |
|------|--------|
| 행 | `.record-row`, `display: flex; align-items: center; gap: 10px; padding: 10px 20px; border-top: 1px solid var(--border)` |
| 썸네일 | `.record-thumb`, `44×44px; border-radius: 8px; bg: var(--bg-section) center/cover` |
| 이름 | `.record-name`, `13px 700 var(--text)` |
| 메타 | `.record-meta`, `11px var(--text-sub)` |
| 한줄평 | `.record-comment`, `11px var(--text-hint); white-space: nowrap; overflow: hidden; text-overflow: ellipsis` |
| 점수 (식당) | `.record-score`, `15px 800 var(--accent-food)` |
| 점수 (와인) | `.record-score.wine`, `color: var(--accent-wine)` |
| "전체보기" 링크 | `.recent-more`, `12px 600 var(--accent-social)` |

#### `src/presentation/components/bubbler/activity-section.tsx`

```typescript
interface ActivitySectionProps {
  data: ActivityData;
}
```

**레이아웃** (§13-8, 목업):

1. **3칩 통계**: 총 기록 / 연속 기록 (--caution) / 활동 기간
2. **히트맵**: 13열 × 7행, 4레벨 밀도
3. **연속 기록 배너**: flame 아이콘 + "N주 연속 기록 중!"

**CSS (목업)**:

| 요소 | 스타일 |
|------|--------|
| 통계 칩 | `.activity-stat`, `flex: 1; bg: var(--bg-section); border-radius: 10px; padding: 8px 10px; text-align: center` |
| 칩 값 | `.activity-stat-val`, `16px 800 var(--text)` |
| 칩 라벨 | `.activity-stat-lbl`, `9px var(--text-sub)` |
| streak 값 | `.activity-stat-val.streak`, `color: var(--caution)` |
| 히트맵 | `.heatmap`, `grid-template-columns: repeat(13, 1fr); gap: 3px` |
| 셀 기본 | `.hm-cell`, `aspect-ratio: 1; border-radius: 2px; bg: var(--border)` |
| l1 | `.hm-cell.l1`, `bg: rgba(122,155,174,0.25)` |
| l2 | `.hm-cell.l2`, `bg: rgba(122,155,174,0.5)` |
| l3 | `.hm-cell.l3`, `bg: rgba(122,155,174,0.8)` |
| l4 | `.hm-cell.l4`, `bg: var(--accent-social)` |
| 월 라벨 | `.hm-months`, `display: flex; justify-content: space-between; 9px var(--text-hint)` |
| 배너 | `.streak-banner`, `margin-top: 10px; padding: 8px 12px; bg: linear-gradient(90deg, rgba(201,169,110,0.12), transparent); border-radius: 10px; border-left: 3px solid var(--caution)` |
| 배너 아이콘 | `flame` 14px `var(--caution)` |
| 배너 텍스트 | `.streak-banner-text`, `12px var(--text)`, strong: `color: var(--caution)` |

### 4. Container

#### `src/presentation/containers/bubbler-profile-container.tsx`

```typescript
interface BubblerProfileContainerProps {
  userId: string;
}
```

**조립 순서** (§13-1):

```tsx
<div className="scroll-area">
  {/* 1. 히어로 */}
  <BubblerHero user={data.user} accessLevel={data.accessLevel} />

  {/* 2. 버블 컨텍스트 (from=bubble일 때만) */}
  {data.bubbleContext && (
    <>
      <div className="section-divider" />
      <BubbleContextCard context={data.bubbleContext} />
    </>
  )}

  {/* 3. 스티키 탭 (식당/와인) — follow 이상에서만 */}
  {data.accessLevel !== 'none' && (
    <StickyTabs
      tabs={['식당', '와인']}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      accentType={activeTab === 'restaurant' ? 'food' : 'wine'}
    />
  )}

  {/* 4. 취향 프로필 — follow 이상 */}
  {data.tasteProfile && (
    <TasteProfile data={data.tasteProfile} accentType={...} />
  )}

  {/* 5. 강력 추천 — mutual만 */}
  {data.accessLevel === 'mutual' && data.picks.length > 0 && (
    <PicksGrid title={`${data.user.nickname}의 강력 추천`} picks={data.picks} ... />
  )}

  {/* 6. 최근 기록 — mutual만 */}
  {data.accessLevel === 'mutual' && data.recentRecords.length > 0 && (
    <RecentRecords records={data.recentRecords} ... />
  )}

  {/* 7. 활동 — follow 이상 */}
  {data.activity && (
    <ActivitySection data={data.activity} />
  )}
</div>
```

### 5. 접근 레벨별 전체 가시성 매트릭스

| 섹션 | none | follow | mutual |
|------|------|--------|--------|
| 프로필 히어로 (레벨, 기록수, 버블수) | O | O | O |
| 이름, 핸들 | X | O | O |
| 맛 태그 | X | O | O |
| 팔로우 버튼 | O | O | O |
| 취향 비교 버튼 | X | X | O |
| 버블 컨텍스트 카드 | X | X | O (버블 멤버끼리) |
| 스티키 탭 (식당/와인) | X | O | O |
| 취향 프로필 (카테고리/성향/지역) | X | O | O |
| 강력 추천 Picks | X | X | O |
| 최근 기록 (상세) | X | X | O |
| 활동 (통계+히트맵) | X | O | O |

### 6. 헤더

```
[← 직장 맛집]                    [⋯]
```

- from=bubble: `← {bubbleName}` (버블 상세로 뒤로가기)
- from=home/기타: `← 뒤로`
- ellipsis 메뉴: 신고/차단 (v2에서 구현)

---

## 목업 매핑

| 목업 요소 | 컴포넌트 |
|----------|----------|
| 04_bubbler_profile.html `.profile-hero` | `<BubblerHero>` |
| 04_bubbler_profile.html `.bubble-context` | `<BubbleContextCard>` |
| 04_bubbler_profile.html `.content-tabs` | 기존 `<StickyTabs>` 재활용 |
| 04_bubbler_profile.html `.taste-profile` | `<TasteProfile>` |
| 04_bubbler_profile.html `.picks` | `<PicksGrid>` |
| 04_bubbler_profile.html `.record-row` | `<RecentRecords>` |
| 04_bubbler_profile.html `.activity` + `.heatmap` | `<ActivitySection>` |

---

## 데이터 흐름

```
[버블 멤버 탭 → 멤버 카드 탭]
  → /users/[userId]?from=bubble&bubble=[bubbleId]
    → <BubblerProfileContainer userId={userId} />
      → useBubblerProfile(userId, { bubbleId })
        → getAccessLevel(followRepo, me, userId)
        → accessLevel에 따라 데이터 범위 결정
        → bubbleId 있으면 bubble_members 조회 → BubbleContextData
        → 취향 일치도: calculateTasteMatch(내 기록, 대상 기록)
          → ≥3 겹치면 pct 표시, <3이면 null
        → 탭에 따라 taste/picks/records 분기 조회
      → 조건부 렌더링 (접근 레벨 매트릭스)

[팔로우 버튼 탭]
  → useFollow(userId).follow()
    → 상태 갱신 → accessLevel 재계산 → 가시성 변경
```

---

## 검증 체크리스트

```
□ /users/[id] 라우트 접근 가능
□ from=bubble 쿼리 → 버블 컨텍스트 카드 표시
□ from 없음 → 버블 컨텍스트 카드 숨김
□ 접근 레벨 'none': 레벨+기록수만, 이름/태그/취향/picks/기록 숨김
□ 접근 레벨 'follow': + 이름/태그/취향/활동 표시, picks/기록 숨김
□ 접근 레벨 'mutual': 전체 표시
□ 팔로우 버튼 3상태 (8.1 연동)
□ 취향 일치도: ≥3 겹치면 "%  (N/M곳 일치)" 표시
□ 취향 일치도: <3 겹치면 "데이터 부족" 표시
□ 스티키 탭: 식당 accent-food / 와인 accent-wine
□ 탭 전환 → 취향/picks/records 데이터 교체
□ picks: 가로 스크롤 82×82 카드, 탭 → 상세 이동
□ 최근 기록: 3행, 44×44 썸네일
□ 히트맵: 13×7 그리드, 4단계 밀도
□ 연속 기록 배너: flame 아이콘 + caution 색상
□ 360px 레이아웃 정상
□ R1~R5 위반 없음
□ pnpm build / lint 통과
```
