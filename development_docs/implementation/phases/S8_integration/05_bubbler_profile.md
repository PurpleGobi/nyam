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

#### `src/app/(main)/users/[id]/page.tsx`

```typescript
import { BubblerProfileContainer } from '@/presentation/containers/bubbler-profile-container'

interface Props {
  params: Promise<{ id: string }>
  searchParams: Promise<{ from?: string; bubble?: string }>
}

export default async function BubblerProfilePage({ params, searchParams }: Props) {
  const { id } = await params
  const { bubble } = await searchParams
  return <BubblerProfileContainer userId={id} bubbleId={bubble ?? null} />
}
```

- `bubble` 쿼리 파라미터로 버블 컨텍스트 결정 (있으면 `<BubbleContextCard>` 표시)
- `params`, `searchParams`는 `Promise` 타입 (Next.js App Router)

### 2. Application Layer

#### `src/application/hooks/use-bubbler-profile.ts`

```typescript
interface CategoryStat {
  name: string
  percentage: number
}

interface BubblerProfileData {
  nickname: string
  handle: string | null
  avatarUrl: string | null
  avatarColor: string | null
  bio: string | null
  level: number
  levelTitle: string
  accessLevel: AccessLevel
  tasteTags: string[]
  categories: CategoryStat[]
  avgSatisfaction: number
  scoreTendencyLabel: string
  totalRecords: number
  topRegions: string[]
  topPicks: BubblerPickItem[]
  recentRecords: BubblerRecentRecord[]
  heatmap: HeatmapCell[]
  bubbleContext: BubblerBubbleContext | null
  currentStreak: number
  activeDuration: string
}

type ProfileTab = 'restaurant' | 'wine'

export function useBubblerProfile(
  currentUserId: string | null,
  targetUserId: string,
  bubbleId: string | null,
): {
  data: BubblerProfileData | null
  isLoading: boolean
  activeTab: ProfileTab
  setActiveTab: (tab: ProfileTab) => void
}
```

**접근 레벨 판정**:
- `currentUserId === targetUserId` → `'mutual'` (본인)
- 그 외: `followRepo.getAccessLevel` 양방향 조회 후 `getAccessLevel(iFollow, theyFollow)` 순수 함수로 판정
- `profileRepo.getBubblerProfile(targetUserId, bubbleId, activeTab)` 호출로 데이터 조회
- 탭 전환 시 `useEffect`가 재실행되어 해당 탭 데이터 재조회

**BubblerBubbleContext 구조**:
```typescript
{
  bubbleId: string
  bubbleName: string
  bubbleIcon: string | null
  rank: number | null
  rankTotal: number | null
  memberSince: string
  tasteMatchPct: number | null
  tasteMatchCount: number | null
  commonTargetCount: number
}
```

### 3. Presentation Layer

#### `src/presentation/containers/bubbler-profile-container.tsx`

```typescript
interface BubblerProfileContainerProps {
  userId: string
  bubbleId?: string | null
}
```

**사용하는 훅 + 컴포넌트**:
- `useAuth()` — 현재 로그인 유저
- `useFollow(authUser.id, userId)` — 팔로우 상태/토글
- `useFollowList(userId)` — 팔로워/팔로잉 카운트
- `useBubblerProfile(authUser.id, userId, bubbleId)` — 프로필 데이터

**레이아웃 구조**:
- `<AppHeader />` — 공통 앱 헤더
- `<FabBack />` — 플로팅 뒤로가기 버튼
- 스크롤 영역:
  1. `<BubblerHero>` — 항상 표시
  2. `<BubbleContextCard>` — `accessLevel === 'mutual' && bubbleContext` 존재 시만 표시
  3. `<StickyTabs>` — `accessLevel !== 'none'` 시 식당/와인 탭
  4. `<TasteProfile>` — `accessLevel !== 'none'` 시
  5. `<PicksGrid>` — `accessLevel === 'mutual'` 시
  6. `<RecentRecords>` — `accessLevel === 'mutual'` 시
  7. `<ActivitySection>` — `accessLevel !== 'none'` 시

