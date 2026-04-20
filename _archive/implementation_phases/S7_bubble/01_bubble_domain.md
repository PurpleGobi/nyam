# S7-T1: 버블 Domain + Infrastructure

> 버블 시스템의 domain 엔티티, repository 인터페이스, Supabase 구현체, DI 등록까지 일괄 구축.

---

## SSOT 출처

| 문서 | 참조 범위 |
|------|----------|
| `systems/DATA_MODEL.md` §4 | bubbles, bubble_members, bubble_shares, comments, reactions, bubble_ranking_snapshots, follows 테이블 |
| `systems/AUTH.md` §2 | 버블 역할 4종, 가입 정책 5종, RLS 정책 |
| `pages/08_BUBBLE.md` §3~§10 | 버블 속성, 공개수위, 리액션, 댓글 |
| `systems/XP_SYSTEM.md` §4-3 | 소셜 XP 적립 규칙 |

---

## 선행 조건

- S1 완료: DB 스키마 (bubbles, bubble_members, bubble_shares, comments, reactions, bubble_ranking_snapshots 테이블)
- S6 완료: UserExperience, XpHistory, LevelThreshold 엔티티, Notification 엔티티

---

## 구현 범위

### 파일 목록

| 레이어 | 파일 | 설명 |
|--------|------|------|
| domain | `src/domain/entities/bubble.ts` | Bubble, BubbleMember, BubbleShare, BubbleShareRule, BubbleRankingSnapshot |
| domain | `src/domain/entities/comment.ts` | Comment |
| domain | `src/domain/entities/reaction.ts` | Reaction |
| domain | `src/domain/repositories/bubble-repository.ts` | BubbleRepository 인터페이스 |
| domain | `src/domain/repositories/comment-repository.ts` | CommentRepository 인터페이스 |
| domain | `src/domain/repositories/reaction-repository.ts` | ReactionRepository 인터페이스 |
| infrastructure | `src/infrastructure/repositories/supabase-bubble-repository.ts` | SupabaseBubbleRepository |
| infrastructure | `src/infrastructure/repositories/supabase-comment-repository.ts` | SupabaseCommentRepository |
| infrastructure | `src/infrastructure/repositories/supabase-reaction-repository.ts` | SupabaseReactionRepository |
| shared | `src/shared/di/container.ts` | DI 등록 (3개 repository 추가) |

### 스코프 외

- 버블 생성/가입 UI (→ 02_bubble_create.md)
- 버블 상세 페이지 (→ 03_bubble_detail.md)
- 댓글/리액션 UI 컴포넌트 (→ 04_comments_reactions.md)
- 역할 권한 검증 서비스 (→ 05_roles.md)
- 랭킹 크론 Edge Function (→ 06_ranking_cron.md)

---

## 상세 구현 지침

### 1. Domain 엔티티

#### `src/domain/entities/bubble.ts`

