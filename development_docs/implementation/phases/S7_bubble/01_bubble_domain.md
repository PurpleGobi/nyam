# S7-T1: 버블 Domain + Infrastructure

> 버블 시스템의 domain 엔티티, repository 인터페이스, Supabase 구현체, DI 등록까지 일괄 구축.

---

## SSOT 출처

| 문서 | 참조 범위 |
|------|----------|
| `systems/DATA_MODEL.md` §4 | bubbles, bubble_members, bubble_shares, comments, reactions, bubble_share_reads, bubble_ranking_snapshots, follows 테이블 |
| `systems/AUTH.md` §2 | 버블 역할 4종, 가입 정책 5종, RLS 정책 |
| `pages/08_BUBBLE.md` §3~§10 | 버블 속성, 공개수위, 리액션, 댓글 |
| `systems/XP_SYSTEM.md` §4-3 | 소셜 XP 적립 규칙 |

---

## 선행 조건

- S1 완료: DB 스키마 (bubbles, bubble_members, bubble_shares, comments, reactions, bubble_share_reads, bubble_ranking_snapshots 테이블)
- S6 완료: UserExperience, XpHistory, LevelThreshold 엔티티, Notification 엔티티

---

## 구현 범위

### 파일 목록

| 레이어 | 파일 | 설명 |
|--------|------|------|
| domain | `src/domain/entities/bubble.ts` | Bubble, BubbleMember, BubbleShare, BubbleShareRead, BubbleRankingSnapshot |
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
// ─── 버블 (bubbles 테이블) ───

export type BubbleVisibility = 'private' | 'public';

export type BubbleContentVisibility = 'rating_only' | 'rating_and_comment';

export type BubbleJoinPolicy =
  | 'invite_only'       // 비공개: 초대받은 사람만
  | 'closed'            // 공개: 팔로우만 (가입 안 받음)
  | 'manual_approve'    // 공개: 가입 신청 → 승인/거절
  | 'auto_approve'      // 공개: 기준 충족 시 자동 가입
  | 'open';             // 공개: 누구나 즉시 가입

export type BubbleFocusType = 'all' | 'restaurant' | 'wine';

export interface Bubble {
  id: string;
  name: string;                              // VARCHAR(20)
  description: string | null;                // VARCHAR(100)
  focusType: BubbleFocusType;
  area: string | null;                       // 주요 지역
  visibility: BubbleVisibility;
  contentVisibility: BubbleContentVisibility;
  allowComments: boolean;
  allowExternalShare: boolean;

  // 가입 정책
  joinPolicy: BubbleJoinPolicy;
  minRecords: number;                        // 가입 최소 기록 수 (기본 0)
  minLevel: number;                          // 가입 최소 레벨 (기본 0)
  maxMembers: number | null;                 // 최대 인원 (NULL=무제한)
  rules: string[] | null;                    // 버블 규칙 텍스트 배열

  // 검색
  isSearchable: boolean;
  searchKeywords: string[] | null;

  // 비정규화 카운트 (트리거/크론 갱신)
  followerCount: number;
  memberCount: number;
  recordCount: number;
  avgSatisfaction: number | null;            // DECIMAL(4,1)
  lastActivityAt: string | null;

  // 통계 캐시 (크론 갱신)
  uniqueTargetCount: number;
  weeklyRecordCount: number;
  prevWeeklyRecordCount: number;

  // 아이콘
  icon: string | null;                       // lucide 아이콘명 또는 커스텀 이미지 URL
  iconBgColor: string | null;                // hex (#F5EDE8 등)

  // 관리
  createdBy: string;                         // user_id
  inviteCode: string | null;
  inviteExpiresAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// ─── 버블 멤버 (bubble_members 테이블) ───

export type BubbleMemberRole = 'owner' | 'admin' | 'member' | 'follower';

export type BubbleMemberStatus = 'pending' | 'active' | 'rejected';

/** 가시성 오버라이드 7개 키 */
export interface VisibilityOverride {
  score: boolean;
  comment: boolean;
  photos: boolean;
  level: boolean;
  quadrant: boolean;
  bubbles: boolean;
  price: boolean;
}

export interface BubbleMember {
  bubbleId: string;
  userId: string;
  role: BubbleMemberRole;
  status: BubbleMemberStatus;
  visibilityOverride: VisibilityOverride | null;   // NULL → users.visibility_bubble 사용

  // 멤버 활동 캐시 (크론 갱신)
  tasteMatchPct: number | null;                     // 0.0~100.0 (뷰어 상대)
  commonTargetCount: number;
  avgSatisfaction: number | null;
  memberUniqueTargetCount: number;
  weeklyShareCount: number;
  badgeLabel: string | null;                        // "🧭 탐험왕" 등