**로딩 상태**: 중앙 스피너 (`border: 3px var(--accent-social) + border-t-transparent + animate-spin`)

#### `src/presentation/components/bubbler/bubbler-hero.tsx`

```typescript
interface BubblerHeroProps {
  nickname: string
  handle: string | null
  avatarUrl: string | null
  avatarColor: string | null
  level: number
  levelTitle: string
  tasteTags?: string[]
  accessLevel: AccessLevel
  isOwnProfile: boolean
  isFollowLoading: boolean
  onToggleFollow: () => void
  recordCount: number
  followerCount: number
  followingCount: number
}
```

> **참고**: `accessLevel === 'none'`이면 컨테이너에서 `nickname`을 `"Lv.{N} 유저"`로 변환, `handle`을 null로 전달하여 이름/핸들 숨김을 처리한다.

**레이아웃** (목업 `.profile-hero`):

```
┌──────────────────────────────────────┐
│ [아바타72]  김영수                    │  ← 가로 배치
│ [Lv.9]     @youngsoo_eats           │
│            72 기록  38 팔로워  21 팔로잉 │
│                                      │
│ [한식] [국수] [을지로] [혼밥] [가성비]   │  ← taste tags (최대 5개)
│                                      │
│ [    팔로우    ] [📊 취향 비교]       │  ← actions (본인이 아닐 때만)
└──────────────────────────────────────┘
```

**CSS**:

| 요소 | 스타일 |
|------|--------|
| 컨테이너 | `flex items-start gap-3.5; padding: 20px 20px 0` |
| 아바타 | `72×72px; border-radius: 50%; bg: avatarColor ?? var(--accent-food); color: #fff; border: 3px solid var(--bg); box-shadow: 0 0 0 2px {levelColor}` |
| 아바타 이니셜 | `26px 700` |
| 레벨 뱃지 | `absolute; bottom: -2px; right: -4px; 9px 700; padding: 2px 6px; border-radius: 10px; bg: {levelColor}; color: #fff; border: 2px solid var(--bg)` |
| 레벨 뱃지 텍스트 | `"Lv.{N} {levelTitle}"` (예: "Lv.9 미식가") |
| 이름 | `18px 800 var(--text)` |
| 핸들 | `12px var(--text-hint); mb-2` |
| 통계 행 | `flex gap-3.5` |
| 통계 값 | `16px 800 var(--text)` |
| 통계 라벨 | `10px var(--text-sub)` |
| 맛 태그 | `padding: 12px 20px 0; flex flex-wrap gap-[5px]; 최대 5개` |
| 일반 태그 | `11px 600 var(--text-sub); bg: var(--bg-section); border: 1px solid var(--border); border-radius: 20px; padding: 3px 10px` |
| 하이라이트 태그 (첫 2개) | `bg: var(--accent-food-light); color: var(--accent-food); border: 1px solid transparent` |
| 액션 행 | `padding: 12px 20px 0; flex gap-2` (isOwnProfile=false일 때만) |
| 팔로우 버튼 | `<FollowButton>` 컴포넌트 (flex-1) |
| 취향 비교 | `accessLevel === 'mutual'`일 때만 표시. `BarChart2` 14px + "취향 비교"; 13px 600; bg: var(--bg-section); border: 1px solid var(--border); border-radius: 10px; padding: 9px 14px` |

**접근 레벨별 가시성**:

| 요소 | none | follow | mutual |
|------|------|--------|--------|
| 아바타+레벨 | O | O | O |
| 이름+핸들 | X (Lv.N 유저) | O | O |
| 통계: 기록 | O | O | O |
| 통계: 팔로워/팔로잉 | X | O | O |
| 맛 태그 | X | O | O |
| 팔로우 버튼 | O | O | O |
| 취향 비교 | X | X | O |

> `levelColor`는 `getLevelColor(level)` (from `xp-calculator`)로 결정.

#### `src/presentation/components/bubbler/bubble-context-card.tsx`

```typescript
interface BubbleContextCardProps {
  bubbleId: string
  bubbleName: string
  bubbleIcon: string | null
  rank: number | null
  rankTotal: number | null
  memberSince: string
  tasteMatchPct: number | null
  tasteMatchCount: number | null
  commonTargetCount: number
}
```

**레이아웃** (§13-3, 목업):

```
┌──────────────────────────────────────┐
│ [●] 직장 맛집 안에서     직장 맛집 → │  ← 헤더 + Link
│ ┌────────┐ ┌────────┐              │
│ │ 이번 주 │ │ 멤버십 │              │  ← 2×2 그리드
│ │ 1위/8명 │ │ 8개월  │              │
│ ├────────┤ ├────────┤              │
│ │ 취향    │ │ 같이   │              │
│ │ 78%    │ │ 8곳    │              │
│ └────────┘ └────────┘              │
└──────────────────────────────────────┘
```

**CSS**:

| 요소 | 스타일 |
|------|--------|
| 상단 구분선 | `height: 8px; bg: var(--bg-section); margin-top: 16px` |
| 컨테이너 | `padding: 16px 20px` |
| 헤더 아이콘 | `<BubbleIcon>` 또는 `CircleDot` 11px in 20×20px `rounded-md; bg: var(--accent-social-light); color: var(--accent-social)` |
| 헤더 타이틀 | `12px 700 var(--text-sub); flex-1` |
| 버블 링크 | `<Link href="/bubbles/{id}">; 12px 700 var(--accent-social)` |
| 그리드 | `grid-cols-2 gap-2` |
| 카드 | `rounded-xl; padding: 10px 12px; bg: var(--bg-section)` |
| 카드 라벨 | `10px var(--text-hint)` + 아이콘(`Trophy`/`Calendar`/`Heart`/`MapPin`) 10px |
| 카드 값 | `20px 800 var(--text)` |
| 1위 카드 | `bg: linear-gradient(135deg, rgba(201,169,110,0.15), rgba(201,169,110,0.05)); 값 color: var(--caution)` |
| 일치도 카드 | `값 color: var(--accent-social)` |
| 일치도 바 | `height: 4px; border-radius: 2px; bg: var(--border)` + fill `bg: var(--accent-social)` |
| 데이터 부족 | `13px font-medium var(--text-hint)` "데이터 부족" |
| 멤버십 기간 | `useMemo`로 가입일부터 현재까지 개월 수 계산 |

**일치도 표시 조건**: `tasteMatchPct !== null && tasteMatchCount !== null && tasteMatchCount >= 3`

#### `src/presentation/components/bubbler/taste-profile.tsx`

```typescript
interface CategoryStat {
  name: string
  percentage: number
}

