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
- 기존 S5 구현의 `saved-chip` 시스템에 통합

### 2. Application Layer

#### `src/application/hooks/use-following-feed.ts`

```typescript
type FeedSource = 'bubble' | 'mutual';

interface FollowingFeedItem {
  id: string;                    // bubble_share.id 또는 record.id
  source: FeedSource;
  /** 버블 소스일 때 */
  bubble?: {
    id: string;
    name: string;
    icon: string;                // lucide 아이콘명 또는 이미지 URL
    iconBgColor: string;
  };
  /** 맞팔 소스일 때 */
  author?: {
    id: string;
    nickname: string;
    avatarColor: string;
    level: number;
  };
  /** 기록 데이터 */
  record: {
    id: string;
    targetId: string;
    targetType: 'restaurant' | 'wine';
    targetName: string;
    satisfaction: number;
    comment: string | null;
    scene: string | null;
    area: string | null;          // 지역명
    recordedAt: string;
    photos: string[];
  };
  sharedAt: string;               // 정렬 기준
}

interface UseFollowingFeedOptions {
  targetType: 'restaurant' | 'wine';
  /** 소스 필터 */
  sourceFilter?: 'all' | 'bubble' | 'mutual';
  /** 특정 버블 필터 */
  bubbleId?: string;
  /** 지역 필터 */
  area?: string;
  /** 최소 점수 필터 */
  minScore?: number;
}

interface UseFollowingFeedReturn {
  items: FollowingFeedItem[];
  isLoading: boolean;
  hasMore: boolean;
  loadMore: () => void;
  /** 필터용 — 현재 피드에 등장하는 버블 목록 */
  availableBubbles: { id: string; name: string }[];
  /** 피드 아이템 총 개수 (칩 카운트 표시용) */
  totalCount: number;
}

export function useFollowingFeed(options: UseFollowingFeedOptions): UseFollowingFeedReturn {
  // ...
}
```

**데이터 소스 2가지**:

1. **버블 팔로우 기록**: 내가 팔로우(follower)인 버블의 공유 기록
   ```sql
   SELECT bs.*, r.*, u.*, b.*
   FROM bubble_shares bs
   JOIN records r ON r.id = bs.record_id
   JOIN users u ON u.id = bs.shared_by
   JOIN bubbles b ON b.id = bs.bubble_id
   JOIN bubble_members bm ON bm.bubble_id = bs.bubble_id AND bm.user_id = $currentUserId
   WHERE bm.role = 'follower' AND bm.status = 'active'
     AND r.target_type = $targetType
   ```

2. **맞팔 유저 기록**: 맞팔인 유저의 기록 (직접, 버블 경유 아님)
   ```sql
   SELECT r.*, u.*
   FROM records r
   JOIN users u ON u.id = r.user_id
   WHERE r.user_id IN (
     -- 맞팔 목록
     SELECT f1.following_id FROM follows f1
     JOIN follows f2 ON f1.following_id = f2.follower_id AND f1.follower_id = f2.following_id
     WHERE f1.follower_id = $currentUserId
       AND f1.status = 'accepted' AND f2.status = 'accepted'
   )
   AND r.target_type = $targetType
   ```

3. **합집합 → `shared_at`/`recorded_at` DESC 정렬** (시간순, 알고리즘 없음)

**맞팔 기록 가시성**: 맞팔이므로 `AccessLevel = 'mutual'` → 풀 액세스 (리뷰, 사진, 팁 모두 표시)

**버블 팔로우 기록 가시성**: 팔로워는 이름+점수+지역만 → 상세 리뷰/사진 숨김

### 3. Presentation Layer

#### `src/presentation/components/home/following-source-badge.tsx`

```typescript
interface FollowingSourceBadgeProps {
  source: FeedSource;
  /** 버블 소스 */
  bubbleName?: string;
  bubbleIcon?: string;
  bubbleIconBgColor?: string;
  /** 맞팔 소스 */
  authorNickname?: string;
  authorAvatarColor?: string;
}
```

**렌더링**:

| source | 표시 | 스타일 |
|--------|------|--------|
| `bubble` | `[버블아이콘] 직장 맛집` | 아이콘 16px, `font-size: 11px; font-weight: 600; color: var(--accent-social)` |
| `mutual` | `[아바타] 김영수` | 아바타 16px 원형, `font-size: 11px; font-weight: 600; color: var(--text-sub)` |

#### `src/presentation/components/home/following-feed-card.tsx`

```typescript
interface FollowingFeedCardProps {
  item: FollowingFeedItem;
  accentType: 'food' | 'wine';
}
```

**카드 구조**:

```
┌──────────────────────────────────────┐
│ [source badge]              3시간 전  │  ← 소스 + 시간
│                                      │
│ 식당명                          92   │  ← 이름 + 점수
│ 일식 · 을지로                        │  ← 메타
│ "여기 오마카세 코스가..."            │  ← 한줄평 (맞팔만, 1줄 클램프)
│                                      │
│ 버블 소스 CTA (버블일 때만)           │
└──────────────────────────────────────┘
```

