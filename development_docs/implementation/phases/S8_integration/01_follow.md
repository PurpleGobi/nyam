# 8.1: 팔로우/맞팔로우 시스템

> 개인 간 3단계 접근 제어(비팔로우/일방/맞팔)를 구현하고, 팔로우 상태에 따라 프로필 및 기록 가시성을 제한한다.

---

## SSOT 출처

| 문서 | 섹션 |
|------|------|
| `pages/08_BUBBLE.md` | §2-3 개인 팔로우 3단계 접근, §18 팔로우 시스템 |
| `systems/DATA_MODEL.md` | follows 테이블 (§4), users.follower_count/following_count, notifications |
| `systems/AUTH.md` | RLS 정책 — follows 테이블 접근 제어 |
| `prototype/04_bubbler_profile.html` | 팔로우 버튼 상태 3종 |

---

## 선행 조건

- S1: `follows` 테이블 + RLS + `trg_update_follow_counts` 트리거 배포 완료
- S1: `notifications` 테이블 + `follow_request`/`follow_accepted` 타입 정의
- S6: `NotificationRepository`, `Notification` entity
- S7: `BubbleMember` entity (팔로우 상태 확인용)

---

## 구현 범위

### 파일 목록

```
src/domain/entities/follow.ts
src/domain/repositories/follow-repository.ts
src/domain/services/follow-access.ts
src/infrastructure/repositories/supabase-follow-repository.ts
src/application/hooks/use-follow.ts
src/application/hooks/use-follow-list.ts
src/presentation/components/follow/follow-button.tsx
src/shared/di/container.ts                          ← followRepo 등록 추가
supabase/migrations/XXX_follow_rls.sql              ← (S1에서 이미 생성됐다면 스킵)
```

### 스코프 외

- 팔로우 추천 알고리즘 (S9에서 온보딩 시 처리)
- 팔로우 요청 알림 UI (S6에서 알림 드롭다운 구현 완료, 이 태스크에서는 알림 INSERT만)
- 차단 기능 (v2)

---

## 상세 구현 지침

### 1. Domain Layer

#### `src/domain/entities/follow.ts`

```typescript
export type FollowStatus = 'pending' | 'accepted' | 'rejected';

export type AccessLevel = 'none' | 'follow' | 'mutual';

export interface Follow {
  followerId: string;
  followingId: string;
  status: FollowStatus;
  createdAt: string;         // ISO 8601
}
```

#### `src/domain/repositories/follow-repository.ts`

```typescript
import type { Follow, FollowStatus } from '@/domain/entities/follow';

export interface FollowRepository {
  /** followerId → followingId 팔로우 요청/즉시 수락 */
  follow(followerId: string, followingId: string): Promise<Follow>;

  /** 팔로우 취소 (양방향 — DELETE) */
  unfollow(followerId: string, followingId: string): Promise<void>;

  /** 팔로우 요청 수락/거절 */
  updateStatus(followerId: string, followingId: string, status: FollowStatus): Promise<void>;

  /** A→B 팔로우 관계 조회 (null이면 관계 없음) */
  getFollowStatus(followerId: string, followingId: string): Promise<Follow | null>;

  /** 양쪽 모두 accepted인지 확인 */
  isMutualFollow(userA: string, userB: string): Promise<boolean>;

  /** 특정 유저의 팔로워 목록 (status=accepted) */
  getFollowers(userId: string, options?: { limit?: number; offset?: number }): Promise<Follow[]>;

  /** 특정 유저의 팔로잉 목록 (status=accepted) */
  getFollowing(userId: string, options?: { limit?: number; offset?: number }): Promise<Follow[]>;

  /** 맞팔 목록 (양쪽 모두 accepted) */
  getMutualFollows(userId: string): Promise<Follow[]>;

  /** 팔로워/팔로잉/맞팔 카운트 일괄 조회 */
  getCounts(userId: string): Promise<{ followers: number; following: number; mutual: number }>;
}
```

#### `src/domain/services/follow-access.ts`

```typescript
import type { AccessLevel } from '@/domain/entities/follow';
import type { FollowRepository } from '@/domain/repositories/follow-repository';

/**
 * 뷰어(viewerId)가 대상(targetId)에 대해 가지는 접근 레벨을 결정한다.
 *
 * | 관계      | AccessLevel | 보이는 것                                              |
 * |-----------|-------------|-------------------------------------------------------|
 * | 비팔로우   | 'none'      | 공개 프로필만 (레벨, 기록 수, 버블 수)                    |
 * | 일방 팔로우 | 'follow'    | + 이름, 점수, 지역 (맛보기)                             |
 * | 맞팔로우   | 'mutual'    | + 풀 액세스 (리뷰, 사진, 팁, 상세 기록)                  |
 *
 * viewerId === targetId → 'mutual' (본인은 자기 프로필에 풀 액세스)
 */
export async function getAccessLevel(
  followRepo: FollowRepository,
  viewerId: string | null,
  targetId: string,
): Promise<AccessLevel> {
  // 비로그인
  if (!viewerId) return 'none';

  // 본인
  if (viewerId === targetId) return 'mutual';

  // 맞팔 확인 (양방향 모두 accepted)
  const isMutual = await followRepo.isMutualFollow(viewerId, targetId);
  if (isMutual) return 'mutual';

  // 일방 팔로우 확인 (viewerId → targetId, accepted)
  const followStatus = await followRepo.getFollowStatus(viewerId, targetId);
  if (followStatus?.status === 'accepted') return 'follow';

  return 'none';
}
```

