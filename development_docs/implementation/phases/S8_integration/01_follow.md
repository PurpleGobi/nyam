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
src/application/hooks/use-social-xp.ts                ← 소셜 XP 부여 훅
src/presentation/components/follow/follow-button.tsx
src/shared/di/container.ts                            ← followRepo 등록
supabase/migrations/006_social.sql                    ← follows 테이블 포함
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
export type FollowStatus = 'pending' | 'accepted' | 'rejected'
export type AccessLevel = 'none' | 'follow' | 'mutual'

export interface Follow {
  followerId: string
  followingId: string
  status: FollowStatus
  createdAt: string
}
```

#### `src/domain/repositories/follow-repository.ts`

```typescript
import type { Follow, FollowStatus, AccessLevel } from '@/domain/entities/follow'

export interface FollowRepository {
  follow(followerId: string, followingId: string): Promise<Follow>
  unfollow(followerId: string, followingId: string): Promise<void>
  updateStatus(followerId: string, followingId: string, status: FollowStatus): Promise<void>
  /** A→B 팔로우 관계 조회 (null이면 관계 없음) */
  getFollowStatus(followerId: string, followingId: string): Promise<Follow | null>
  /** 접근 레벨 조회 (본인=mutual, 맞팔=mutual, 일방=follow, 없음=none) */
  getAccessLevel(userId: string, targetUserId: string): Promise<AccessLevel>
  getFollowers(userId: string, options?: { limit?: number; offset?: number }): Promise<Follow[]>
  getFollowing(userId: string, options?: { limit?: number; offset?: number }): Promise<Follow[]>
  /** 맞팔 목록 (양쪽 모두 accepted) */
  getMutualFollows(userId: string): Promise<Follow[]>
  getCounts(userId: string): Promise<{ followers: number; following: number; mutual: number }>
  isMutualFollow(userId: string, targetUserId: string): Promise<boolean>
}
```

> **참고**: `getAccessLevel`이 Repository 인터페이스에 직접 포함되어 있다. 별도 domain service(`follow-access.ts`)도 존재하지만 순수 함수 형태로, Repository의 `getAccessLevel`과는 시그니처가 다르다.

#### `src/domain/services/follow-access.ts`

```typescript
import type { AccessLevel } from '@/domain/entities/follow'

/**
 * 팔로우 관계로부터 접근 레벨 판정 — 순수 함수 (async 아님)
 * - 양방향 팔로우 → 'mutual'
 * - 단방향 팔로우 → 'follow'
 * - 관계 없음 → 'none'
 */
export function getAccessLevel(
  iFollowThem: boolean,
  theyFollowMe: boolean,
): AccessLevel {
  if (iFollowThem && theyFollowMe) return 'mutual'
  if (iFollowThem) return 'follow'
  return 'none'
}
```

> **주의**: `getAccessLevel`은 순수 함수로 구현되었다. `boolean` 두 개를 받아 `AccessLevel`을 반환하며, Repository 주입을 받지 않는다. 실제 조회는 `FollowRepository.getAccessLevel()` 메서드에서 처리하고, 이 서비스 함수는 `use-bubbler-profile.ts` 등에서 개별 팔로우 상태 조회 후 조합할 때 사용된다.

### 2. Infrastructure Layer

#### `src/infrastructure/repositories/supabase-follow-repository.ts`

```typescript
import { createClient } from '@/infrastructure/supabase/client'
import type { FollowRepository } from '@/domain/repositories/follow-repository'
import type { Follow, FollowStatus, AccessLevel } from '@/domain/entities/follow'