```typescript
export type BubbleVisibility = 'private' | 'public'
export type BubbleContentVisibility = 'rating_only' | 'rating_and_comment'
export type BubbleJoinPolicy = 'invite_only' | 'closed' | 'manual_approve' | 'auto_approve' | 'open'
export type BubbleFocusType = 'all' | 'restaurant' | 'wine'
export type BubbleMemberRole = 'owner' | 'admin' | 'member' | 'follower'
export type BubbleMemberStatus = 'pending' | 'active' | 'rejected'
export type BubbleShareRuleMode = 'all' | 'filtered'

export interface Bubble {
  id: string
  name: string
  description: string | null
  focusType: BubbleFocusType
  area: string | null
  visibility: BubbleVisibility
  contentVisibility: BubbleContentVisibility
  allowComments: boolean
  allowExternalShare: boolean
  joinPolicy: BubbleJoinPolicy
  minRecords: number
  minLevel: number
  maxMembers: number | null
  rules: string[] | null
  isSearchable: boolean
  searchKeywords: string[] | null
  followerCount: number
  memberCount: number
  recordCount: number
  avgSatisfaction: number | null
  lastActivityAt: string | null
  uniqueTargetCount: number
  weeklyRecordCount: number
  prevWeeklyRecordCount: number
  icon: string | null
  iconBgColor: string | null
  createdBy: string | null                   // user_id (탈퇴 시 null)
  inviteCode: string | null
  inviteExpiresAt: string | null
  createdAt: string
  updatedAt: string
}

/** 버블 멤버별 자동 공유 규칙 — 홈 FilterRule 재사용 */
export interface BubbleShareRule {
  mode: BubbleShareRuleMode
  rules: Array<{
    conjunction?: 'and' | 'or'
    attribute: string
    operator: string
    value: string | number | boolean | null
  }>
  conjunction: 'and' | 'or'
}

/** 가시성 오버라이드 7개 키 (users.visibility_bubble과 동일 구조) */
export interface VisibilityOverride {
  score: boolean
  comment: boolean
  photos: boolean
  level: boolean
  quadrant: boolean
  bubbles: boolean
  price: boolean
}

export interface BubbleMember {
  bubbleId: string
  userId: string
  role: BubbleMemberRole
  status: BubbleMemberStatus
  shareRule: BubbleShareRule | null          // 자동 공유 규칙 (030_bubble_share_rule.sql)
  visibilityOverride: VisibilityOverride | null
  tasteMatchPct: number | null
  commonTargetCount: number
  avgSatisfaction: number | null
  memberUniqueTargetCount: number
  weeklyShareCount: number
  badgeLabel: string | null
  joinedAt: string
}

export interface BubbleShare {
  id: string
  recordId: string
  bubbleId: string
  sharedBy: string
  sharedAt: string
  targetId: string                           // 공유 대상 식당/와인 ID
  targetType: 'restaurant' | 'wine'
}

// ─── 랭킹 스냅샷 (bubble_ranking_snapshots 테이블) ───

export type RankingTargetType = 'restaurant' | 'wine'

export interface BubbleRankingSnapshot {
  bubbleId: string
  targetId: string
  targetType: RankingTargetType
  periodStart: string
  rankPosition: number
  avgSatisfaction: number | null
  recordCount: number
}
```

> **참고**: `BubbleShareRead` 엔티티는 현재 코드에서 제거됨. `bubble_share_reads` 테이블은 DB에 존재하나 Entity로 매핑하지 않음.

#### `src/domain/entities/comment.ts`

```typescript
export type CommentTargetType = 'record';

export interface Comment {
  id: string;
  targetType: CommentTargetType;
  targetId: string;                    // record_id
  bubbleId: string | null;            // 버블 컨텍스트 (버블 삭제 시 CASCADE)
  userId: string | null;              // 탈퇴 시 NULL (익명화)
  content: string;                    // VARCHAR(300)
  isAnonymous: boolean;
  createdAt: string;
}
```

#### `src/domain/entities/reaction.ts`

```typescript
export type ReactionTargetType = 'record' | 'comment'

export type ReactionType = 'like' | 'bookmark' | 'want' | 'check' | 'fire'

export interface Reaction {
  id: string
  targetType: ReactionTargetType
  targetId: string
  reactionType: ReactionType
  userId: string | null              // 탈퇴 시 null
  createdAt: string
}

export const REACTION_CONFIG: Record<ReactionType, { icon: string; label: string; color: string }> = {
  want: { icon: 'bookmark-plus', label: '가고싶다', color: 'var(--accent-food)' },
  check: { icon: 'check-circle-2', label: '다녀왔다', color: 'var(--positive)' },
  fire: { icon: 'flame', label: '불꽃', color: '#E55A35' },
  like: { icon: 'heart', label: '좋아요', color: 'var(--negative)' },
  bookmark: { icon: 'bookmark', label: '저장', color: 'var(--accent-wine)' },
}
```

### 2. Repository 인터페이스

#### `src/domain/repositories/bubble-repository.ts`