> **주의**: `getAccessLevel`은 순수 함수가 아니라 Repository 주입을 받는 domain service다. domain layer에 외부 의존 없이 interface만 사용하므로 R1 준수.

### 2. Infrastructure Layer

#### `src/infrastructure/repositories/supabase-follow-repository.ts`

```typescript
import type { Follow, FollowStatus } from '@/domain/entities/follow';
import type { FollowRepository } from '@/domain/repositories/follow-repository';
import { createClient } from '@/infrastructure/supabase/client';

export class SupabaseFollowRepository implements FollowRepository {
  // ...
}
```

핵심 구현 포인트:

- `follow()`: INSERT INTO follows. 대상의 `privacy_profile`이 `'private'`이면 에러 throw ("비공개 프로필은 팔로우할 수 없습니다").
- `follow()` 후 `notifications` INSERT:
  - `notification_type: 'follow_request'`
  - `user_id: followingId` (수신자 = 팔로우 대상)
  - `actor_id: followerId`
  - `data: { actor_name: viewerNickname }`
  - `action_status: null` (수락/거절 대기)
- `updateStatus('accepted')` 후:
  - 맞팔 확인 → 맞팔이면 양쪽에 `'follow_accepted'` 알림 + XP `social_mutual` +2
  - 일방이면 요청자에게 `'follow_accepted'` 알림 + XP `social_follow` +1
- `isMutualFollow()`: 두 번의 SELECT 또는 단일 EXISTS 쿼리:
  ```sql
  SELECT EXISTS(
    SELECT 1 FROM follows f1
    JOIN follows f2 ON f1.follower_id = f2.following_id
                   AND f1.following_id = f2.follower_id
    WHERE f1.follower_id = $1 AND f1.following_id = $2
      AND f1.status = 'accepted' AND f2.status = 'accepted'
  );
  ```
- `getMutualFollows()`: INNER JOIN follows 양방향으로 accepted인 쌍 조회
- 모든 목록 조회는 `status = 'accepted'` 필터 기본 적용

### 3. Application Layer

#### `src/application/hooks/use-follow.ts`

```typescript
import { useState, useEffect, useCallback } from 'react';
import type { AccessLevel, FollowStatus } from '@/domain/entities/follow';
import { followRepo } from '@/shared/di/container';
import { getAccessLevel } from '@/domain/services/follow-access';

interface UseFollowReturn {
  /** 현재 팔로우 상태 */
  status: FollowStatus | null;         // null = 관계 없음
  /** 상대가 나를 팔로우하는지 */
  isFollowedBy: boolean;
  /** 맞팔 여부 */
  isMutual: boolean;
  /** 접근 레벨 */
  accessLevel: AccessLevel;
  /** 팔로우 요청 */
  follow: () => Promise<void>;
  /** 팔로우 취소 */
  unfollow: () => Promise<void>;
  /** 로딩 */
  isLoading: boolean;
}

export function useFollow(targetUserId: string): UseFollowReturn {
  // 1. 마운트 시 currentUser → targetUserId 팔로우 상태 조회
  // 2. targetUserId → currentUser 역방향 상태 조회
  // 3. 양방향 모두 accepted면 isMutual = true
  // 4. follow() → followRepo.follow() → 상태 갱신 → SWR mutate
  // 5. unfollow() → followRepo.unfollow() → 상태 리셋
  // 6. accessLevel = getAccessLevel(followRepo, currentUser.id, targetUserId)
}
```

#### `src/application/hooks/use-follow-list.ts`

```typescript
interface UseFollowListReturn {
  followers: Follow[];
  following: Follow[];
  mutuals: Follow[];
  counts: { followers: number; following: number; mutual: number };
  isLoading: boolean;
}

export function useFollowList(userId: string): UseFollowListReturn {
  // followers, following, mutuals를 병렬 조회
}
```

### 4. Presentation Layer

#### `src/presentation/components/follow/follow-button.tsx`

```typescript
interface FollowButtonProps {
  targetUserId: string;
  /** 버튼 크기 변형 */
  size?: 'sm' | 'md';
  /** 외부에서 상태 직접 전달 (리스트 최적화용) */
  initialStatus?: FollowStatus | null;
  initialIsMutual?: boolean;
}
```

**3가지 상태 렌더링** (prototype/04_bubbler_profile.html 기준):

