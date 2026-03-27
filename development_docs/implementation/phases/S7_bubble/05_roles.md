# S7-T5: 버블 역할/권한

> 4종 역할(owner/admin/member/follower) 권한 매트릭스, 권한 검증 서비스, 역할 변경, 설정 페이지.

---

## SSOT 출처

| 문서 | 참조 범위 |
|------|----------|
| `systems/AUTH.md` §2-1 | 버블 역할 권한 매트릭스 |
| `systems/AUTH.md` §2-2 | owner 전용 설정 항목 (6그룹) |
| `pages/08_BUBBLE.md` §12-6 | 버블 설정 페이지 (owner 전용) |
| `prototype/04_bubbles_detail.html` | 설정 화면 (screen-bubble-settings) |

---

## 선행 조건

- T7.1 완료: BubbleMember 엔티티 (role, status 필드)
- T7.3 완료: 멤버 탭 (역할 표시)
- T7.4 완료: 댓글/리액션 (권한 체크 연동)

---

## 구현 범위

### 파일 목록

| 레이어 | 파일 | 설명 |
|--------|------|------|
| domain | `src/domain/services/bubble-permission-service.ts` | 역할별 권한 검증 순수 함수 |
| application | `src/application/hooks/use-bubble-permissions.ts` | 현재 사용자의 버블 내 권한 조회 |
| application | `src/application/hooks/use-bubble-settings.ts` | 버블 설정 CRUD (owner 전용) |
| application | `src/application/hooks/use-bubble-roles.ts` | 역할 변경, 멤버 제거, owner 이전 |
| presentation/components | `src/presentation/components/bubble/bubble-settings.tsx` | 설정 페이지 전체 |
| presentation/components | `src/presentation/components/bubble/pending-approval-list.tsx` | 가입 대기 목록 |
| presentation/components | `src/presentation/components/bubble/bubble-stats-card.tsx` | 버블 통계 (2×2 그리드 + 주간 차트) |
| presentation/components | `src/presentation/components/bubble/bubble-danger-zone.tsx` | 위험 영역 (삭제) |
| presentation/containers | `src/presentation/containers/bubble-settings-container.tsx` | 설정 컨테이너 |

### 스코프 외

- 버블러 차단/신고 (S9에서)
- 역할 변경 이력 추적 (MVP 이후)

---

## 상세 구현 지침

### 1. 권한 매트릭스

#### AUTH.md §2-1 기준 역할별 권한

| 권한 | owner | admin | member | follower |
|------|-------|-------|--------|----------|
| 기록 공유 (`canShare`) | O | O | O | X |
| 댓글 작성 (`canComment`) | O | O | O (allowComments=true 시) | X |
| 리액션 (`canReact`) | O | O | O | X |
| 피드 읽기 (`canReadFeed`) | O (전체) | O (전체) | O (전체) | △ (content_visibility 제한) |
| 멤버 관리 (`canManageMembers`) | O (승인/거절/제거) | O (승인/거절) | X | X |
| 멤버 제거 (`canRemoveMember`) | O | X | X | X |
| 버블 설정 (`canEditSettings`) | O | X | X | X |
| 버블 삭제 (`canDeleteBubble`) | O | X | X | X |
| 역할 변경 (`canChangeRoles`) | O | X | X | X |
| 초대 링크 생성 (`canInvite`) | O | O | X | X |

#### follower 접근 제한 상세

| content_visibility | follower가 볼 수 있는 것 |
|-------------------|----------------------|
| `rating_only` | 식당/와인 이름 + 평균 점수 숫자 (사진/한줄평/리뷰/메뉴 불가) |
| `rating_and_comment` | 위 + 한줄평 |

`closed` 정책 버블의 follower: 이름 + 점수만 열람 가능 (AUTH.md §2-1 "follower는 public 버블에 가입하지 않고 팔로우만 한 상태. closed 정책 버블에서는 이름+점수만 열람 가능.")

### 2. Domain 서비스

#### `src/domain/services/bubble-permission-service.ts`

