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
src/presentation/components/detail/bubble-expand-panel.tsx    ← 버블별 평균 점수 확장 패널
src/application/hooks/use-bubble-records.ts
src/application/hooks/use-user-bubbles.ts                     ← 현재 유저 소속 버블 목록 조회
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
  shareId: string
  recordId: string
  bubbleId: string
  bubbleName: string
  sharedBy: string
  authorNickname: string
  authorAvatar: string | null
  authorAvatarColor: string | null
  authorLevel: number
  authorLevelTitle: string
  satisfaction: number | null
  axisX: number | null              // 사분면 X축 좌표
  axisY: number | null              // 사분면 Y축 좌표
  comment: string | null
  scene: string | null
  visitDate: string | null
  likeCount: number
  commentCount: number
  sharedAt: string
  contentVisibility: 'rating_only' | 'rating_and_comment'
  /** 현재 뷰어가 해당 버블 멤버인지 */
  isMember: boolean
}

interface UseBubbleRecordsResult {
  records: BubbleRecordItem[]       // 최대 5개
  isLoading: boolean
  hasMore: boolean                  // 5개 초과 시 true
  selectedBubbleId: string | null
  setSelectedBubbleId: (id: string | null) => void
  refresh: () => void
}

export function useBubbleRecords(
  targetId: string,
  targetType: 'restaurant' | 'wine',
  userBubbleIds: string[],          // useUserBubbles에서 가져온 소속 버블 ID 목록
): UseBubbleRecordsResult
```

**주요 동작**:
- `bubbleRepo.getSharesForTarget(targetId, targetType, userBubbleIds)` 호출하여 해당 대상의 버블 공유 기록 조회
- `isMember` 판별: `userBubbleIds.includes(record.bubbleId)`
- `selectedBubbleId` 필터링: 선택된 버블이 있으면 해당 버블 기록만 표시
- 결과를 최대 5개로 제한, `hasMore = filtered.length > 5`
- `userBubbleIds` 변화 감지를 위해 `useRef` + join 키 패턴 사용

#### `src/application/hooks/use-user-bubbles.ts`

현재 로그인 유저의 소속 버블 목록을 조회하는 훅. `BubbleRecordSection`과 `BubbleFilterChips`에서 사용.

### 2. Presentation Layer

#### `src/presentation/components/detail/bubble-filter-chips.tsx`

```typescript
interface BubbleChipItem {
  id: string
  name: string
  icon: string | null
  iconBgColor: string | null
}

interface BubbleFilterChipsProps {
  bubbles: BubbleChipItem[]
  selectedId: string | null
  onSelect: (id: string | null) => void
}
```

**구현 특징**:
- 공통 `FilterChipGroup` UI 컴포넌트 래핑 사용
- "전체" 칩 + 소속 버블별 칩
- 활성 칩: `BubbleIcon` + 이름 + `Check` 아이콘, 버블의 `iconBgColor` 배경
- 비활성 칩: `filter-chip` 기본 스타일
- 단일 선택 (radio) — 같은 칩 재탭 시 `null`(전체)로 토글

#### `src/presentation/components/detail/bubble-record-card.tsx`

```typescript
interface BubbleRecordCardProps {
  authorNickname: string
  authorAvatar: string | null
  authorAvatarColor: string | null
  authorLevel: number
  authorLevelTitle: string
  satisfaction: number | null
  axisX: number | null
  axisY: number | null
  comment: string | null
  scene: string | null
  visitDate: string | null
  /** 현재 뷰어가 해당 버블 멤버인지 */
  isMember: boolean
  /** 버블의 콘텐츠 가시성 설정 */
  contentVisibility: 'rating_only' | 'rating_and_comment'
  accentType: 'food' | 'wine'
  onPress?: () => void
}
```

**카드 레이아웃**:

```
┌────────────────────────────────────────────────────┐
│ [아바타40] 이름 [레벨타이틀 Lv.N]   [미니사분면] 점수 │
│           한줄평 · 상황 · 방문일                     │
└────────────────────────────────────────────────────┘
```

**스타일**:

| 요소 | CSS |
|------|-----|
| 카드 행 | `flex items-center gap-3; padding: 8px 0; active:scale-[0.985]` |
| 아바타 | `40×40px; border-radius: 50%`, `avatarColor` 배경, 이니셜 or Image |
| 사용자명 | `13px 700 var(--text); truncate` |
| 레벨 뱃지 | `10px 500; bg: var(--bg-section); color: var(--text-sub); border-radius: 4px; padding: 1px 5px` |
| 미니 사분면 | `<MiniQuadrant>` 48px — axisX/axisY/satisfaction 존재 시 표시 |
| 점수 | `18px 800`, `getGaugeColor(satisfaction)` 동적 색상, 우측 정렬 |
| 한줄평 | `11px var(--text-sub); truncate` — showComment 조건 |
| 메타 (상황+방문일) | `11px var(--text-hint)` — showMeta 조건 (멤버만) |

**content_visibility 제한 렌더링**:

```typescript
const showComment = isMember || contentVisibility === 'rating_and_comment'
const showMeta = isMember
```

- 비멤버 + `rating_only`: 아바타 + 레벨 + 점수(+사분면)만 표시
- 비멤버 + `rating_and_comment`: + 한줄평 추가 표시
- 멤버: 모든 필드(한줄평, 상황, 방문일) 표시

#### `src/presentation/components/detail/bubble-expand-panel.tsx`

버블별 평균 점수를 확장 패널 형태로 표시하는 컴포넌트.

```typescript
interface BubbleScore {
  bubbleId: string
  bubbleName: string
  icon: string | null
  iconBgColor: string | null
  ratingCount: number
  avgScore: number | null
}

