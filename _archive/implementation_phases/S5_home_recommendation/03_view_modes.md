# 03: 뷰 모드 — 카드/리스트/캘린더/지도

> 홈 콘텐츠 영역의 4가지 뷰 모드 (card, list, calendar, map) 컴포넌트 구현

---

## SSOT 출처

| 문서 | 섹션 |
|------|------|
| `pages/06_HOME.md` | §2-4-1 보기 사이클, §3-4 플레이스 카드, §3-6 지도 뷰, §4-3 와인 카드 |
| `systems/DESIGN_SYSTEM.md` | 컬러 토큰, 게이지 색상 |
| `systems/RATING_ENGINE.md` | 사분면 좌표, 만족도 |
| `prototype/01_home.html` | `.place-card`, `.compact-item`, `.calendar-view`, `#mapView` |

---

## 구현 완료 파일 목록

```
src/presentation/components/home/record-card.tsx         ← 식당 플레이스 카드
src/presentation/components/home/wine-card.tsx            ← 와인 카드
src/presentation/components/home/compact-list-item.tsx    ← 리스트 뷰 아이템
src/presentation/components/home/calendar-view.tsx        ← 캘린더 뷰
src/presentation/components/home/calendar-day-detail.tsx  ← 캘린더 날짜 상세
src/presentation/components/home/map-view.tsx             ← 지도 뷰 (식당 전용)
src/presentation/components/home/map-pin.tsx              ← 지도 핀 마커
src/presentation/components/home/mini-quadrant.tsx        ← 사분면 미니
src/presentation/components/home/source-tag.tsx           ← 소스 태그 (나/버블/웹/AI/셀러)
src/presentation/components/home/place-badge.tsx          ← 뱃지 (미슐랭/블루리본/TV)
src/presentation/components/home/following-feed.tsx       ← 팔로잉 피드
src/presentation/components/home/following-feed-card.tsx  ← 팔로잉 피드 카드
src/presentation/components/home/following-source-badge.tsx ← 팔로잉 소스 뱃지
src/application/hooks/use-calendar-records.ts             ← 캘린더용 월별 레코드
src/application/hooks/use-records.ts                      ← useRecordsWithTarget() (홈에서 실제 사용)
src/application/hooks/use-home-records.ts                 ← 홈 레코드 조회 (레거시, 현재 미사용)
src/application/hooks/use-following-feed.ts               ← 팔로잉 피드 데이터
```

모든 뷰 컴포넌트는 `home-container.tsx`에서 lazy loading (`next/dynamic`)으로 로드:
- CalendarView, CalendarDayDetail, MapView, FollowingFeed: `{ ssr: false }`

---

## 상세 구현 현황

### 1. RecordCard (식당 플레이스 카드)

```typescript
interface RecordCardProps {
  id: string
  targetId: string
  targetType: 'restaurant' | 'wine'
  name: string
  meta: string                    // "일식 · 강남 · 2024-03-19"
  photoUrl: string | null
  satisfaction: number | null
  axisX: number | null
  axisY: number | null
  status: 'visited' | 'wishlist' | 'cellar' | 'tasted'
  sources?: SourceInfo[]          // [{ type, label, detail }]
  badges?: BadgeInfo[]            // [{ type, label }]
  likeCount?: number
  commentCount?: number
  isNotMine?: boolean
  sharedBubbles?: SharedBubbleChip[]
  onShareClick?: () => void
  visitCount?: number
}
```

- 카드 레이아웃: 46% 사진 + info, radius 16px, min-height 190px
- 미평가(satisfaction===null): 아이콘 표시 + "평가하기 →" CTA
- 평가 완료: 사분면 미니 + 점수(32px, accent color)
- 버블 스티커: sharedBubbles 칩 행 + 공유 버튼
- 인게이지먼트: ♡ + 💬 카운트
- visitCount > 1: "N회" 뱃지 표시
- active 인터랙션: `scale(0.985)`

### 2. WineCard

```typescript
interface WineCardProps {
  id: string
  wine: { id, name, wineType, variety, region, photoUrl }
  myRecord: { satisfaction, axisX, axisY, visitDate, listStatus, purchasePrice } | null
  bubbleMembers?: WineBubbleMember[]
}
```

- 와인 사진 없을 때: 어두운 gradient (`#2a2030 → #1a1520`) + Wine 아이콘
- 사분면: X=산미, Y=바디, accent=`--accent-wine`
- 버블 행: 최대 2명 표시 (점수 높은 순), 3명+ 시 `+N`
- 셀러 카드: SourceTag type="cellar" + 가격/보관일

### 3. CompactListItem (리스트 뷰)

```typescript
interface CompactListItemProps {
  rank: number
  photoUrl: string | null
  name: string
  meta: string
  score: number | null
  axisX: number | null
  axisY: number | null
  accentType: 'restaurant' | 'wine'
  onClick: () => void
  bubbleDots?: MemberDot[]        // 버블 모드용 멀티 dot
  memberCount?: number
  latestReviewAt?: string | null
  visitCount?: number
}
```