interface ScoreTendency {
  avgSatisfaction: number
  totalRecords: number
}

interface TasteProfileProps {
  categories: CategoryStat[]
  scoreTendency: ScoreTendency
  topRegions: string[]
  accentType: 'food' | 'wine'
}
```

**구성 요소**:

1. **카테고리 비중**: 바 차트 형태. 카테고리명(52px) + 진행 바(6px) + 퍼센트(28px). 최대 5개. 바 색상: 1위=accent, 2위=accent-social, 3위=positive, 4~5위=border-bold
2. **점수 성향 척도**: `bg: var(--bg-section); border-radius: 12px; padding: 10px 14px`. 그라디언트 바(`positive → caution`) + dot 마커(`caution, 12px`). 양끝 라벨: "까다로운 편" / "후한 편". 중앙 텍스트: `getScoreTendencyLabel(avg)` + "평균 {N}점"
3. **주요 지역 태그**: pill 리스트. 첫 번째=accentLight 배경+accent 색상, 나머지=bg-section+border

**점수 성향 라벨 함수**:
- avg >= 85: "후한 편"
- avg >= 75: "조금 후한 편"
- avg >= 65: "보통"
- avg >= 55: "조금 까다로운 편"
- 그 외: "까다로운 편"

#### `src/presentation/components/bubbler/picks-grid.tsx`

```typescript
interface PickItem {
  id: string
  name: string
  targetType: 'restaurant' | 'wine'
  satisfaction: number | null
  photoUrl: string | null
  genre: string | null
}

