# 8.3: 홈 팔로잉/추천 서브탭

> 홈 식당 탭의 저장 필터칩 "팔로잉"을 활성화하여, 맞팔 친구와 팔로잉 버블의 기록을 시간순으로 표시한다.

---

## SSOT 출처

| 문서 | 섹션 |
|------|------|
| `pages/06_HOME.md` | §2-4-3 저장 필터칩 행 ("팔로잉" 프리셋), §3 식당 탭 |
| `pages/08_BUBBLE.md` | §14 홈화면 버블 피드 (시간순, 알고리즘 없음) |
| `prototype/01_home.html` | 저장 필터칩 영역 |

---

## 선행 조건

- S5: 홈 화면 구현 완료 (탭, 저장 필터칩 행, card/list/calendar 뷰)
- S7: `bubble_shares`, `bubble_members` — 버블 피드 데이터
- **8.1**: `FollowRepository`, `getMutualFollows()` — 맞팔 유저 기록 조회

---

## 구현 범위

### 파일 목록

```
src/presentation/components/home/following-feed.tsx
src/presentation/components/home/following-feed-card.tsx
src/presentation/components/home/following-source-badge.tsx
src/application/hooks/use-following-feed.ts
```

### 스코프 외

- 알고리즘 기반 추천 피드 (SSOT: "피드는 시간순 — 알고리즘 없음")
- 와인 탭 팔로잉 (동일 구조이므로 식당과 함께 구현하되, 탭별 `targetType` 분기)
- 팔로잉 피드 전용 통계 패널 (v2)

---

## 상세 구현 지침

### 1. 진입점: 저장 필터칩 "팔로잉"

홈의 저장 필터칩 행 (HOME.md §2-4-3):

```
[방문 8] [찜 3] [추천 12] [팔로잉 5]   [◀ 1/3 ▶]
```

- "팔로잉" 칩 탭 → 서브 패널을 `<FollowingFeed>` 컴포넌트로 전환
- 식당 탭: `targetType='restaurant'`, 와인 탭: `targetType='wine'`

### 2. Application Layer

#### `src/application/hooks/use-following-feed.ts`

```typescript
interface FeedItem {
  id: string                        // 'bubble-{shareId}' 또는 'mutual-{recordId}'
  recordId: string
  targetId: string
  targetName: string
  targetType: 'restaurant' | 'wine'
  satisfaction: number | null
  comment: string | null
  visitDate: string | null
  sourceType: 'bubble' | 'user'     // bubble=버블 피드, user=맞팔 유저
  sourceName: string                // 버블명 또는 유저 닉네임
  sourceIcon: string | null         // 버블 아이콘
  sourceAvatar: string | null       // 유저 아바타 URL
  sourceAvatarColor: string | null  // 유저 아바타 색상
  authorNickname: string
  authorAvatar: string | null
  authorAvatarColor: string | null
  createdAt: string
}

type SourceFilter = 'all' | 'bubble' | 'mutual'

interface UseFollowingFeedOptions {
  userId: string | null
  targetType: 'restaurant' | 'wine'
}

interface UseFollowingFeedResult {
  items: FeedItem[]
  isLoading: boolean
  refresh: () => void
  sourceFilter: SourceFilter
  setSourceFilter: (f: SourceFilter) => void
  totalCount: number
}

export function useFollowingFeed(options: UseFollowingFeedOptions): UseFollowingFeedResult
```

**데이터 소스 2가지**:

1. **버블 피드 기록**: `bubbleRepo.getFeedFromBubbles(userId, targetType)` — 소속 버블의 공유 기록
2. **맞팔 유저 기록**: `followRepo.getFollowing(userId)` → `bubbleRepo.getRecentRecordsByUsers(mutualUserIds, targetType)` — 맞팔 유저의 최근 기록

**동작 흐름**:
- `Promise.all`로 두 소스 병렬 조회
- 버블 피드 → `FeedItem[]` (sourceType='bubble')
- 맞팔 유저 기록 → `FeedItem[]` (sourceType='user')
- 합집합 → `createdAt` DESC 정렬 (시간순, 알고리즘 없음)
- `sourceFilter`에 따라 `useMemo`로 클라이언트 필터링

### 3. Presentation Layer

#### `src/presentation/components/home/following-source-badge.tsx`

```typescript
interface FollowingSourceBadgeProps {
  sourceType: 'bubble' | 'user'
  sourceName: string
  sourceIcon: string | null
  sourceAvatar: string | null
  sourceAvatarColor: string | null
}
```

**렌더링**:

| sourceType | 표시 | 스타일 |
|------------|------|--------|
| `bubble` | `<BubbleIcon> 버블명` | 아이콘 16px, `11px 600 var(--accent-social); max-w-[60px] truncate` |
| `user` | `[아바타원] 유저명` | 아바타 16px(avatarColor 원형, 이니셜 8px), `11px 600 var(--text-sub); max-w-[60px] truncate` |

#### `src/presentation/components/home/following-feed-card.tsx`

```typescript
interface FollowingFeedCardProps {
  item: FeedItem
  onPress: () => void
}
```

**카드 구조**:

```
┌──────────────────────────────────────┐
│ [source badge]              방문일    │  ← 소스 + 시간
│                                      │
│ 식당/와인명                     92   │  ← 이름 + 점수
│                                      │
│ "여기 오마카세 코스가..."            │  ← 한줄평 (맞팔만, 1줄 클램프)
│                                      │
│ 버블에 가입하면 더 볼 수 있어요       │  ← CTA (버블 소스만)
└──────────────────────────────────────┘
```