interface BubbleExpandPanelProps {
  isOpen: boolean
  bubbleScores: BubbleScore[]
  accentColor: string   // '--accent-food' | '--accent-wine'
}
```

- 버블 아이콘(24px) + 버블명 + "N명 평가" + 평균 점수 표시
- `maxHeight` 애니메이션으로 열림/닫힘 전환 (0.25s ease)

#### `src/presentation/components/detail/bubble-record-section.tsx`

```typescript
interface BubbleRecordSectionProps {
  targetId: string
  targetType: 'restaurant' | 'wine'
}
```

**구현 특징**:
- `useAuth()`로 현재 유저 조회
- `useUserBubbles(userId)`로 소속 버블 목록 + bubbleIds 가져옴
- `useBubbleRecords(targetId, targetType, userBubbleIds)`로 기록 조회
- 헤더: `CircleDot` 아이콘(14px) + "버블 기록" (15px 700)
- 빈 상태: `MessageCircle`(28px) + "아직 버블 기록이 없어요" + "버블에서 {이 식당/이 와인}에 대한 이야기를 나눠보세요"
- 더보기 버튼: `13px 600 var(--accent-social); text-align: center`

---

## 목업 매핑

| 목업 요소 | 컴포넌트 |
|----------|----------|
| 02_detail_restaurant.html Layer 9 필터 칩 | `<BubbleFilterChips>` |
| 02_detail_restaurant.html Layer 9 버블 카드 | `<BubbleRecordCard>` |
| 02_detail_restaurant.html Layer 9 전체 섹션 | `<BubbleRecordSection>` |
| 02_detail_wine.html Layer 9 (동일 구조) | 동일 컴포넌트, `targetType="wine"` |

---

## 데이터 흐름

```
[식당/와인 상세 페이지]
  → <BubbleRecordSection targetId={id} targetType="restaurant" />
    → useAuth() → user.id
    → useUserBubbles(userId) → bubbles[], bubbleIds[]
    → useBubbleRecords(id, "restaurant", bubbleIds)
      → bubbleRepo.getSharesForTarget(targetId, targetType, bubbleIds)
      → isMember 판별: userBubbleIds.includes(record.bubbleId)
      → records[] 반환 (최대 5개)
    → <BubbleFilterChips> 렌더 (useUserBubbles 결과 사용)
    → records.map(r => <BubbleRecordCard
        isMember={r.isMember}
        contentVisibility={r.contentVisibility}
        ... />)

[필터 칩 탭]
  → setSelectedBubbleId(bubbleId)
    → useBubbleRecords 내부 필터링 (records.filter(r => r.bubbleId === selectedBubbleId))
    → 리렌더
```

---

## 검증 체크리스트

```
□ 식당 상세 L9: 버블 기록 섹션 L8 아래에 표시
□ 와인 상세 L9: 동일 구조, accentType="wine"
□ 필터 칩: 전체 + 소속 버블별 단일 선택
□ 활성 칩: iconBgColor 배경, 흰색 텍스트, Check 아이콘
□ 기록 카드: 아바타(40px) + 이름 + 레벨 배지 + 미니사분면 + 점수
□ content_visibility='rating_only' 비멤버: 아바타 + Lv + 점수(+사분면)만
□ content_visibility='rating_and_comment' 비멤버: + 한줄평
□ 멤버: 모든 필드 표시 (한줄평, 상황, 방문일)
□ 최대 5개 + "더보기" 버튼
□ 빈 상태: MessageCircle 28px + "아직 버블 기록이 없어요"
□ 카드 탭: scale(0.985) 피드백
□ 360px 레이아웃 정상
□ R1~R5 위반 없음
□ pnpm build / lint 통과
```