| 요소 | 스타일 |
|------|--------|
| 카드 | `bg: var(--bg-card); border: 1px solid var(--border); border-radius: 12px; padding: 14px` |
| 식당/와인명 | `font-size: 15px; font-weight: 800; color: var(--text)` |
| 점수 | `font-size: 18px; font-weight: 800`, 식당: `--accent-food`, 와인: `--accent-wine` |
| 메타 | `font-size: 12px; color: var(--text-sub)` |
| 한줄평 | `font-size: 12px; color: var(--text-sub); line-clamp: 1` — **맞팔 소스만 표시** |
| 시간 | `font-size: 11px; color: var(--text-hint)` |
| 버블 CTA | `font-size: 11px; color: var(--accent-social)`, "버블에 가입하면 더 볼 수 있어요" |

**버블 소스 제한 표시**:
- 팔로워 접근 = 이름 + 점수 + 지역만 → 한줄평/사진 숨김
- 하단에 CTA: "버블에 가입하면 더 볼 수 있어요" (탭 → 버블 상세)

**맞팔 소스 표시**:
- 풀 액세스 → 이름 + 점수 + 지역 + 한줄평 + 사진 썸네일(있으면)

#### `src/presentation/components/home/following-feed.tsx`

```typescript
interface FollowingFeedProps {
  targetType: 'restaurant' | 'wine';
}
```

**구조**:

```tsx
<div className="following-feed">
  {/* 필터 행: 소스 필터칩 */}
  <div className="flex gap-2 px-4 py-2">
    <FilterChip active={source === 'all'} onClick={() => setSource('all')}>전체</FilterChip>
    <FilterChip active={source === 'bubble'} onClick={() => setSource('bubble')}>버블</FilterChip>
    <FilterChip active={source === 'mutual'} onClick={() => setSource('mutual')}>맞팔</FilterChip>
  </div>

  {items.length === 0 ? (
    <EmptyState
      icon="users"
      message="팔로우하는 버블이 없거나 맞팔 친구가 없어요"
      ctaLabel="버블 탐색하기"
      ctaHref="/bubbles"
    />
  ) : (
    <div className="flex flex-col gap-2 px-4">
      {items.map(item => (
        <FollowingFeedCard key={item.id} item={item} accentType={targetType === 'restaurant' ? 'food' : 'wine'} />
      ))}
    </div>
  )}
</div>
```

**필터 옵션** (BUBBLE.md §14 + HOME.md):

| 필터 | 옵션 |
|------|------|
| 소스 | 전체 / 버블 / 맞팔 |
| 버블 (소스=버블일 때) | 전체 / 특정 버블 선택 |
| 지역 | 전체 / 지역 목록 |
| 점수 | 전체 / 90+ / 80+ / 70+ |

**정렬**: 시간순만 (최신 먼저). 알고리즘 피드 없음 (BUBBLE.md §14 명시).

### 4. 홈 통합

기존 S5의 `saved-chips-row` 시스템에서 "팔로잉" 칩 탭 시:

```typescript
// HomeContainer 또는 해당 탭 컨테이너에서
if (activeChip === 'following') {
  return <FollowingFeed targetType={currentTab} />;
}
```

`pref_restaurant_sub` / `pref_wine_sub` 유저 설정에 `'following'` 값 이미 정의됨 (DATA_MODEL.md users 테이블).

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
  → <FollowingFeed targetType="restaurant" />
    → useFollowingFeed({ targetType: 'restaurant' })
      → 병렬 조회:
        1. 버블 팔로우 피드: bubble_members(role='follower') → bubble_shares → records
        2. 맞팔 피드: follows(mutual) → records
      → UNION → shared_at/recorded_at DESC 정렬
      → 가시성 적용:
        - 버블 팔로우: 이름+점수+지역만 (comment/photos 숨김)
        - 맞팔: 풀 액세스
      → items[] 반환
    → 소스 필터칩 렌더
    → items.map(item => <FollowingFeedCard />)
      → source 뱃지 표시 (버블 아이콘+이름 / 아바타+이름)
      → 버블 소스: CTA "버블에 가입하면 더 볼 수 있어요"

[카드 탭]
  → 식당/와인 상세 페이지로 이동 (/restaurants/[id] 또는 /wines/[id])
```

---

## 검증 체크리스트

```
□ "팔로잉" 필터칩 활성 → 팔로잉 피드 표시
□ 버블 팔로우 기록: 이름+점수+지역만 표시 (한줄평/사진 숨김)
□ 맞팔 기록: 풀 액세스 (한줄평 포함)
□ 소스 배지: 버블(아이콘+이름) / 맞팔(아바타+이름) 구분
□ 소스 필터: 전체/버블/맞팔 단일선택
□ 시간순 정렬 (최신 먼저, 알고리즘 없음)
□ 빈 상태: "팔로우하는 버블이 없거나 맞팔 친구가 없어요" + [버블 탐색하기] CTA
□ 버블 소스 CTA: "버블에 가입하면 더 볼 수 있어요" 표시
□ 카드 탭 → 식당/와인 상세 이동
□ 식당 탭/와인 탭 모두 동작
□ totalCount → 칩 "팔로잉 N" 카운트 반영
□ 360px 레이아웃 정상
□ R1~R5 위반 없음
□ pnpm build / lint 통과
```