| 요소 | 스타일 |
|------|--------|
| 카드 | `bg: var(--bg-card); border: 1px solid var(--border); border-radius: 12px; padding: 14px; active:scale-[0.98]` |
| 식당/와인명 | `15px 800 var(--text)` |
| 점수 | `18px 800`, 식당: `--accent-food`, 와인: `--accent-wine` |
| 한줄평 | `12px var(--text-sub); line-clamp: 1` — **맞팔 소스(sourceType='user')만 표시** |
| 시간 | `11px var(--text-hint)` — visitDate 표시 |
| 버블 CTA | `11px var(--accent-social)`, "버블에 가입하면 더 볼 수 있어요" |

#### `src/presentation/components/home/following-feed.tsx`

```typescript
interface FollowingFeedProps {
  items: FeedItem[]
  isLoading: boolean
  onItemPress: (targetId: string, targetType: 'restaurant' | 'wine') => void
  sourceFilter: SourceFilter
  onSourceFilterChange: (f: SourceFilter) => void
}
```

> **참고**: `FollowingFeed`는 순수 UI 컴포넌트로, 훅을 직접 사용하지 않는다. `items`, `sourceFilter` 등은 부모에서 `useFollowingFeed` 결과를 주입받는다.

**구조**:

```tsx
<div className="flex flex-col">
  {/* 소스 필터칩 */}
  <div className="flex gap-2 px-4 py-2">
    {['전체', '버블', '맞팔'].map(chip => (
      <button className="rounded-full px-3 py-1.5 text-[12px] font-semibold"
        style={{
          active: { bg: var(--accent-social), color: #fff },
          inactive: { bg: var(--bg-card), color: var(--text-sub), border: 1px solid var(--border) }
        }}
      />
    ))}
  </div>

  {/* 빈 상태 */}
  {items.length === 0 && (
    <div>
      <Users size={40} color="var(--text-hint)" />
      "팔로우하는 버블이 없거나 맞팔 친구가 없어요"
      "버블에 가입하거나 다른 유저를 팔로우해보세요"
      <Link href="/bubbles">버블 탐색하기</Link>
    </div>
  )}

  {/* 피드 카드 */}
  {items.map(item => <FollowingFeedCard ... />)}
</div>
```

**로딩 상태**: skeleton 카드 3개 (`h-24 animate-pulse rounded-xl bg-var(--bg-card)`)

**정렬**: 시간순만 (최신 먼저). 알고리즘 피드 없음 (BUBBLE.md §14 명시).

---

## 목업 매핑

| 목업 요소 | 컴포넌트 |
|----------|----------|
| 01_home.html 저장 필터칩 "팔로잉" | 기존 `SavedChip` 활용 |
| BUBBLE.md §14 버블 피드 카드 | `<FollowingFeedCard>` |
| BUBBLE.md §14 소스 배지 | `<FollowingSourceBadge>` |

---

## 데이터 흐름

```
[홈 → "팔로잉" 칩 탭]
  → useFollowingFeed({ userId, targetType: 'restaurant' })
    → 병렬 조회:
      1. bubbleRepo.getFeedFromBubbles(userId, targetType) → 버블 피드
      2. followRepo.getFollowing(userId) → mutualUserIds
         → bubbleRepo.getRecentRecordsByUsers(mutualUserIds, targetType) → 맞팔 기록
    → 합집합 → createdAt DESC 정렬
    → sourceFilter에 따라 useMemo 필터링
  → <FollowingFeed
      items={items}
      sourceFilter={sourceFilter}
      onSourceFilterChange={setSourceFilter}
      onItemPress={(id, type) => router.push(...)}
    />
    → 소스 필터칩 렌더 (전체/버블/맞팔)
    → items.map(item => <FollowingFeedCard />)
      → source 뱃지 표시 (BubbleIcon+이름 / 아바타+이름)
      → 버블 소스: CTA "버블에 가입하면 더 볼 수 있어요"
      → 맞팔 소스: 한줄평 1줄 표시

[카드 탭]
  → onItemPress(targetId, targetType)
  → 식당/와인 상세 페이지로 이동 (/restaurants/[id] 또는 /wines/[id])
```

---

## 검증 체크리스트

```
□ "팔로잉" 필터칩 활성 → 팔로잉 피드 표시
□ 버블 소스 기록: 이름+점수만 표시 (한줄평 숨김)
□ 맞팔 소스 기록: 한줄평 포함 표시
□ 소스 배지: 버블(BubbleIcon+이름, accent-social) / 맞팔(아바타+이름, text-sub) 구분
□ 소스 필터: 전체/버블/맞팔 단일선택
□ 시간순 정렬 (최신 먼저, 알고리즘 없음)
□ 빈 상태: Users 아이콘 40px + "팔로우하는 버블이 없거나 맞팔 친구가 없어요" + [버블 탐색하기] CTA
□ 버블 소스 CTA: "버블에 가입하면 더 볼 수 있어요" 표시
□ 카드 탭 → 식당/와인 상세 이동
□ 식당 탭/와인 탭 모두 동작
□ totalCount → 칩 "팔로잉 N" 카운트 반영
□ 360px 레이아웃 정상
□ R1~R5 위반 없음
□ pnpm build / lint 통과
```