- rank 1-3: accent 색상, 4+: hint 색상
- 우측 고정 88px: 사분면(48px) + 점수
- 버블 모드: `BubbleQuadrant` (멀티 dot) 사용
- visitCount > 1: "N회" 표시
- 와인 썸네일: 어두운 gradient + Wine 아이콘

### 4. CalendarView

```typescript
interface CalendarViewProps {
  year: number
  month: number
  records: CalendarDayData[]
  onMonthChange: (year: number, month: number) => void
  onDaySelect: (date: string) => void
  selectedDate: string | null
  accentType: 'restaurant' | 'wine'
}
```

- 7열 그리드, 사진 배경, 점수 오버레이, 카운트 뱃지
- today 강조 (box-shadow accent)
- 월 네비: `◀ 2026년 3월 ▶`

### 5. CalendarDayDetail

```typescript
interface CalendarDayDetailProps {
  date: string              // "3월 19일 (수)"
  records: {
    mealTime: string        // "점심", "저녁"
    name: string
    score: number | null
    id: string
    targetType: 'restaurant' | 'wine'
    targetId: string
  }[]
  accentType: 'restaurant' | 'wine'
}
```

### 6. MapView (식당 전용)

```typescript
interface MapRecord {
  restaurantId: string
  name: string
  genre: string
  area: string
  lat: number
  lng: number
  score: number | null
  distanceKm: number | null
  photoUrl: string | null
}

interface MapViewProps {
  records: MapRecord[]
  onNavigate: (restaurantId: string) => void
}
```

- mapRecords는 GroupedTarget에서 변환 (중복 마커 제거)
- 지도 뷰 토글 시 카드/리스트 뷰 대체

### 7. FollowingFeed (팔로잉 피드)

- `useFollowingFeed` 훅: userId, targetType 기반 팔로잉 사용자 기록 조회
- sourceFilter: 팔로잉 소스 필터
- `isFollowingMode` 토글로 팔로잉 피드/일반 뷰 전환
- FollowingFeedCard: 개별 피드 아이템

### 8. useCalendarRecords 훅

```typescript
function useCalendarRecords(params: {
  userId: string | null
  tab: HomeTab
  year: number
  month: number
}): { days: CalendarDayData[]; isLoading: boolean }
```

- `recordRepo.findByUserIdWithTarget()` → 월별 필터 → 날짜별 그룹핑
- 각 날짜: 대표 사진(targetPhotoUrl), 최고 점수, 기록 수

---

## 데이터 흐름

```
[HomeContainer] → useRecordsWithTarget(userId, tab)
  → applyFilterRules + searchRecords → filteredRecords
  → groupRecordsByTarget → sortGroupedTargets → 페이지네이션
  → displayGrouped[] → RecordCard / WineCard / CompactListItem

[캘린더 뷰]
useCalendarRecords(userId, tab, year, month) → CalendarView(days)
  → 날짜 탭 → CalendarDayDetail(date, records)

[지도 뷰]
displayGrouped → mapRecords[] (GroupedTarget → MapRecord 변환)
  → MapView(records, onNavigate)

[팔로잉 피드]
useFollowingFeed(userId, targetType) → FollowingFeed(items)
  → FollowingFeedCard

[카드/리스트 탭] → router.push(`/restaurants/${id}` 또는 `/wines/${id}`)
```

---

## 검증 체크리스트

```
□ RecordCard: 46% 사진 + info, radius 16px, min-height 190px
□ RecordCard: 사분면 미니, dot 위치/크기/색상 정확
□ RecordCard: 소스 태그 색상 정확
□ RecordCard: 미평가 시 "평가하기 →" CTA
□ RecordCard: visitCount > 1 시 "N회" 뱃지
□ RecordCard: 버블 스티커 + 공유 버튼
□ WineCard: 와인 사진 어두운 gradient + 아이콘, --accent-wine
□ WineCard: 버블 행 최대 2명, +N 표시
□ CompactListItem: rank 1-3 accent, 사분면 48px, 점수 표시
□ CompactListItem: 버블 모드 BubbleQuadrant 지원
□ CalendarView: 7열 그리드, 사진 배경, 점수 오버레이
□ CalendarView: today 강조, 선택 날짜 표시
□ CalendarDayDetail: mealTime + name + score 목록
□ MapView: 식당 전용, GroupedTarget 기반 중복 마커 제거
□ FollowingFeed: 팔로잉 피드 모드 토글
□ lazy loading: CalendarView, MapView, FollowingFeed (next/dynamic, ssr:false)
□ 360px: 카드/리스트/캘린더/지도 정상 표시
□ R1~R5 위반 없음
□ pnpm build 에러 없음
□ pnpm lint 경고 0개
```