export class SupabaseFollowRepository implements FollowRepository {
  private get supabase() { return createClient() }
  // ...
}
```

핵심 구현 포인트:

- `follow()`: INSERT INTO follows (status='accepted'). 대상의 `privacy_profile`이 `'private'`이면 에러 throw ("비공개 프로필은 팔로우할 수 없습니다").
- `getAccessLevel()`: Repository에 직접 구현. `userId === targetUserId`이면 'mutual', `isMutualFollow()` 확인 후 맞팔이면 'mutual', 일방 팔로우이면 'follow', 그 외 'none' 반환.
- `isMutualFollow()`: 양방향 팔로우 상태를 `Promise.all` 두 건의 SELECT로 확인.
- `getMutualFollows()`: 내가 팔로우하는 사람 중 나를 팔로우하는 사람 교집합 조회.
- 모든 목록 조회는 `status = 'accepted'` 필터 기본 적용.
- `mapFollow()` 유틸 함수: DB snake_case → entity camelCase 변환.

### 3. Application Layer

#### `src/application/hooks/use-follow.ts`

```typescript
import { useState, useEffect, useCallback } from 'react'
import type { AccessLevel } from '@/domain/entities/follow'
import { followRepo, notificationRepo } from '@/shared/di/container'
import { useSocialXp } from '@/application/hooks/use-social-xp'

export function useFollow(userId: string | null, targetUserId: string): {
  accessLevel: AccessLevel
  isLoading: boolean
  toggleFollow: () => Promise<void>
}
```

**동작 흐름**:
1. 마운트 시 `followRepo.getAccessLevel(userId, targetUserId)` 호출하여 초기 `accessLevel` 세팅
2. `userId === targetUserId`이면 자동으로 `'mutual'` 설정
3. `toggleFollow()`:
   - `accessLevel === 'none'` → `followRepo.follow()` + 맞팔 확인 + XP 부여 + 알림 생성
   - 그 외 → `followRepo.unfollow()` + `accessLevel = 'none'`으로 리셋
4. XP 부여: `useSocialXp().awardSocialXp(userId, isMutual ? 'mutual' : 'follow')`
5. 맞팔 성립 시 → 양쪽에 `follow_accepted` 알림 (`notificationRepo.createNotification`)
6. 일방 팔로우 시 → 대상에게 `follow_request` 알림

**알림 생성 시 필드 구조** (`notificationRepo.createNotification`):
```typescript
{
  userId: string           // 수신자
  type: string             // 'follow_request' | 'follow_accepted'
  title: string            // 알림 제목 텍스트
  body: null
  actionStatus: null
  actorId: string          // 행동 주체
  targetType: 'user'
  targetId: string         // 행동 주체 userId
  bubbleId: null
}
```

#### `src/application/hooks/use-follow-list.ts`

```typescript
interface FollowListResult {
  followers: Follow[]
  following: Follow[]
  mutuals: Follow[]
  counts: { followers: number; following: number; mutual: number }
  isLoading: boolean
}

export function useFollowList(userId: string | null): FollowListResult
```

- `userId`가 null이면 빈 결과 반환
- `Promise.all`로 `getFollowers`, `getFollowing`, `getMutualFollows`, `getCounts` 병렬 조회

### 4. Presentation Layer

#### `src/presentation/components/follow/follow-button.tsx`

```typescript
interface FollowButtonProps {
  accessLevel: AccessLevel
  onToggle: () => void
  isLoading: boolean
  /** 대상이 비공개 프로필인지 */
  isPrivate?: boolean
}
```

> **참고**: `FollowButton`은 자체적으로 훅을 사용하지 않는 순수 UI 컴포넌트다. `accessLevel`, `onToggle`, `isLoading`을 부모(container)에서 주입받는다.

**3가지 상태 CONFIG**:

| accessLevel | 텍스트 | 아이콘 | variant |
|-------------|--------|--------|---------|
| `none` | "팔로우" | `UserPlus` | `cta` — `bg: var(--accent-social); color: #fff` |
| `follow` | "팔로잉" | `UserCheck` | `muted` — `bg: var(--bg-section); color: var(--text-sub); border: 1px solid var(--border)` |
| `mutual` | "맞팔로우" | `Users` | `positive` — `bg: var(--positive); color: #fff` |

**CSS**:
```
.btn-follow {
  flex: items-center gap-1.5;
  padding: 9px 16px;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 700;
  transition: opacity;
  active:opacity-75;
}
```

**터치 동작**:
- 탭 → `onToggle()` 호출 (팔로우 또는 언팔)
- 롱프레스 (팔로잉/맞팔 상태에서, 500ms) → 인라인 확인 시트 "팔로우를 취소하시겠어요?" 표시
  - "취소" / "팔로우 취소" 두 버튼 (취소는 `bg-section`, 팔로우 취소는 `bg: var(--negative)`)