interface PicksGridProps {
  picks: PickItem[]
  title?: string
  onItemPress: (id: string, targetType: 'restaurant' | 'wine') => void
}
```

**레이아웃**:
- 가로 스크롤(`overflow-x-auto scrollbar-none`), gap 6px (실제 구현 1.5 = 6px)
- 카드: 82×82px 썸네일 (사진 또는 플레이스홀더 아이콘) + gradient overlay + 점수(우하단 11px 800 흰색) + 이름(11px 600) + 장르(10px hint)
- 최대 6개 표시
- 빈 상태: "아직 기록이 없어요" (13px var(--text-hint), py-8)
- `Star` 아이콘 + 제목 (기본 "강력 추천", 또는 전달된 title)

**플레이스홀더 아이콘**: restaurant → `UtensilsCrossed` 24px, wine → `Wine` 24px, bg: accent-light

#### `src/presentation/components/bubbler/recent-records.tsx`

```typescript
interface RecentRecordItem {
  id: string
  targetId: string
  targetType: 'restaurant' | 'wine'
  targetName: string
  meta: string
  satisfaction: number | null
  comment: string | null
  photoUrl: string | null
  visitDate: string | null
}

interface RecentRecordsProps {
  records: RecentRecordItem[]
  accentType: 'food' | 'wine'
  onRecordPress: (id: string) => void
  onViewAll?: () => void
}
```

**레이아웃**:
- 헤더: `Clock` 14px + "최근 기록" (13px 700) + "전체보기" (12px 600 accent-social, 선택적)
- 최대 3개 행: 썸네일(44×44px, border-radius: 8px) + 이름(13px 700) + 메타(11px text-sub) + 한줄평(11px text-hint, ellipsis) + 점수(15px 800, 식당=accent-food, 와인=accent-wine)
- 행 구분: `border-top: 1px solid var(--border); padding: 10px 0`
- 빈 상태: null 반환 (렌더링 안 함)

#### `src/presentation/components/bubbler/activity-section.tsx`

```typescript
interface ActivitySectionProps {
  heatmap: HeatmapCell[]        // from @/domain/entities/profile
  totalRecords?: number
  currentStreak?: number
  activeDuration?: string
}
```

**구성 요소**:

1. **3칩 통계**: `flex gap-2`, 각 `flex-1; bg: var(--bg-section); border-radius: 10px; py-2`
   - 총 기록: `16px 800 var(--text)` + "총 기록" 9px
   - 연속 기록: `16px 800 var(--caution)` + "연속 기록" 9px (N주)
   - 활동 기간: `16px 800 var(--text)` + "활동 기간" 9px

2. **히트맵**: 13열 × 7행 그리드
   - 요일 라벨: 월~일 (8px var(--text-hint))
   - 셀: `12×12px; border-radius: 2px`
   - 밀도: 0=border, 1=rgba(122,155,174,0.25), 2=0.5, 3=0.8, 4=accent-social
   - 월 라벨: 주 첫 날 기준 월 변경 시 표시

3. **스트릭 배너**: `currentStreak > 0`일 때 표시
   - `Flame` 14px var(--caution)
   - `"<strong>{N}주</strong> 연속 기록 중!"`
   - `bg: linear-gradient(90deg, rgba(201,169,110,0.12), transparent); border-left: 3px solid var(--caution); border-radius: 10px; padding: 8px 12px`

### 4. 접근 레벨별 전체 가시성 매트릭스

| 섹션 | none | follow | mutual |
|------|------|--------|--------|
| 프로필 히어로 (아바타, 레벨, 기록수) | O | O | O |
| 이름, 핸들 | X | O | O |
| 팔로워/팔로잉 카운트 | X | O | O |
| 맛 태그 | X | O | O |
| 팔로우 버튼 | O (비본인) | O | O |
| 취향 비교 버튼 | X | X | O |
| 버블 컨텍스트 카드 | X | X | O (버블 멤버끼리) |
| 스티키 탭 (식당/와인) | X | O | O |
| 취향 프로필 (카테고리/성향/지역) | X | O | O |
| 강력 추천 Picks | X | X | O |
| 최근 기록 (상세) | X | X | O |
| 활동 (통계+히트맵) | X | O | O |

---

## 목업 매핑

| 목업 요소 | 컴포넌트 |
|----------|----------|
| 04_bubbler_profile.html `.profile-hero` | `<BubblerHero>` |
| 04_bubbler_profile.html `.bubble-context` | `<BubbleContextCard>` |
| 04_bubbler_profile.html `.content-tabs` | `<StickyTabs>` (공통 UI 재활용) |
| 04_bubbler_profile.html `.taste-profile` | `<TasteProfile>` |
| 04_bubbler_profile.html `.picks` | `<PicksGrid>` |
| 04_bubbler_profile.html `.record-row` | `<RecentRecords>` |
| 04_bubbler_profile.html `.activity` + `.heatmap` | `<ActivitySection>` |

---

## 데이터 흐름

```
[버블 멤버 탭 → 멤버 카드 탭]
  → /users/[userId]?bubble=[bubbleId]
    → <BubblerProfileContainer userId={userId} bubbleId={bubbleId} />
      → useAuth() → authUser
      → useFollow(authUser.id, userId) → { accessLevel, isLoading, toggleFollow }
      → useFollowList(userId) → { counts }
      → useBubblerProfile(authUser.id, userId, bubbleId)
        → followRepo.getAccessLevel 양방향 조회
        → getAccessLevel(iFollow, theyFollow) 순수 함수로 판정
        → profileRepo.getBubblerProfile(targetUserId, bubbleId, activeTab)
        → data: BubblerProfileData
      → 조건부 렌더링 (접근 레벨 매트릭스)