```typescript
import type { BubbleMemberRole, Bubble } from '@/domain/entities/bubble';

/** 권한 플래그 객체 */
export interface BubblePermissions {
  canShare: boolean;
  canComment: boolean;
  canReact: boolean;
  canReadFeed: boolean;
  canReadFullFeed: boolean;          // 전체 데이터 (사진/한줄평/리뷰 포함)
  canManageMembers: boolean;         // 승인/거절
  canRemoveMember: boolean;          // 멤버 제거 (owner만)
  canEditSettings: boolean;
  canDeleteBubble: boolean;
  canChangeRoles: boolean;
  canInvite: boolean;
}

/**
 * 역할 + 버블 설정 기반 권한 계산 (순수 함수)
 */
export function calculatePermissions(
  role: BubbleMemberRole | null,     // null = 비멤버
  bubble: Pick<Bubble, 'allowComments' | 'contentVisibility' | 'joinPolicy'>
): BubblePermissions {
  if (role === null) {
    return {
      canShare: false,
      canComment: false,
      canReact: false,
      canReadFeed: bubble.joinPolicy !== 'invite_only',  // private(invite_only) → 아예 접근 불가
      canReadFullFeed: false,
      canManageMembers: false,
      canRemoveMember: false,
      canEditSettings: false,
      canDeleteBubble: false,
      canChangeRoles: false,
      canInvite: false,
    };
  }

  if (role === 'follower') {
    return {
      canShare: false,
      canComment: false,
      canReact: false,
      canReadFeed: true,
      canReadFullFeed: false,         // follower는 항상 제한적 접근
      canManageMembers: false,
      canRemoveMember: false,
      canEditSettings: false,
      canDeleteBubble: false,
      canChangeRoles: false,
      canInvite: false,
    };
  }

  if (role === 'member') {
    return {
      canShare: true,
      canComment: bubble.allowComments,
      canReact: true,
      canReadFeed: true,
      canReadFullFeed: true,
      canManageMembers: false,
      canRemoveMember: false,
      canEditSettings: false,
      canDeleteBubble: false,
      canChangeRoles: false,
      canInvite: false,
    };
  }

  if (role === 'admin') {
    return {
      canShare: true,
      canComment: true,               // admin은 allowComments 무관하게 댓글 가능
      canReact: true,
      canReadFeed: true,
      canReadFullFeed: true,
      canManageMembers: true,         // 승인/거절
      canRemoveMember: false,         // 제거는 owner만
      canEditSettings: false,
      canDeleteBubble: false,
      canChangeRoles: false,
      canInvite: true,
    };
  }

  // owner
  return {
    canShare: true,
    canComment: true,
    canReact: true,
    canReadFeed: true,
    canReadFullFeed: true,
    canManageMembers: true,
    canRemoveMember: true,
    canEditSettings: true,
    canDeleteBubble: true,
    canChangeRoles: true,
    canInvite: true,
  };
}

/**
 * 역할 우선순위 (높을수록 높은 권한)
 */
export function getRolePriority(role: BubbleMemberRole): number {
  const priorities: Record<BubbleMemberRole, number> = {
    follower: 0,
    member: 1,
    admin: 2,
    owner: 3,
  };
  return priorities[role];
}

/**
 * 역할 변경 가능 여부 (순수 함수)
 * - owner만 역할 변경 가능
 * - 자기 자신의 역할은 변경 불가 (owner 이전은 별도 로직)
 * - follower → member/admin 승격 가능
 * - member → admin 승격 가능
 * - admin → member 강등 가능
 * - owner → 다른 역할 불가 (owner 이전으로만)
 */
export function canChangeRole(
  actorRole: BubbleMemberRole,
  targetCurrentRole: BubbleMemberRole,
  targetNewRole: BubbleMemberRole,
  isSelf: boolean
): boolean {
  if (actorRole !== 'owner') return false;
  if (isSelf) return false;
  if (targetCurrentRole === 'owner') return false;
  if (targetNewRole === 'owner') return false;    // owner 이전은 별도 함수
  return true;
}
```

### 3. Application Hooks

#### `src/application/hooks/use-bubble-permissions.ts`

```typescript
// 의존: bubbleRepo (DI), useAuth
// bubble + 현재 사용자의 멤버십 조회 → calculatePermissions() 실행

interface UseBubblePermissionsReturn {
  permissions: BubblePermissions;
  myRole: BubbleMemberRole | null;
  isOwner: boolean;
  isAdmin: boolean;
  isMember: boolean;
  isFollower: boolean;
  isLoading: boolean;
}
```

#### `src/application/hooks/use-bubble-settings.ts`

```typescript
// 의존: bubbleRepo (DI), useBubblePermissions (canEditSettings 체크)

interface UseBubbleSettingsReturn {
  bubble: Bubble | null;
  // 기본 정보
  updateBasicInfo: (data: { name?: string; description?: string; contentVisibility?: BubbleContentVisibility }) => Promise<void>;
  // 가입 조건
  updateJoinConditions: (data: {
    joinPolicy?: BubbleJoinPolicy;
    minRecords?: number;
    minLevel?: number;
    maxMembers?: number | null;
  }) => Promise<void>;
  // 권한 설정
  updatePermissions: (data: {
    allowComments?: boolean;
    allowExternalShare?: boolean;
  }) => Promise<void>;
  // 검색 노출
  updateSearchability: (data: {
    isSearchable?: boolean;
    searchKeywords?: string[];
  }) => Promise<void>;
  // 버블 삭제
  deleteBubble: () => Promise<void>;
  isLoading: boolean;
}
```