```typescript
import type { Bubble, BubbleMember, BubbleMemberRole, BubbleMemberStatus, BubbleShare, BubbleRankingSnapshot, BubbleShareRule } from '@/domain/entities/bubble'

// ─── 헬퍼 타입 ───

export interface CreateBubbleInput {
  name: string
  description?: string
  focusType?: string
  area?: string
  visibility?: string
  contentVisibility?: string
  allowComments?: boolean
  allowExternalShare?: boolean
  joinPolicy?: string
  minRecords?: number
  minLevel?: number
  maxMembers?: number
  rules?: string[]
  isSearchable?: boolean
  searchKeywords?: string[]
  icon?: string
  iconBgColor?: string
  createdBy: string
}

export interface BubbleFeedItem {
  id: string
  recordId: string
  targetId?: string
  bubbleId: string
  bubbleName?: string
  bubbleIcon?: string
  sharedBy: string
  authorNickname?: string
  authorAvatar?: string | null
  authorAvatarColor?: string | null
  targetName?: string
  targetType?: 'restaurant' | 'wine'
  targetMeta?: string | null
  targetArea?: string | null
  targetPhotoUrl?: string | null
  targetVintage?: number | null
  targetWineType?: string | null
  targetProducer?: string | null
  targetCountry?: string | null
  satisfaction?: number | null
  axisX?: number | null
  axisY?: number | null
  comment?: string | null
  scene?: string | null
  visitDate?: string | null
  listStatus?: string | null
  sharedAt: string
}

export interface BubbleShareForTarget extends BubbleFeedItem {
  contentVisibility?: 'rating_only' | 'rating_and_comment'
  authorLevel?: number
  authorLevelTitle?: string
  likeCount?: number
  commentCount?: number
}

export interface UserBubbleMembership {
  bubbleId: string
  bubbleName?: string
  bubbleIcon?: string | null
  bubbleIconBgColor?: string | null
  status: string
  shareRule: BubbleShareRule | null
}

export interface MutualRecordItem {
  recordId: string
  targetId?: string
  targetName?: string
  targetType?: 'restaurant' | 'wine'
  satisfaction?: number | null
  comment?: string | null
  visitDate?: string | null
  authorNickname?: string
  authorAvatar?: string | null
  authorAvatarColor?: string | null
  createdAt: string
}

export interface BubbleRepository {
  // ─── Bubble CRUD ───
  create(input: CreateBubbleInput): Promise<Bubble>
  findById(id: string): Promise<Bubble | null>
  findByUserId(userId: string): Promise<Bubble[]>
  findPublic(options?: {
    search?: string
    focusType?: string
    area?: string
    sortBy?: 'latest' | 'members' | 'records' | 'activity'
    limit?: number
    offset?: number
  }): Promise<{ data: Bubble[]; total: number }>
  update(id: string, data: Partial<Bubble>): Promise<Bubble>
  delete(id: string): Promise<void>

  // ─── BubbleMember ───
  getMembers(bubbleId: string, options?: {
    role?: BubbleMemberRole
    status?: BubbleMemberStatus
    sortBy?: 'taste_match' | 'records' | 'level' | 'recent'
    limit?: number
    offset?: number
  }): Promise<{ data: BubbleMember[]; total: number }>
  getMember(bubbleId: string, userId: string): Promise<BubbleMember | null>
  getPendingMembers(bubbleId: string): Promise<BubbleMember[]>
  addMember(bubbleId: string, userId: string, role: string, status: string): Promise<BubbleMember>
  updateMember(bubbleId: string, userId: string, data: Partial<BubbleMember>): Promise<void>
  removeMember(bubbleId: string, userId: string): Promise<void>

  // ─── BubbleShare ───
  getShares(bubbleId: string, options?: {
    targetType?: 'restaurant' | 'wine'
    sharedBy?: string
    period?: 'week' | 'month' | '3months' | 'all'
    minSatisfaction?: number
    sortBy?: 'newest' | 'reactions' | 'score' | 'member'
    limit?: number
    offset?: number
  }): Promise<{ data: BubbleShare[]; total: number }>
  getEnrichedShares(bubbleId: string, options?: {
    limit?: number
    offset?: number
  }): Promise<{ data: BubbleFeedItem[]; total: number }>
  addShare(recordId: string, bubbleId: string, sharedBy: string, targetId: string, targetType: 'restaurant' | 'wine'): Promise<BubbleShare>
  removeShare(shareId: string): Promise<void>

  // ─── BubbleRankingSnapshot ───
  getRankings(bubbleId: string, options: {
    targetType: 'restaurant' | 'wine'
    periodStart?: string
    limit?: number
  }): Promise<BubbleRankingSnapshot[]>
  getPreviousRankings(bubbleId: string, targetType: 'restaurant' | 'wine', periodStart: string): Promise<BubbleRankingSnapshot[]>
  insertRankingSnapshots(snapshots: BubbleRankingSnapshot[]): Promise<void>

  // ─── 초대 코드 ───
  findByInviteCode(code: string): Promise<Bubble | null>
  generateInviteCode(bubbleId: string, expiresAt?: string | null): Promise<string>
  validateInviteCode(code: string): Promise<{ valid: boolean; bubble: Bubble | null; expired: boolean }>

  // ─── S8 추가 메서드 ───
  getSharesForTarget(targetId: string, targetType: string, bubbleIds: string[]): Promise<BubbleShareForTarget[]>
  getFeedFromBubbles(userId: string, targetType?: 'restaurant' | 'wine'): Promise<BubbleFeedItem[]>
  getRecentRecordsByUsers(userIds: string[], targetType?: 'restaurant' | 'wine'): Promise<MutualRecordItem[]>
  getUserBubbles(userId: string): Promise<UserBubbleMembership[]>
  getRecordShares(recordId: string): Promise<BubbleShare[]>
  shareRecord(recordId: string, bubbleId: string, userId: string, targetId: string, targetType: 'restaurant' | 'wine'): Promise<BubbleShare>
  unshareRecord(recordId: string, bubbleId: string): Promise<void>

  // ─── 자동 공유 동기화 ───
  updateShareRule(bubbleId: string, userId: string, shareRule: BubbleShareRule | null): Promise<void>
  batchUpsertAutoShares(records: Array<{ id: string; targetId: string; targetType: 'restaurant' | 'wine' }>, bubbleId: string, userId: string): Promise<void>
  batchDeleteAutoShares(recordIds: string[], bubbleId: string, userId: string): Promise<void>
  getAutoSharedRecordIds(bubbleId: string, userId: string): Promise<string[]>
  cleanManualShares(userId: string): Promise<number>
}
```