- `active:opacity-0.75`

**프라이버시 차단**:
- `isPrivate && accessLevel === 'none'`이면 버튼 비활성 + title="비공개 프로필"

### 5. DI 등록

#### `src/shared/di/container.ts` 추가

```typescript
import { SupabaseFollowRepository } from '@/infrastructure/repositories/supabase-follow-repository'
import type { FollowRepository } from '@/domain/repositories/follow-repository'

export const followRepo: FollowRepository = new SupabaseFollowRepository()
```

### 6. 알림 통합

팔로우/맞팔 성립 시 `notificationRepo.createNotification()` 호출.

| 트리거 | type | userId (수신자) | actorId | title |
|--------|------|-----------------|---------|-------|
| A가 B를 팔로우 (일방) | `follow_request` | B | A | "새로운 팔로워가 생겼어요!" |
| 맞팔 성립 (A→B 팔로우 + B→A 이미 있음) | `follow_accepted` | 양쪽 | 상대방 | "맞팔로우가 되었어요!" |

### 7. DB 스키마 (`006_social.sql`)

```sql
CREATE TABLE follows (
  follower_id UUID NOT NULL REFERENCES users(id),
  following_id UUID NOT NULL REFERENCES users(id),
  status VARCHAR(10) NOT NULL DEFAULT 'accepted',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY(follower_id, following_id),

  CONSTRAINT chk_follows_status CHECK (status IN ('pending', 'accepted', 'rejected')),
  CONSTRAINT chk_follows_no_self CHECK (follower_id != following_id)
);

CREATE INDEX idx_follows_reverse ON follows(following_id, follower_id);
```

---

## 목업 매핑

| 목업 요소 | 컴포넌트 | 파일 |
|----------|----------|------|
| 04_bubbler_profile.html `.btn-follow` | `<FollowButton>` | `follow-button.tsx` |
| 04_bubbler_profile.html `.btn-follow.following` | `<FollowButton>` following 상태 | 동일 |
| 04_bubbles_detail.html 멤버 탭 팔로우 버튼 | `<FollowButton>` | 동일 |

---

## 데이터 흐름

```
[FollowButton 탭]
  → useFollow(currentUserId, targetUserId).toggleFollow()
    → accessLevel === 'none':
      → followRepo.follow(currentUserId, targetUserId)
        → INSERT INTO follows (follower_id, following_id, status='accepted')
        → privacy_profile='private' 시 에러 throw
      → followRepo.isMutualFollow() 확인
        → true:
          → setAccessLevel('mutual')
          → awardSocialXp(userId, 'mutual')
          → 양쪽에 follow_accepted 알림 (notificationRepo.createNotification)
        → false:
          → setAccessLevel('follow')
          → awardSocialXp(userId, 'follow')
          → 대상에게 follow_request 알림
    → accessLevel !== 'none':
      → followRepo.unfollow(currentUserId, targetUserId)
      → setAccessLevel('none')

[다른 페이지에서 접근 레벨 확인]
  → followRepo.getAccessLevel(viewerId, targetId)
    → 'none' | 'follow' | 'mutual' 반환
```

---

## 검증 체크리스트

```
□ follow → follows 테이블 INSERT 확인 (status='accepted')
□ unfollow → follows 테이블 DELETE 확인
□ 맞팔 감지: A→B + B→A 모두 accepted 시 isMutual=true
□ 맞팔 시 awardSocialXp(userId, 'mutual') 호출 확인
□ getAccessLevel 3단계 반환값 ('none' | 'follow' | 'mutual')
□ privacy_profile='private' 유저에게 팔로우 시도 → 에러
□ FollowButton: isPrivate=true + accessLevel=none → 비활성
□ follow_request / follow_accepted 알림 createNotification 호출 확인
□ 팔로우 버튼 3상태 렌더링: 팔로우(accent-social)/팔로잉(bg-section)/맞팔로우(positive)
□ 롱프레스(500ms) → 언팔 확인 시트 표시
□ R1~R5 위반 없음
□ pnpm build 에러 없음
□ pnpm lint 경고 0개
□ any / @ts-ignore / ! 0개
```
