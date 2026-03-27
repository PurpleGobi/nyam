# 8.2: 상세 페이지 L9 — 버블 멤버 기록

> 식당/와인 상세 페이지 하단(L8 아래)에 해당 장소를 기록한 버블 멤버들의 기록을 표시한다. 버블별 필터 + content_visibility 제한 적용.

---

## SSOT 출처

| 문서 | 섹션 |
|------|------|
| `pages/02_RESTAURANT_DETAIL.md` | Layer 9: 버블 기록 와이어프레임, 필터 칩, 버블 카드 |
| `pages/03_WINE_DETAIL.md` | Layer 9: 버블 피드 (식당과 동일 구조) |
| `pages/08_BUBBLE.md` | §4-5 content_visibility, §15 식당/와인 상세 소셜 레이어 |
| `systems/DATA_MODEL.md` | bubble_shares, records, bubble_members, bubbles |
| `prototype/02_detail_restaurant.html` | L9 영역 |

---

## 선행 조건

- S4: 식당/와인 상세 페이지 L1~L8 구현 완료
- S7: `bubble_shares`, `bubbles`, `bubble_members` 테이블 + Repository
- **8.1**: `FollowRepository`, `getAccessLevel()` — 비멤버의 접근 레벨 판단

---

## 구현 범위

### 파일 목록

```
src/presentation/components/detail/bubble-record-section.tsx
src/presentation/components/detail/bubble-filter-chips.tsx
src/presentation/components/detail/bubble-record-card.tsx
src/application/hooks/use-bubble-records.ts
```

### 스코프 외

- 사분면 차트에 버블 멤버 점 반투명 표시 (별도 태스크)
- 버블 피드 내 댓글/리액션 인라인 상호작용 (S7에서 구현 완료, 여기서는 카운트만 표시)
- "더보기" 클릭 시 전체 목록 페이지 (v2)

---

## 상세 구현 지침

### 1. Application Layer

#### `src/application/hooks/use-bubble-records.ts`

```typescript
interface BubbleRecordItem {
  shareId: string;
  recordId: string;
  /** 기록 작성자 */
  author: {
    id: string;
    nickname: string;
    avatarColor: string;       // hex
    level: number;
    levelTitle: string;
  };
  /** 소속 버블 */
  bubble: {
    id: string;
    name: string;
    contentVisibility: 'rating_only' | 'rating_and_comment';
  };
  /** 기록 데이터 (가시성에 따라 일부 null) */
  satisfaction: number;          // 항상 노출
  comment: string | null;        // rating_and_comment + 멤버이면 노출
  scene: string | null;          // 상황 태그
  recordedAt: string;
  /** 리액션 카운트 */
  likeCount: number;
  commentCount: number;
}

interface UseBubbleRecordsReturn {
  records: BubbleRecordItem[];
  /** 필터링된 버블 목록 */
  availableBubbles: { id: string; name: string }[];
  /** 현재 선택된 버블 ID (null = 전체) */
  selectedBubbleId: string | null;
  setSelectedBubbleId: (id: string | null) => void;
  isLoading: boolean;
  hasMore: boolean;
}

export function useBubbleRecords(
  targetId: string,
  targetType: 'restaurant' | 'wine',
): UseBubbleRecordsReturn {
  // 1. bubble_shares JOIN records JOIN users
  //    WHERE records.target_id = targetId AND records.target_type = targetType
  // 2. 현재 유저의 소속 버블 목록 조회 (필터 칩용)
  // 3. content_visibility 적용:
  //    - 뷰어가 해당 버블 멤버인지 확인
  //    - 멤버: 모든 필드 노출
  //    - 비멤버 + rating_only: satisfaction만 (comment, photos 숨김)
  //    - 비멤버 + rating_and_comment: satisfaction + comment
  // 4. 최대 5개 반환, hasMore로 더보기 표시 여부
}
```

**Supabase 쿼리 구조**:

```sql
SELECT
  bs.id as share_id,
  bs.record_id,
  r.satisfaction,
  r.comment,
  r.scene,
  r.recorded_at,
  u.id as author_id, u.nickname, u.avatar_color, u.total_xp,
  b.id as bubble_id, b.name as bubble_name, b.content_visibility,
  (SELECT COUNT(*) FROM reactions WHERE target_type='record' AND target_id=r.id AND reaction_type='like') as like_count,
  (SELECT COUNT(*) FROM comments WHERE target_type='record' AND target_id=r.id) as comment_count
FROM bubble_shares bs
JOIN records r ON r.id = bs.record_id
JOIN users u ON u.id = bs.shared_by
JOIN bubbles b ON b.id = bs.bubble_id
WHERE r.target_id = $targetId
  AND r.target_type = $targetType
ORDER BY bs.shared_at DESC
LIMIT 6;  -- 5개 표시 + 1개로 hasMore 판별
```

### 2. Presentation Layer

#### `src/presentation/components/detail/bubble-filter-chips.tsx`

```typescript
interface BubbleFilterChipsProps {
  bubbles: { id: string; name: string }[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  /** 식당/와인에 따른 accent 색상 */
  accentType: 'food' | 'wine';
}
```

**레이아웃** (RESTAURANT_DETAIL.md Layer 9 기준):

```
[전체] [직장 맛집] [와인 모임] [동네 맛집]
```

| 요소 | 스타일 |
|------|--------|
| 컨테이너 | `flex gap-2 overflow-x-auto`, 가로 스크롤, 스크롤바 숨김 |
| 칩 (비활성) | `padding: 5px 12px`, `border-radius: 20px`, `font-size: 11px`, `font-weight: 500`, `bg: var(--bg)`, `border: 1.5px solid var(--border)`, `color: var(--text-sub)` |
| 칩 (활성, 식당) | `bg: var(--accent-food-light)`, `border-color: var(--accent-food)`, `color: var(--accent-food)`, `font-weight: 600` |
| 칩 (활성, 와인) | `bg: var(--accent-wine-light)`, `border-color: var(--accent-wine)`, `color: var(--accent-wine)`, `font-weight: 600` |
| 선택 모드 | 단일 선택 (radio) |

#### `src/presentation/components/detail/bubble-record-card.tsx`

```typescript
interface BubbleRecordCardProps {
  record: BubbleRecordItem;
  /** 현재 뷰어가 해당 버블 멤버인지 */
  isMember: boolean;
  accentType: 'food' | 'wine';
  onTap?: () => void;
}
```

**카드 레이아웃** (RESTAURANT_DETAIL.md L9 와이어프레임 기준):

```
┌────────────────────────────────────┐
│ [👤32] 김영수  [지역 Lv.9]  버블명  │  ← top row
│                              90    │  ← 점수 (우측)
│ "메밀국수 진짜 맛있다..."          │  ← one-liner (멤버/visibility 조건)
│ 혼밥 · 3일 전       ♡4  💬2       │  ← bottom row
└────────────────────────────────────┘
```

**스타일 (목업 기준)**:

| 요소 | CSS |
|------|-----|
| 카드 | `border: 1px solid var(--border)`, `border-radius: 12px`, `padding: 12px` |
| 아바타 | `width: 32px; height: 32px; border-radius: 50%`, 그라디언트 배경 (avatar_color 기반) |
| 사용자명 | `font-size: 13px; font-weight: 700; color: var(--text)` |
| 레벨 뱃지 | 인라인, `font-size: 11px; font-weight: 500; border-radius: 4px; padding: 1px 5px`, `bg: var(--bg-section); color: var(--text-sub)` |
| 버블명 | `font-size: 11px; color: var(--text-hint)`, 이름 아래 줄 |
| 점수 | `font-size: 14px; font-weight: 800`, 식당: `color: var(--accent-food)`, 와인: `color: var(--accent-wine)` |
| 한줄평 | `font-size: 12px; color: var(--text-sub)`, 1줄 클램프 |
| 메타 (상황+시간) | `font-size: 11px; color: var(--text-hint)` |
| 리액션 | `heart` + `message-circle` lucide 12px, `color: var(--text-hint)` |
| 터치 피드백 | `active:scale-[0.98]`, `transition: transform 0.1s` |