#### `src/domain/repositories/comment-repository.ts`

```typescript
import type { Comment } from '@/domain/entities/comment'

export interface CommentRepository {
  getById(id: string): Promise<Comment | null>
  getByTarget(targetType: string, targetId: string, bubbleId: string, options?: {
    limit?: number
    offset?: number
  }): Promise<{ data: Comment[]; total: number }>
  getCountByTarget(targetType: string, targetId: string, bubbleId: string): Promise<number>
  create(params: { targetType: string; targetId: string; bubbleId: string; userId: string; content: string; isAnonymous: boolean }): Promise<Comment>
  delete(commentId: string, userId: string): Promise<void>   // 본인만 삭제
}
```

#### `src/domain/repositories/reaction-repository.ts`

```typescript
import type { Reaction, ReactionType } from '@/domain/entities/reaction'

export interface ReactionRepository {
  getByTarget(targetType: string, targetId: string): Promise<Reaction[]>
  toggle(targetType: string, targetId: string, reactionType: ReactionType, userId: string): Promise<{ added: boolean }>
  getCountsByTarget(targetType: string, targetId: string): Promise<Record<ReactionType, number>>
  getUserReactions(userId: string, targetType: string, targetIds: string[]): Promise<Reaction[]>
  getDailySocialXpCount(userId: string, date: string): Promise<number>
}
```

### 3. Supabase 구현체

#### `src/infrastructure/repositories/supabase-bubble-repository.ts`

