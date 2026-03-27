# S7-T4: 댓글 + 리액션

> 피드 기록 리액션 3종(want/check/fire) + 좋아요(like) + 댓글(CRUD) + 찜 사이드이펙트 + 알림 연동.

---

## SSOT 출처

| 문서 | 참조 범위 |
|------|----------|
| `pages/08_BUBBLE.md` §9 | 리액션 3종 + 좋아요 + 찜 |
| `pages/08_BUBBLE.md` §10 | 댓글: 300자, 익명, 본인 삭제 |
| `systems/DATA_MODEL.md` §4 | comments 테이블, reactions 테이블 |
| `systems/AUTH.md` §4 | comments RLS (버블 멤버만), reactions RLS (본인만) |
| `systems/XP_SYSTEM.md` §4-3 | 소셜 XP: share +1, like +1 (일일 상한 10) |
| `prototype/04_bubbles_detail.html` | 피드 카드 리액션 행, 댓글 시트 |

---

## 선행 조건

- T7.1 완료: Reaction, Comment 엔티티, ReactionRepository, CommentRepository
- T7.3 완료: feed-card.tsx (리액션/댓글 표시 영역)

---

## 구현 범위

### 파일 목록

| 레이어 | 파일 | 설명 |
|--------|------|------|
| application | `src/application/hooks/use-reactions.ts` | 리액션 토글/조회 로직 |
| application | `src/application/hooks/use-comments.ts` | 댓글 CRUD 로직 |
| presentation/components | `src/presentation/components/bubble/reaction-buttons.tsx` | 리액션 3종 + 좋아요 버튼 |
| presentation/components | `src/presentation/components/bubble/comment-list.tsx` | 댓글 목록 |
| presentation/components | `src/presentation/components/bubble/comment-input.tsx` | 댓글 입력 |
| presentation/containers | `src/presentation/containers/comment-sheet-container.tsx` | 댓글 바텀 시트 컨테이너 |

### 스코프 외

- 홈화면 피드의 리액션 (S8 소셜 통합에서)
- 댓글에 대한 대댓글 (지원 안 함, 단일 레벨만)
- 리액션 알림 배치 처리 (기본 알림만, 배치 묶음은 S9)

---

## 상세 구현 지침

### 1. 리액션 시스템

#### 리액션 타입 정의 (BUBBLE.md §9)

##### 피드 기록 리액션 (3종)