  joinedAt: string;
}

// ─── 버블 공유 (bubble_shares 테이블) ───

export interface BubbleShare {
  id: string;
  recordId: string;
  bubbleId: string;
  sharedBy: string;                                  // user_id
  sharedAt: string;
}

// ─── 공유 읽음 (bubble_share_reads 테이블) ───

export interface BubbleShareRead {
  shareId: string;
  userId: string;
  readAt: string;
}

// ─── 랭킹 스냅샷 (bubble_ranking_snapshots 테이블) ───

export type RankingTargetType = 'restaurant' | 'wine';

export interface BubbleRankingSnapshot {
  bubbleId: string;
  targetId: string;
  targetType: RankingTargetType;
  periodStart: string;                              // DATE (월요일)
  rankPosition: number;
  avgSatisfaction: number | null;
  recordCount: number;
}
```

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
export type ReactionTargetType = 'record' | 'comment';

export type ReactionType =
  | 'like'       // 좋아요 (heart)
  | 'bookmark'   // 찜 → wishlists INSERT 트리거
  | 'want'       // "가고싶다" (bookmark-plus)
  | 'check'      // "나도가봤어" (check-circle-2)
  | 'fire';      // "맛있어보인다" (flame)

export interface Reaction {
  id: string;
  targetType: ReactionTargetType;
  targetId: string;
  reactionType: ReactionType;
  userId: string;
  createdAt: string;
}
```

### 2. Repository 인터페이스

#### `src/domain/repositories/bubble-repository.ts`

```typescript
import type { Bubble, BubbleMember, BubbleMemberRole, BubbleMemberStatus, BubbleShare, BubbleShareRead, BubbleRankingSnapshot } from '@/domain/entities/bubble';

export interface BubbleRepository {
  // ─── Bubble CRUD ───
  create(bubble: Omit<Bubble, 'id' | 'createdAt' | 'updatedAt' | 'followerCount' | 'memberCount' | 'recordCount' | 'avgSatisfaction' | 'lastActivityAt' | 'uniqueTargetCount' | 'weeklyRecordCount' | 'prevWeeklyRecordCount'>): Promise<Bubble>;
  getById(id: string): Promise<Bubble | null>;
  update(id: string, data: Partial<Omit<Bubble, 'id' | 'createdAt' | 'createdBy'>>): Promise<Bubble>;
  delete(id: string): Promise<void>;

  // ─── 검색/탐색 ───
  getByInviteCode(code: string): Promise<Bubble | null>;
  getPublicBubbles(options: {
    search?: string;
    focusType?: string;
    area?: string;
    sortBy?: 'latest' | 'members' | 'records' | 'activity';
    limit?: number;
    offset?: number;
  }): Promise<{ data: Bubble[]; total: number }>;
  getUserBubbles(userId: string): Promise<Bubble[]>;

  // ─── BubbleMember CRUD ───
  addMember(member: Omit<BubbleMember, 'tasteMatchPct' | 'commonTargetCount' | 'avgSatisfaction' | 'memberUniqueTargetCount' | 'weeklyShareCount' | 'badgeLabel' | 'joinedAt'>): Promise<BubbleMember>;
  getMember(bubbleId: string, userId: string): Promise<BubbleMember | null>;
  getMembers(bubbleId: string, options?: {
    role?: BubbleMemberRole;
    status?: BubbleMemberStatus;
    sortBy?: 'taste_match' | 'records' | 'level' | 'recent';
    limit?: number;
    offset?: number;
  }): Promise<{ data: BubbleMember[]; total: number }>;
  getPendingMembers(bubbleId: string): Promise<BubbleMember[]>;
  updateMemberRole(bubbleId: string, userId: string, role: BubbleMemberRole): Promise<void>;
  updateMemberStatus(bubbleId: string, userId: string, status: BubbleMemberStatus): Promise<void>;
  removeMember(bubbleId: string, userId: string): Promise<void>;

  // ─── BubbleShare CRUD ───
  shareRecord(share: Omit<BubbleShare, 'id' | 'sharedAt'>): Promise<BubbleShare>;
  unshareRecord(recordId: string, bubbleId: string): Promise<void>;
  getShares(bubbleId: string, options?: {
    targetType?: 'restaurant' | 'wine';
    sharedBy?: string;
    period?: 'week' | 'month' | '3months' | 'all';
    minSatisfaction?: number;
    sortBy?: 'newest' | 'reactions' | 'score' | 'member';
    limit?: number;
    offset?: number;
  }): Promise<{ data: BubbleShare[]; total: number }>;
  getSharesByRecord(recordId: string): Promise<BubbleShare[]>;

  // ─── BubbleShareRead ───
  markShareRead(shareId: string, userId: string): Promise<void>;
  getShareReads(shareId: string): Promise<BubbleShareRead[]>;

  // ─── BubbleRankingSnapshot ───
  getRankings(bubbleId: string, options: {
    targetType: 'restaurant' | 'wine';
    periodStart?: string;
    limit?: number;
  }): Promise<BubbleRankingSnapshot[]>;
  getPreviousRankings(bubbleId: string, targetType: 'restaurant' | 'wine', periodStart: string): Promise<BubbleRankingSnapshot[]>;
  insertRankingSnapshots(snapshots: BubbleRankingSnapshot[]): Promise<void>;

  // ─── 초대 코드 ───
  generateInviteCode(bubbleId: string, expiresAt: string | null): Promise<string>;
  validateInviteCode(code: string): Promise<{ valid: boolean; bubble: Bubble | null; expired: boolean }>;
}
```

#### `src/domain/repositories/comment-repository.ts`

```typescript
import type { Comment } from '@/domain/entities/comment';

export interface CommentRepository {
  create(comment: Omit<Comment, 'id' | 'createdAt'>): Promise<Comment>;
  getById(id: string): Promise<Comment | null>;
  getByTarget(targetType: string, targetId: string, bubbleId: string, options?: {
    limit?: number;
    offset?: number;
  }): Promise<{ data: Comment[]; total: number }>;
  delete(id: string, userId: string): Promise<void>;   // 본인만 삭제
  getCountByTarget(targetType: string, targetId: string, bubbleId: string): Promise<number>;
}
```

#### `src/domain/repositories/reaction-repository.ts`

```typescript
import type { Reaction, ReactionType, ReactionTargetType } from '@/domain/entities/reaction';

export interface ReactionRepository {
  toggle(reaction: Omit<Reaction, 'id' | 'createdAt'>): Promise<{ added: boolean }>;
  getByTarget(targetType: ReactionTargetType, targetId: string): Promise<Reaction[]>;
  getCountsByTarget(targetType: ReactionTargetType, targetId: string): Promise<Record<ReactionType, number>>;
  getUserReactions(userId: string, targetType: ReactionTargetType, targetIds: string[]): Promise<Reaction[]>;
  getDailySocialXpCount(userId: string, date: string): Promise<number>;
}
```

### 3. Supabase 구현체

#### `src/infrastructure/repositories/supabase-bubble-repository.ts`

```typescript
import type { BubbleRepository } from '@/domain/repositories/bubble-repository';
import type { Bubble, BubbleMember, BubbleMemberRole, BubbleMemberStatus, BubbleShare, BubbleShareRead, BubbleRankingSnapshot } from '@/domain/entities/bubble';
import { createClient } from '@/infrastructure/supabase/client';
```

**DB → Entity 변환 규칙 (snake_case → camelCase)**:

| DB 컬럼 | Entity 필드 |
|---------|------------|
| `focus_type` | `focusType` |
| `content_visibility` | `contentVisibility` |
| `allow_comments` | `allowComments` |
| `allow_external_share` | `allowExternalShare` |
| `join_policy` | `joinPolicy` |
| `min_records` | `minRecords` |
| `min_level` | `minLevel` |
| `max_members` | `maxMembers` |
| `is_searchable` | `isSearchable` |
| `search_keywords` | `searchKeywords` |
| `follower_count` | `followerCount` |
| `member_count` | `memberCount` |
| `record_count` | `recordCount` |
| `avg_satisfaction` | `avgSatisfaction` |
| `last_activity_at` | `lastActivityAt` |
| `unique_target_count` | `uniqueTargetCount` |
| `weekly_record_count` | `weeklyRecordCount` |
| `prev_weekly_record_count` | `prevWeeklyRecordCount` |
| `icon_bg_color` | `iconBgColor` |
| `created_by` | `createdBy` |
| `invite_code` | `inviteCode` |
| `invite_expires_at` | `inviteExpiresAt` |
| `created_at` | `createdAt` |
| `updated_at` | `updatedAt` |

**변환 헬퍼**:

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
    followerCount: row.follower_count as number,
    memberCount: row.member_count as number,
    recordCount: row.record_count as number,
    avgSatisfaction: row.avg_satisfaction as number | null,
    lastActivityAt: row.last_activity_at as string | null,
    uniqueTargetCount: row.unique_target_count as number,
    weeklyRecordCount: row.weekly_record_count as number,
    prevWeeklyRecordCount: row.prev_weekly_record_count as number,
    icon: row.icon as string | null,
    iconBgColor: row.icon_bg_color as string | null,
    createdBy: row.created_by as string,
    inviteCode: row.invite_code as string | null,
    inviteExpiresAt: row.invite_expires_at as string | null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

function toBubbleMember(row: Record<string, unknown>): BubbleMember {
  return {
    bubbleId: row.bubble_id as string,
    userId: row.user_id as string,
    role: row.role as BubbleMemberRole,
    status: row.status as BubbleMemberStatus,
    visibilityOverride: row.visibility_override as VisibilityOverride | null,
    tasteMatchPct: row.taste_match_pct as number | null,
    commonTargetCount: row.common_target_count as number,
    avgSatisfaction: row.avg_satisfaction as number | null,
    memberUniqueTargetCount: row.member_unique_target_count as number,
    weeklyShareCount: row.weekly_share_count as number,
    badgeLabel: row.badge_label as string | null,
    joinedAt: row.joined_at as string,
  };
}
```

**구현 주의사항**:

1. `create()`: INSERT 후 createdBy를 owner로 `bubble_members`에도 INSERT (role='owner', status='active')
2. `generateInviteCode()`: 8자 랜덤 영숫자 (`crypto.randomUUID().slice(0, 8)`)
3. `validateInviteCode()`: invite_expires_at 체크, 만료된 코드는 `expired: true` 반환
4. `getShares()`: bubble_shares JOIN records JOIN (restaurants | wines) — targetType에 따라
5. Entity → DB 변환 시 camelCase → snake_case 역변환 필수
6. `getPublicBubbles()`: `visibility = 'public' AND is_searchable = true` 조건 기본

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
import { SupabaseBubbleRepository } from '@/infrastructure/repositories/supabase-bubble-repository';
import { SupabaseCommentRepository } from '@/infrastructure/repositories/supabase-comment-repository';
import { SupabaseReactionRepository } from '@/infrastructure/repositories/supabase-reaction-repository';
import type { BubbleRepository } from '@/domain/repositories/bubble-repository';
import type { CommentRepository } from '@/domain/repositories/comment-repository';
import type { ReactionRepository } from '@/domain/repositories/reaction-repository';

export const bubbleRepo: BubbleRepository = new SupabaseBubbleRepository();
export const commentRepo: CommentRepository = new SupabaseCommentRepository();
export const reactionRepo: ReactionRepository = new SupabaseReactionRepository();
```

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
  UI → useBubbleCreate() → bubbleRepo.create()
    → INSERT bubbles + INSERT bubble_members(role='owner')
    → return Bubble

[멤버 가입]
  UI → useBubbleJoin() → bubbleRepo.addMember(status='pending'|'active')
    → INSERT bubble_members
    → (auto_approve) XP/기록 수 검증 → status='active'
    → (manual_approve) status='pending' → 알림 → owner 승인
    → (open) status='active' 즉시

[기록 공유]
  UI → useBubbleShare() → bubbleRepo.shareRecord()
    → INSERT bubble_shares
    → bubbles.record_count++ (트리거)
    → bubbles.last_activity_at = NOW() (트리거)

[리액션 토글]
  UI → useReaction() → reactionRepo.toggle()
    → INSERT or DELETE reactions
    → (bookmark 추가 시) wishlists INSERT (application layer)
    → (like 추가 시) 소셜 XP +1 (일일 상한 10 체크)

[댓글 작성]
  UI → useComment() → commentRepo.create()
    → INSERT comments
    → 알림: comment_reply → author
```

---

## 검증 체크리스트

```
□ domain/entities/bubble.ts — Bubble, BubbleMember, BubbleShare, BubbleShareRead, BubbleRankingSnapshot 타입 정의
□ domain/entities/comment.ts — Comment 타입 정의
□ domain/entities/reaction.ts — Reaction, ReactionType 타입 정의
□ domain/repositories/ — BubbleRepository, CommentRepository, ReactionRepository 인터페이스
□ infrastructure/repositories/ — 3개 Supabase 구현체, implements 키워드 사용
□ shared/di/container.ts — 3개 repository 등록
□ R1: domain에 React/Supabase/Next import 없음
□ R2: infrastructure에 implements 키워드 존재
□ R3: application에 infrastructure 직접 import 없음
□ snake_case → camelCase 변환 정확
□ Bubble 엔티티 필드가 DATA_MODEL.md bubbles 테이블 컬럼과 1:1 대응
□ BubbleMember 엔티티 필드가 bubble_members 테이블 컬럼과 1:1 대응
□ pnpm build 에러 없음
□ pnpm lint 경고 0개
□ any / as any / @ts-ignore / ! 0개
```