#### `src/application/hooks/use-bubble-roles.ts`

```typescript
// 의존: bubbleRepo (DI), useBubblePermissions

interface UseBubbleRolesReturn {
  // 역할 변경
  changeRole: (userId: string, newRole: BubbleMemberRole) => Promise<void>;
  // 멤버 제거
  removeMember: (userId: string) => Promise<void>;
  // owner 이전
  transferOwnership: (newOwnerId: string) => Promise<void>;
  // 가입 승인/거절
  approveJoin: (userId: string) => Promise<void>;
  rejectJoin: (userId: string) => Promise<void>;
  isLoading: boolean;
}
```

**transferOwnership 플로우**:

```
1. 권한 검증: 현재 사용자가 owner인지
2. 대상이 admin인지 확인 (admin에게만 이전 가능)
3. 트랜잭션:
   - bubble_members: 대상 role = 'owner'
   - bubble_members: 현재 사용자 role = 'admin'
   - bubbles: created_by는 변경하지 않음 (최초 생성자 기록 보존)
4. 알림: "버블 소유권이 이전되었습니다" (양쪽에)
```

### 4. 설정 페이지 UI

**목업 참조**: `04_bubbles_detail.html` (screen-bubble-settings)

히어로의 ⚙️ 클릭 시 슬라이드 전환 (owner만 보이는 버튼).

#### `bubble-settings.tsx`

**6그룹 레이아웃**:

```
┌─────────────────────────────────┐
│ ← 버블 설정                      │
├─────────────────────────────────┤
│ ℹ️ 기본 정보                     │
│   버블 이름           직장 맛집 > │
│   설명    을지로 주변 직장인... > │
│   유형              양방향     > │ ← content_visibility 토글
├─────────────────────────────────┤
│ 🛡️ 가입 조건                     │
│   가입 승인 필요        [●━━━]  │ ← 토글 (joinPolicy: manual_approve↔open)
│   최소 기록 수            5개  > │
│   최소 레벨             Lv.3  > │
│   최대 인원             20명  > │
├─────────────────────────────────┤
│ 👁️ 검색 노출                     │
│   탐색에 노출           [●━━━]  │ ← isSearchable 토글
│   검색 키워드         3개 설정 > │
├─────────────────────────────────┤
│ 👥 멤버 관리                     │
│   대기 중 (3)         전체보기 > │
│   ┌──────────────────────────┐ │
│   │ 👤 김영수  Lv.5          │ │
│   │ 기록 28개  일치도 78%    │ │
│   │              [✕] [✓]    │ │ ← 거절/승인
│   └──────────────────────────┘ │
│   ... (최대 3개 미리보기)        │
├─────────────────────────────────┤
│ 📊 버블 통계                     │
│   ┌────────┬────────┐         │
│   │총 기록  │멤버 수  │         │
│   │  47    │  8     │         │
│   ├────────┼────────┤         │
│   │주간활성도│평균만족도│         │
│   │ +12%   │  87    │         │
│   └────────┴────────┘         │
│   [주간 기록 추이 바 차트]       │ ← 7일 (월~일)
├─────────────────────────────────┤
│ ⚠️ 위험 영역                     │
│   🗑️ 버블 삭제                   │ ← text-negative
└─────────────────────────────────┘
```

#### `pending-approval-list.tsx`

```typescript
interface PendingApprovalListProps {
  members: Array<{
    user: { id: string; nickname: string; avatarUrl: string | null; avatarColor: string | null; level: number; recordCount: number };
    member: BubbleMember;
    tasteMatchPct: number | null;
  }>;
  onApprove: (userId: string) => void;
  onReject: (userId: string) => void;
}
```

**개별 행 레이아웃**:

```
┌──────────────────────────────────┐
│ 👤 김영수  Lv.5                  │
│ 기록 28개  일치도 78%            │
│                     [✕]  [✓]    │
└──────────────────────────────────┘
```

- 승인(✓): `bg-positive text-white rounded-full w-8 h-8` (check 아이콘)
- 거절(✕): `bg-surface-variant text-text-sub rounded-full w-8 h-8` (x 아이콘)

#### `bubble-stats-card.tsx`

```typescript
interface BubbleStatsCardProps {
  recordCount: number;
  memberCount: number;
  weeklyRecordCount: number;
  prevWeeklyRecordCount: number;
  avgSatisfaction: number | null;
  weeklyChartData: number[];           // 7일치 기록 수 [월,화,수,목,금,토,일]
}
```

**주간 활성도 계산**:

```
delta = weeklyRecordCount - prevWeeklyRecordCount
pct = prevWeeklyRecordCount > 0
  ? Math.round((delta / prevWeeklyRecordCount) * 100)
  : weeklyRecordCount > 0 ? 100 : 0

표시: "+12%" (양수, text-positive) / "-5%" (음수, text-negative) / "0%" (text-text-hint)
```