```typescript
import { createClient } from '@/infrastructure/supabase/client'
import type { BubbleRepository, CreateBubbleInput, BubbleFeedItem, BubbleShareForTarget, UserBubbleMembership, MutualRecordItem } from '@/domain/repositories/bubble-repository'
import type { Bubble, BubbleMember, BubbleMemberRole, BubbleMemberStatus, BubbleShare, BubbleRankingSnapshot, BubbleFocusType, BubbleVisibility, BubbleContentVisibility, BubbleJoinPolicy, VisibilityOverride, BubbleShareRule } from '@/domain/entities/bubble'
import { getLevelTitle } from '@/domain/services/xp-calculator'
```

**필드 매핑**: `BUBBLE_FIELD_MAP`과 `MEMBER_FIELD_MAP` 딕셔너리로 camelCase ↔ snake_case 변환 구현. `toEntityRow()` 헬퍼로 Entity → DB 변환, `toBubble()`/`toBubbleMember()` 함수로 DB → Entity 변환.

**변환 헬퍼 (실제 코드)**:

```typescript
function toBubble(row: Record<string, unknown>): Bubble {
  return {
    id: row.id as string,
    name: row.name as string,
    description: row.description as string | null,
    focusType: row.focus_type as BubbleFocusType,
    area: row.area as string | null,
    visibility: row.visibility as BubbleVisibility,
    contentVisibility: row.content_visibility as BubbleContentVisibility,
    allowComments: row.allow_comments as boolean,
    allowExternalShare: row.allow_external_share as boolean,
    joinPolicy: row.join_policy as BubbleJoinPolicy,
    minRecords: row.min_records as number,
    minLevel: row.min_level as number,
    maxMembers: row.max_members as number | null,
    rules: row.rules as string[] | null,
    isSearchable: row.is_searchable as boolean,
    searchKeywords: row.search_keywords as string[] | null,
    followerCount: (row.follower_count as number) ?? 0,
    memberCount: (row.member_count as number) ?? 0,
    recordCount: (row.record_count as number) ?? 0,
    avgSatisfaction: row.avg_satisfaction as number | null,
    lastActivityAt: row.last_activity_at as string | null,
    uniqueTargetCount: (row.unique_target_count as number) ?? 0,
    weeklyRecordCount: (row.weekly_record_count as number) ?? 0,
    prevWeeklyRecordCount: (row.prev_weekly_record_count as number) ?? 0,
    icon: row.icon as string | null,
    iconBgColor: row.icon_bg_color as string | null,
    createdBy: row.created_by as string | null,
    inviteCode: row.invite_code as string | null,
    inviteExpiresAt: row.invite_expires_at as string | null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  }
}

function toBubbleMember(row: Record<string, unknown>): BubbleMember {
  return {
    bubbleId: row.bubble_id as string,
    userId: row.user_id as string,
    role: row.role as BubbleMemberRole,
    status: row.status as BubbleMemberStatus,
    shareRule: row.share_rule as BubbleShareRule | null,
    visibilityOverride: row.visibility_override as VisibilityOverride | null,
    tasteMatchPct: row.taste_match_pct as number | null,
    commonTargetCount: (row.common_target_count as number) ?? 0,
    avgSatisfaction: row.avg_satisfaction as number | null,
    memberUniqueTargetCount: (row.member_unique_target_count as number) ?? 0,
    weeklyShareCount: (row.weekly_share_count as number) ?? 0,
    badgeLabel: row.badge_label as string | null,
    joinedAt: row.joined_at as string,
  }
}

function toBubbleShare(row: Record<string, unknown>): BubbleShare {
  return {
    id: row.id as string,
    recordId: row.record_id as string,
    bubbleId: row.bubble_id as string,
    sharedBy: row.shared_by as string,
    sharedAt: row.shared_at as string,
    targetId: row.target_id as string,
    targetType: row.target_type as 'restaurant' | 'wine',
  }
}
```

**구현 주의사항**:

1. `create()`: INSERT 후 createdBy를 owner로 `bubble_members`에도 INSERT (role='owner', status='active')
2. `generateInviteCode()`: 8자 랜덤 영숫자 (`crypto.randomUUID().slice(0, 8)`)
3. `validateInviteCode()`: invite_expires_at 체크, 만료된 코드는 `expired: true` 반환
4. `getEnrichedShares()`: bubble_shares JOIN records JOIN (restaurants | wines) — targetType에 따라 BubbleFeedItem 반환
5. Entity → DB 변환 시 `toEntityRow()` + `BUBBLE_FIELD_MAP` 활용
6. `findPublic()`: `visibility = 'public' AND is_searchable = true` 조건 기본
7. `addShare()`: recordId, bubbleId, sharedBy, targetId, targetType 개별 인자
8. 자동 공유 동기화: `updateShareRule()`, `batchUpsertAutoShares()`, `batchDeleteAutoShares()`, `getAutoSharedRecordIds()`, `cleanManualShares()`

#### `src/infrastructure/repositories/supabase-comment-repository.ts`

```typescript
import type { CommentRepository } from '@/domain/repositories/comment-repository';
import type { Comment } from '@/domain/entities/comment';
```

**변환 헬퍼**:

```typescript
function toComment(row: Record<string, unknown>): Comment {
  return {
    id: row.id as string,
    targetType: row.target_type as CommentTargetType,
    targetId: row.target_id as string,
    bubbleId: row.bubble_id as string | null,
    userId: row.user_id as string | null,
    content: row.content as string,
    isAnonymous: row.is_anonymous as boolean,
    createdAt: row.created_at as string,
  };
}
```

**구현 주의사항**:

1. `delete()`: WHERE id = id AND user_id = userId — 본인만 삭제 가능
2. `getByTarget()`: ORDER BY created_at ASC (시간순)
3. `create()`: content 길이 300자 초과 시 에러 (domain 검증)

#### `src/infrastructure/repositories/supabase-reaction-repository.ts`

```typescript
import type { ReactionRepository } from '@/domain/repositories/reaction-repository';
import type { Reaction, ReactionType } from '@/domain/entities/reaction';
```

**변환 헬퍼**:

```typescript
function toReaction(row: Record<string, unknown>): Reaction {
  return {
    id: row.id as string,
    targetType: row.target_type as ReactionTargetType,
    targetId: row.target_id as string,
    reactionType: row.reaction_type as ReactionType,
    userId: row.user_id as string,
    createdAt: row.created_at as string,
  };
}
```

**구현 주의사항**:

1. `toggle()`: UNIQUE(target_type, target_id, reaction_type, user_id) 제약 활용
   - 존재하면 DELETE → `{ added: false }`
   - 없으면 INSERT → `{ added: true }`
2. `getCountsByTarget()`: GROUP BY reaction_type, COUNT(*)
3. `getDailySocialXpCount()`: xp_histories에서 해당 날짜의 소셜 XP 합산 조회 (일일 상한 10 XP 체크용)
4. `bookmark` 타입 toggle 시 added=true면 wishlists INSERT 사이드이펙트 (application layer에서 처리)

### 4. DI 등록

#### `src/shared/di/container.ts` 추가 사항

```typescript
import { SupabaseBubbleRepository } from '@/infrastructure/repositories/supabase-bubble-repository'
import { SupabaseCommentRepository } from '@/infrastructure/repositories/supabase-comment-repository'
import { SupabaseReactionRepository } from '@/infrastructure/repositories/supabase-reaction-repository'
import type { BubbleRepository } from '@/domain/repositories/bubble-repository'
import type { CommentRepository } from '@/domain/repositories/comment-repository'
import type { ReactionRepository } from '@/domain/repositories/reaction-repository'

export const bubbleRepo: BubbleRepository = new SupabaseBubbleRepository()
export const commentRepo: CommentRepository = new SupabaseCommentRepository()
export const reactionRepo: ReactionRepository = new SupabaseReactionRepository()
```