[팔로우 버튼 탭]
  → toggleFollow()
    → 상태 갱신 → accessLevel 재계산 → 가시성 변경

[탭 전환 (식당 ↔ 와인)]
  → setActiveTab('wine')
    → useBubblerProfile의 useEffect 재실행
    → profileRepo.getBubblerProfile(userId, bubbleId, 'wine') 재조회
    → categories, topRegions, topPicks, recentRecords 갱신

[picks 카드 탭]
  → onItemPress(id, type)
    → router.push(/restaurants/{id} 또는 /wines/{id})

[최근 기록 탭]
  → onRecordPress(id)
    → 해당 기록의 targetType/targetId로 식당/와인 상세 이동
```

---

## 검증 체크리스트

```
□ /users/[id] 라우트 접근 가능
□ bubble 쿼리 → 버블 컨텍스트 카드 표시 (mutual only)
□ bubble 쿼리 없음 → 컨텍스트 카드 숨김
□ 접근 레벨 'none': Lv.N 유저 + 기록수만, 이름/태그/취향/picks/기록 숨김
□ 접근 레벨 'follow': + 이름/태그/취향/활동/팔로워수/팔로잉수 표시
□ 접근 레벨 'mutual': 전체 표시 (picks, 기록, 취향비교 포함)
□ 팔로우 버튼 3상태 (8.1 FollowButton 연동)
□ 취향 일치도: ≥3 겹치면 "N% + 진행 바" 표시
□ 취향 일치도: <3 겹치면 "데이터 부족" 표시
□ 스티키 탭: 식당 accent-food / 와인 accent-wine
□ 탭 전환 → 취향/picks/records 데이터 재조회
□ picks: 가로 스크롤 82×82 카드 (최대 6개), 탭 → 상세 이동
□ 최근 기록: 3행, 44×44 썸네일
□ 히트맵: 13×7 그리드, 요일 라벨(월~일), 4단계 밀도
□ 연속 기록 배너: Flame 아이콘 + caution 색상
□ 본인 프로필: 팔로우 버튼/취향 비교 숨김
□ 레벨 뱃지 색상: getLevelColor(level) 동적
□ AppHeader + FabBack 레이아웃 정상
□ 360px 레이아웃 정상
□ R1~R5 위반 없음
□ pnpm build / lint 통과
```