**주간 차트**: 7일 바 차트, 높이 비례, 오늘 `bg-accent-social`, 나머지 `bg-primary/30`. 하단 요일 라벨 (월~일).

#### `bubble-danger-zone.tsx`

```typescript
interface BubbleDangerZoneProps {
  onDelete: () => void;
}
```

**삭제 플로우**:

```
1. "버블 삭제" 클릭
2. 확인 다이얼로그:
   "정말 삭제하시겠습니까?"
   "모든 공유 기록, 댓글, 멤버십이 영구 삭제됩니다."
   [취소] [삭제] (text-negative)
3. 버블 이름 입력 확인 (이름 일치 시만 삭제 활성)
4. bubbleRepo.delete(bubbleId)
   → CASCADE: bubble_members, bubble_shares, comments(bubble_id), bubble_ranking_snapshots 삭제
   → notifications: bubble_id SET NULL (알림 기록은 보존)
5. /bubbles로 리다이렉트
```

---

## 목업 매핑

| 목업 화면 | 컴포넌트 | 프로토타입 참조 |
|----------|---------|---------------|
| 설정 전체 | `bubble-settings.tsx` | `04_bubbles_detail.html` screen-bubble-settings |
| 대기 중 멤버 | `pending-approval-list.tsx` | `04_bubbles_detail.html` settings > 멤버 관리 |
| 통계 그리드 + 차트 | `bubble-stats-card.tsx` | `04_bubbles_detail.html` settings > 버블 통계 |
| 위험 영역 | `bubble-danger-zone.tsx` | `04_bubbles_detail.html` settings > 위험 영역 |

---

## 데이터 흐름

```
[권한 체크]
  컴포넌트 렌더링 시
    → useBubblePermissions(bubbleId)
      → bubbleRepo.getMember(bubbleId, myId)
      → calculatePermissions(myRole, bubble)
      → return { permissions, myRole }
    → UI에서 permissions 플래그로 조건부 렌더링:
      - canEditSettings → ⚙️ 버튼 표시
      - canComment → 댓글 입력 활성/비활성
      - canReact → 리액션 버튼 활성/비활성
      - canReadFullFeed → 전체/제한 피드 데이터

[역할 변경]
  설정 > 멤버 관리 > 멤버 행 > 역할 변경
    → useBubbleRoles.changeRole(userId, 'admin')
      → canChangeRole() 검증 (domain service)
      → bubbleRepo.updateMemberRole(bubbleId, userId, 'admin')

[멤버 제거]
  설정 > 멤버 관리 > 멤버 행 > 제거
    → 확인 다이얼로그
    → useBubbleRoles.removeMember(userId)
      → bubbleRepo.removeMember(bubbleId, userId)
      → bubbles.member_count-- (트리거)

[Owner 이전]
  설정 > 멤버 관리 > admin 멤버 > "소유권 이전"
    → 확인 다이얼로그 (이중 확인)
    → useBubbleRoles.transferOwnership(newOwnerId)
      → 대상 role='owner' + 본인 role='admin'

[버블 삭제]
  설정 > 위험 영역 > "버블 삭제"
    → 확인 + 이름 입력
    → useBubbleSettings.deleteBubble()
      → bubbleRepo.delete(bubbleId)
      → CASCADE 삭제 (bubble_members, bubble_shares, comments, snapshots)
      → /bubbles 리다이렉트
```

---

## 검증 체크리스트

```
□ calculatePermissions(): 4종 역할 × 모든 권한 조합 정확
□ owner: 모든 권한 true
□ admin: canManageMembers=true, canEditSettings=false, canRemoveMember=false
□ member: canShare/canReact=true, canComment=bubble.allowComments 따름
□ follower: canReadFeed=true, canReadFullFeed=false, 나머지 전부 false
□ 비멤버 (null): canReadFeed=joinPolicy에 따라, 나머지 전부 false
□ ⚙️ 버튼: owner에게만 표시
□ 설정 6그룹: 기본정보/가입조건/검색노출/멤버관리/버블통계/위험영역
□ 가입 대기 목록: 아바타+이름+Lv+기록수+일치도+승인/거절 버튼
□ 역할 변경: owner만 가능, 자기 자신 변경 불가
□ Owner 이전: admin에게만 가능, 이중 확인
□ 멤버 제거: owner만, 확인 다이얼로그
□ 버블 삭제: 이름 입력 확인, CASCADE 삭제
□ 주간 통계: 활성도 +/-% 표시, 7일 바 차트
□ R1: domain/services/ 에 React/Supabase import 없음
□ pnpm build / lint 에러 없음
□ 360px 모바일에서 레이아웃 정상
```