| 유형 | reaction_type | lucide 아이콘 | 활성 색상 | 비활성 색상 | 의미 |
|------|--------------|--------------|----------|-----------|------|
| 원함 | `want` | bookmark-plus | `--primary` (#C17B5E) | `--text-hint` | 방문 의향 표시 |
| 확인 | `check` | check-circle-2 | `--positive` (#7EAE8B) | `--text-hint` | 같은 곳 방문 경험 공감 |
| 맛있어보인다 | `fire` | flame | #E55A35 | `--text-hint` | 시각적 공감 |

##### 액션 버튼 (리액션 행 우측)

| 유형 | reaction_type | lucide 아이콘 | 활성 색상 | 대상 |
|------|--------------|--------------|----------|------|
| 좋아요 | `like` | heart | `--negative` (#B87272) | 기록 전체 |
| 댓글 | — | message-circle | `--text-sub` | 기록에 댓글 (댓글 시트 오픈) |

##### 기타 리액션

| 유형 | 대상 | 의미 |
|------|------|------|
| 좋아요 `like` | comment | 공감/도움 (댓글에 대한 좋아요) |
| 찜 `bookmark` | record의 식당/와인 | wishlists INSERT 사이드이펙트 |

#### 리액션 규칙

- **중복 선택 가능**: want + check + fire 동시 가능
- **토글 방식**: 같은 리액션 다시 클릭 → 제거
- **UNIQUE 제약**: (target_type, target_id, reaction_type, user_id) — DB에서 보장
- **버블 피드 기록에서만 표시** (홈 피드에는 미노출)
- **리액션 수 합산 표시**: 각 타입별 카운트
- **내가 누른 것 강조**: 아이콘 색상 변경 (비활성 → 활성 색상)

#### `src/application/hooks/use-reactions.ts`

```typescript
// 의존: reactionRepo, wishlistRepo (DI)

interface UseReactionsReturn {
  // 특정 대상의 리액션 카운트
  counts: Record<ReactionType, number>;
  // 내가 누른 리액션 타입 목록
  myReactions: ReactionType[];
  // 토글 (추가/제거)
  toggle: (targetType: ReactionTargetType, targetId: string, reactionType: ReactionType) => Promise<void>;
  // 여러 대상의 리액션 일괄 로딩 (피드용)
  loadBatch: (targetType: ReactionTargetType, targetIds: string[]) => Promise<void>;
  isLoading: boolean;
}
```

**toggle 플로우**:

```
1. reactionRepo.toggle({ targetType, targetId, reactionType, userId })
   → added: true  → 리액션 추가됨
   → added: false → 리액션 제거됨

2. (added && reactionType === 'bookmark')
   → wishlists INSERT: {
       userId,
       targetId: record.targetId,     // 기록의 대상 (식당/와인 ID)
       targetType: record.targetType, // 'restaurant' | 'wine'
       source: 'bubble',
       sourceRecordId: targetId       // 원본 record_id
     }

3. (added && reactionType === 'like')
   → 소셜 XP 체크: getDailySocialXpCount(userId, today)
   → 일일 상한(10) 미만이면:
     → xp_histories INSERT: {
         userId: record.userId,   // 기록 작성자에게 XP
         reason: 'social_like',
         xpAmount: 1
       }
     → users.total_xp += 1

4. (added && (reactionType === 'like' || reactionType === 'want'))
   → 알림: reaction_like → 기록 작성자
     → metadata: { actor_name, target_name }

5. 낙관적 업데이트: counts/myReactions 즉시 갱신 (요청 실패 시 롤백)
```

### 2. 댓글 시스템

#### 댓글 규칙 (BUBBLE.md §10)

- **최대 300자**, 텍스트만 (이미지/링크 미지원)
- **`allow_comments` = false인 버블**: 댓글 비활성화 (입력 UI 숨김)
- **익명 옵션**: `is_anonymous = true` (버블 설정에서 허용/금지 제어는 MVP 이후)
- **본인만 삭제** 가능 (수정 없음)
- **bubble_id 컨텍스트**: 같은 기록이라도 버블마다 별개 댓글 스레드

#### `src/application/hooks/use-comments.ts`

```typescript
// 의존: commentRepo (DI)

interface UseCommentsReturn {
  comments: Comment[];
  total: number;
  create: (content: string, isAnonymous?: boolean) => Promise<void>;
  remove: (commentId: string) => Promise<void>;
  loadMore: () => Promise<void>;
  isLoading: boolean;
}

// 파라미터:
interface UseCommentsParams {
  targetType: 'record';
  targetId: string;
  bubbleId: string;
}
```

**create 플로우**:

```
1. 입력 검증:
   - content 빈 문자열 불가
   - content.length > 300 → 에러 "최대 300자까지 입력할 수 있습니다"
   - bubble.allowComments === false → 에러 (UI에서 사전 차단)

2. commentRepo.create({
     targetType: 'record',
     targetId,
     bubbleId,
     userId: currentUser.id,
     content: content.trim(),
     isAnonymous: isAnonymous ?? false
   })

3. 알림: comment_reply → 기록 작성자 (본인 댓글이면 알림 생략)
   → metadata: {
       actor_name: isAnonymous ? '익명' : currentUser.nickname,
       comment_preview: content.slice(0, 50)
     }

4. 낙관적 업데이트: comments 목록에 즉시 추가
```

**remove 플로우**:

```
1. commentRepo.delete(commentId, currentUser.id)
   → DB에서 user_id 확인 (본인만 삭제 가능)
2. 낙관적 업데이트: comments 목록에서 즉시 제거
```

### 3. Presentation 컴포넌트

#### `reaction-buttons.tsx`

**레이아웃** (피드 카드 하단):

```
┌──────────────────────────────────┐
│ 📌 3  ✓ 5  🔥 2  │  ❤️ 4  💬 2  │
│ (리액션 3종)       │ (좋아요+댓글)│
└──────────────────────────────────┘
```

```typescript
interface ReactionButtonsProps {
  targetType: ReactionTargetType;
  targetId: string;
  counts: Record<ReactionType, number>;
  myReactions: ReactionType[];
  commentCount: number;
  onToggle: (type: ReactionType) => void;
  onCommentClick: () => void;
  disabled?: boolean;               // 비멤버/follower → 전체 비활성
}
```

**개별 버튼 스타일**:

```tsx
// 버튼 하나의 구조
<button className={cn(
  "flex items-center gap-1 px-2 py-1 rounded-md text-xs",
  isActive ? activeColor : "text-text-hint"
)}>
  <Icon size={14} />
  <span>{count}</span>
</button>
```

**색상 매핑**:

| reactionType | 비활성 | 활성 |
|-------------|--------|------|
| want | `text-text-hint` | `text-primary` |
| check | `text-text-hint` | `text-positive` |
| fire | `text-text-hint` | `text-[#E55A35]` |
| like | `text-text-hint` | `text-negative` |

**구분선**: 리액션 3종과 좋아요+댓글 사이 `border-r border-line mx-1`

#### `comment-list.tsx`

```typescript
interface CommentListProps {
  comments: Comment[];
  currentUserId: string;
  onDelete: (commentId: string) => void;
  onLike: (commentId: string) => void;
}
```

**댓글 아이템 레이아웃**:

```
┌──────────────────────────────────┐
│ 👤 김영수  Lv.5       2시간 전   │ ← 아바타(24px) + 이름 + Lv + 시간
│ 메밀국수 여기 진짜 맛있어요       │ ← 본문 (text-sm, 줄바꿈 허용)
│ ❤️ 2              [삭제]         │ ← 좋아요 + 본인이면 삭제 버튼
└──────────────────────────────────┘
```

- 익명 댓글: 아바타 → 기본 회색 원, 이름 → "익명", Lv 숨김
- 본인 댓글: 우측 "삭제" 텍스트 버튼 (`text-negative text-xs`)
- 삭제 확인: "댓글을 삭제하시겠습니까?" 확인 다이얼로그

#### `comment-input.tsx`

```typescript
interface CommentInputProps {
  onSubmit: (content: string, isAnonymous: boolean) => void;
  isLoading: boolean;
  disabled?: boolean;                // allowComments=false 시
  disabledMessage?: string;          // "이 버블에서는 댓글이 비활성화되었습니다"
}
```

**레이아웃**:

```
┌──────────────────────────────────┐
│ [익명 토글]                       │ ← eye-off/eye 아이콘 토글
│ [댓글을 입력하세요...     ] [전송] │ ← TextArea + 전송 버튼
│                        42/300    │ ← 글자 수 카운터
└──────────────────────────────────┘
```

- disabled 시: 입력 영역 `opacity-50`, placeholder → disabledMessage
- 전송 버튼: `send` 아이콘, `text-primary` (활성) / `text-text-hint` (빈 입력)
- 글자 수: `text-xs text-text-hint`, 280자 이상 → `text-caution`, 300자 → `text-negative`

#### `comment-sheet-container.tsx`

피드 카드의 💬 클릭 시 바텀 시트로 열림.

```typescript
interface CommentSheetContainerProps {
  isOpen: boolean;
  onClose: () => void;
  targetId: string;                  // record_id
  bubbleId: string;
  allowComments: boolean;
}
```

**레이아웃**:

```
┌──────────────────────────────────┐
│ 댓글 (5)                  [✕]   │ ← 헤더 + 댓글 수 + 닫기
├──────────────────────────────────┤
│ (comment-list)                   │ ← 스크롤 영역
│ ...                              │
├──────────────────────────────────┤
│ (comment-input)                  │ ← 하단 고정
└──────────────────────────────────┘
```

---

## 목업 매핑

| 목업 요소 | 컴포넌트 | 프로토타입 참조 |
|----------|---------|---------------|
| 피드 카드 하단 리액션 행 | `reaction-buttons.tsx` | `04_bubbles_detail.html` .feed-actions |
| 댓글 시트 | `comment-sheet-container.tsx` | `04_bubbles_detail.html` comments 영역 |
| 댓글 아이템 | `comment-list.tsx` | `04_bubbles_detail.html` 댓글 개별 행 |
| 댓글 입력 | `comment-input.tsx` | `04_bubbles_detail.html` 댓글 입력 바 |

---

## 데이터 흐름

```
[리액션 토글]
  reaction-buttons → onToggle(type)
    → useReactions.toggle(targetType, targetId, type)
      → reactionRepo.toggle() → { added: true/false }
      → (bookmark + added) → wishlists INSERT (source='bubble')
      → (like + added) → 소셜 XP +1 (기록 작성자, 일일 상한 10 체크)
      → (like/want + added) → 알림: reaction_like → author
      → 낙관적 UI 갱신 (counts, myReactions)

[댓글 작성]
  comment-input → onSubmit(content, isAnonymous)
    → useComments.create(content, isAnonymous)
      → 입력 검증 (빈 문자열, 300자)
      → commentRepo.create({...})
      → 알림: comment_reply → 기록 작성자 (본인 제외)
      → 낙관적 UI 갱신 (comments 목록에 추가)

[댓글 삭제]
  comment-list → onDelete(commentId)
    → 확인 다이얼로그
    → useComments.remove(commentId)
      → commentRepo.delete(commentId, userId)
      → 낙관적 UI 갱신 (comments 목록에서 제거)

[댓글 좋아요]
  comment-list → onLike(commentId)
    → useReactions.toggle('comment', commentId, 'like')
      → reactionRepo.toggle()
```

---

## 검증 체크리스트

```
□ 리액션 3종 (want/check/fire): 아이콘 + 색상 + 카운트 정확
□ 중복 선택 가능 (want + fire 동시 등)
□ 토글 동작: 클릭 → 추가, 재클릭 → 제거
□ 좋아요 (like): heart 아이콘, --negative 색상
□ 비활성 상태: --text-hint 색상 (회색)
□ 활성 상태: 각 타입별 지정 색상
□ bookmark 리액션 → wishlists INSERT (source='bubble', sourceRecordId 설정)
□ like 리액션 → 소셜 XP +1 (기록 작성자에게, 일일 상한 10)
□ 알림: reaction_like (like/want 시 기록 작성자에게)
□ 알림: comment_reply (댓글 시 기록 작성자에게, 본인 제외)
□ 댓글 300자 제한 (UI 카운터 + 서버 검증)
□ 댓글 익명 토글 (isAnonymous)
□ 댓글 본인만 삭제 (DB WHERE user_id = userId)
□ 댓글 삭제 확인 다이얼로그
□ allowComments=false → 댓글 입력 비활성화
□ 비멤버/follower → 리액션/댓글 버튼 비활성
□ 낙관적 업데이트: 즉시 UI 갱신 + 실패 시 롤백
□ R1~R5 위반 없음
□ pnpm build / lint 에러 없음
□ 360px 모바일에서 레이아웃 정상
```