**content_visibility 제한 렌더링**:

```typescript
// 비멤버에게 보이는 것
if (!isMember) {
  switch (record.bubble.contentVisibility) {
    case 'rating_only':
      // 아바타 + 레벨 + 점수만 표시
      // comment, scene, likeCount, commentCount 숨김
      break;
    case 'rating_and_comment':
      // 아바타 + 레벨 + 점수 + 한줄평만 표시
      // scene, likeCount, commentCount 숨김 (BUBBLE.md §4-5: 비멤버는 "점수 + 한줄평"만)
      break;
  }
}
// 멤버: 모든 필드 표시
```

#### `src/presentation/components/detail/bubble-record-section.tsx`

```typescript
interface BubbleRecordSectionProps {
  targetId: string;
  targetType: 'restaurant' | 'wine';
}
```

**구조**:

```tsx
<section className="section">
  <SectionHeader icon="circle-dot" title="버블 기록" />
  <BubbleFilterChips ... />
  {records.length === 0 ? (
    <EmptyState
      icon="message-circle"       // 28px, --text-hint
      message="아직 버블 기록이 없어요"
    />
  ) : (
    <>
      {records.slice(0, 5).map(r => <BubbleRecordCard key={r.shareId} ... />)}
      {hasMore && <MoreLink href={`...`} label="더보기" />}
    </>
  )}
</section>
```

- `.section` padding: `16px 20px`
- 카드 간 gap: `8px`
- "더보기" 링크: `font-size: 13px; font-weight: 600; color: var(--accent-social); text-align: center; padding: 8px 0`

---

## 목업 매핑

| 목업 요소 | 컴포넌트 |
|----------|----------|
| 02_detail_restaurant.html Layer 9 필터 칩 | `<BubbleFilterChips>` |
| 02_detail_restaurant.html Layer 9 버블 카드 | `<BubbleRecordCard>` |
| 02_detail_restaurant.html Layer 9 전체 섹션 | `<BubbleRecordSection>` |
| 02_detail_wine.html Layer 9 (동일 구조) | 동일 컴포넌트, `accentType="wine"` |

---

## 데이터 흐름

```
[식당/와인 상세 페이지]
  → <BubbleRecordSection targetId={id} targetType="restaurant" />
    → useBubbleRecords(id, "restaurant")
      → Supabase: bubble_shares JOIN records JOIN users JOIN bubbles
      → 현재 유저 소속 버블 목록 조회 (bubble_members WHERE user_id = me)
      → content_visibility 조건 적용
      → records[] + availableBubbles[] 반환
    → <BubbleFilterChips> 렌더
    → records.map(r => <BubbleRecordCard isMember={소속여부} ... />)
      → isMember 판별: availableBubbles에 r.bubble.id 포함 여부

[필터 칩 탭]
  → setSelectedBubbleId(bubbleId)
    → useBubbleRecords 내부: WHERE bubble_id = selectedBubbleId 추가
    → 재조회 → 리렌더
```

---

## 검증 체크리스트

```
□ 식당 상세 L9: 버블 기록 섹션 L8 아래에 표시
□ 와인 상세 L9: 동일 구조, accent-wine 색상
□ 필터 칩: 전체 + 소속 버블별 단일 선택
□ 활성 칩: accent-food-light/accent-wine-light 배경, accent 보더+텍스트
□ 기록 카드: 아바타(32px) + 이름 + 레벨 배지 + 버블명 + 점수 + 한줄평
□ content_visibility='rating_only' 비멤버: 아바타 + Lv + 점수만
□ content_visibility='rating_and_comment' 비멤버: + 한줄평
□ 멤버: 모든 필드 표시
□ 최대 5개 + "더보기" 링크
□ 빈 상태: message-circle 28px + "아직 버블 기록이 없어요"
□ 카드 탭: scale(0.98) 피드백
□ 360px 레이아웃 정상
□ R1~R5 위반 없음
□ pnpm build / lint 통과
```