**추가 유틸리티**: `uploadBubbleIcon(file, userId)` — 버블 아이콘 이미지를 256x256 WebP로 리사이즈 후 `avatars` 버킷에 업로드.

---

## 목업 매핑

| 목업 | 엔티티 매핑 |
|------|------------|
| `04_bubbles.html` 버블 리스트 | `Bubble` (icon, name, memberCount, recordCount) |
| `04_bubbles_detail.html` 히어로 | `Bubble` (icon, name, description, memberCount) |
| `04_bubbles_detail.html` 멤버 카드 | `BubbleMember` (role, tasteMatchPct, memberUniqueTargetCount) |
| `04_bubbles_detail.html` 피드 카드 | `BubbleShare` → `Record` → `Restaurant`/`Wine` |
| `04_bubbles_detail.html` 랭킹 | `BubbleRankingSnapshot` (rankPosition, avgSatisfaction) |
| `04_bubbles_detail.html` 리액션 | `Reaction` (want, check, fire, like) |
| `04_bubbles_detail.html` 댓글 | `Comment` (content, isAnonymous) |

---

## 데이터 흐름

```
[생성]
  UI → useBubbleCreate() → bubbleRepo.create(input: CreateBubbleInput)
    → INSERT bubbles + INSERT bubble_members(role='owner')
    → return Bubble

[멤버 가입]
  UI → useBubbleJoin() → bubbleRepo.addMember(bubbleId, userId, role, status)
    → INSERT bubble_members
    → (auto_approve) XP/기록 수 검증 → status='active'
    → (manual_approve) status='pending' → 알림 → owner 승인
    → (open) status='active' 즉시

[기록 공유]
  UI → useShareRecord() → bubbleRepo.addShare(recordId, bubbleId, sharedBy, targetId, targetType)
    → INSERT bubble_shares
    → bubbles.record_count++ (트리거)
    → bubbles.last_activity_at = NOW() (트리거)

[자동 공유 동기화]
  use-bubble-auto-sync → bubble-share-sync.evaluateShareRule()
    → computeShareDiff(shouldShareIds, currentlySharedIds)
    → bubbleRepo.batchUpsertAutoShares() / batchDeleteAutoShares()

[리액션 토글]
  UI → useReactions() → reactionRepo.toggle(targetType, targetId, reactionType, userId)
    → INSERT or DELETE reactions
    → (bookmark 추가 시) wishlists INSERT (application layer)
    → (like 추가 시) 소셜 XP +1 (일일 상한 10 체크)

[댓글 작성]
  UI → useComments() → commentRepo.create({ targetType, targetId, bubbleId, userId, content, isAnonymous })
    → INSERT comments
    → 알림: comment_reply → author
```

---

## 검증 체크리스트

```
☑ domain/entities/bubble.ts — Bubble, BubbleMember, BubbleShare, BubbleShareRule, BubbleRankingSnapshot 타입 정의
☑ domain/entities/comment.ts — Comment 타입 정의
☑ domain/entities/reaction.ts — Reaction, ReactionType, REACTION_CONFIG 타입 정의
☑ domain/repositories/ — BubbleRepository, CommentRepository, ReactionRepository 인터페이스
☑ domain/services/bubble-share-sync.ts — evaluateShareRule, matchesShareRule, computeShareDiff
☑ infrastructure/repositories/ — 3개 Supabase 구현체, implements 키워드 사용
☑ shared/di/container.ts — 3개 repository 등록 + uploadBubbleIcon 유틸리티
☑ R1: domain에 React/Supabase/Next import 없음
☑ R2: infrastructure에 implements 키워드 존재
☑ R3: application에 infrastructure 직접 import 없음
☑ snake_case → camelCase 변환 정확 (BUBBLE_FIELD_MAP, MEMBER_FIELD_MAP)
☑ BubbleShare에 targetId/targetType 필드 포함
☑ BubbleMember에 shareRule 필드 포함
☑ Reaction.userId nullable (탈퇴 처리)
☑ pnpm build 에러 없음
☑ pnpm lint 경고 0개
```