| 상태 | 텍스트 | 스타일 |
|------|--------|--------|
| 미팔로우 | "팔로우" | `bg-transparent border border-border text-text`, hover → `bg-bg-section` |
| 팔로잉 (일방) | "팔로잉" | `bg-accent-social text-white` |
| 맞팔로우 | "맞팔로우" | `bg-positive text-white` |

**상세 CSS (목업 기준)**:

```
.btn-follow {
  flex: 1;
  padding: 9px 0;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 700;
  transition: opacity 0.15s;
}

/* 팔로우 (기본) */
.btn-follow         → background: var(--accent-social); color: #fff;

/* 팔로잉 (일방) — 목업: following 클래스 */
.btn-follow.following → background: var(--bg-section); color: var(--text-sub); border: 1px solid var(--border);

/* 맞팔로우 */
.btn-follow.mutual   → background: var(--positive); color: #fff;
```

> **주의**: 목업에서 "팔로잉" 상태는 `following` 클래스로 표현되며, 색상이 `--bg-section` + `--text-sub`다 (파란색이 아님). 태스크 요구사항의 "filled blue"는 목업과 불일치하므로 **목업 기준**을 따른다.

**터치 동작**:
- 탭 → `follow()` 또는 `unfollow()` 토글
- 롱프레스 (팔로잉/맞팔 상태에서) → 확인 시트 "팔로우를 취소하시겠어요?"
- `active:opacity-0.75` (목업: `.btn-follow:active { opacity: 0.75 }`)

**프라이버시 차단**:
- 대상의 `privacy_profile === 'private'`이면 팔로우 버튼 비활성 + 툴팁 "비공개 프로필"

### 5. DI 등록

#### `src/shared/di/container.ts` 추가

```typescript
import { SupabaseFollowRepository } from '@/infrastructure/repositories/supabase-follow-repository';
import type { FollowRepository } from '@/domain/repositories/follow-repository';

export const followRepo: FollowRepository = new SupabaseFollowRepository();
```

### 6. 알림 통합

팔로우 요청/수락 시 `notifications` 테이블 INSERT. S6에서 구현한 `NotificationRepository.create()` 사용.

| 트리거 | notification_type | user_id (수신자) | actor_id | data |
|--------|-------------------|------------------|----------|------|
| A가 B를 팔로우 | `follow_request` | B | A | `{ actor_name: "김영수" }` |
| B가 A의 팔로우를 수락 | `follow_accepted` | A | B | `{ actor_name: "박민호" }` |

### 7. DB 트리거 확인

S1에서 이미 배포된 트리거:

```sql
-- follows INSERT/DELETE 시 users.follower_count, following_count 갱신
CREATE TRIGGER trg_follows_count
  AFTER INSERT OR DELETE ON follows
  FOR EACH ROW EXECUTE FUNCTION trg_update_follow_counts();
```

- INSERT: `follower_count +1` (following_id), `following_count +1` (follower_id)
- DELETE: 역방향 -1

---

## 목업 매핑

| 목업 요소 | 컴포넌트 | 파일 |
|----------|----------|------|
| 04_bubbler_profile.html `.btn-follow` | `<FollowButton>` | `follow-button.tsx` |
| 04_bubbler_profile.html `.btn-follow.following` | `<FollowButton>` following 상태 | 동일 |
| 04_bubbles_detail.html 멤버 탭 팔로우 버튼 | `<FollowButton size="sm">` | 동일 |

---

## 데이터 흐름

```
[FollowButton 탭]
  → useFollow.follow()
    → followRepo.follow(currentUserId, targetUserId)
      → INSERT INTO follows (follower_id, following_id, status='accepted')
      → INSERT INTO notifications (follow_request)
      → DB 트리거: users.follower_count +1 (target), following_count +1 (current)
    → 맞팔 확인: followRepo.isMutualFollow()
      → true면: XP +2 양쪽, follow_accepted 알림 양쪽
      → false면: XP +1 (팔로워 획득), follow_request 알림 대상에게
    → SWR mutate → UI 갱신

[다른 페이지에서 접근 레벨 확인]
  → getAccessLevel(followRepo, viewerId, targetId)
    → 'none' | 'follow' | 'mutual' 반환
    → 컴포넌트에서 조건부 렌더링
```

---

## 검증 체크리스트

```
□ follow → follows 테이블 INSERT 확인 (status='accepted')
□ unfollow → follows 테이블 DELETE 확인
□ 맞팔 감지: A→B + B→A 모두 accepted 시 isMutual=true
□ 맞팔 시 양쪽 모두 XP +2 확인
□ getAccessLevel 3단계 반환값 ('none' | 'follow' | 'mutual')
□ privacy_profile='private' 유저에게 팔로우 시도 → 에러/비활성
□ follow_request / follow_accepted 알림 INSERT 확인
□ users.follower_count, following_count 트리거 갱신 확인
□ 팔로우 버튼 3상태 렌더링: 팔로우/팔로잉/맞팔로우
□ 롱프레스 → 언팔 확인 시트 표시
□ R1~R5 위반 없음
□ pnpm build 에러 없음
□ pnpm lint 경고 0개
□ any / @ts-ignore / ! 0개
```
