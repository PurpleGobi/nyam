# S6-T4: 알림 시스템 (인라인 드롭다운)

> SSOT: `pages/09_NOTIFICATIONS.md`, `systems/DATA_MODEL.md`
> 선행: S1 (DB), S5 (홈 헤더)
> UI: 헤더 🔔 아이콘 → 드롭다운 팝업 (별도 페이지 아님)
> 목업: `prototype/06_notifications.html`

---

## 1. 구현 범위

- 별도 라우트 **없음** — 헤더 벨 아이콘 클릭 시 드롭다운 팝업
- 5개 알림 유형만 (레벨업, 버블가입신청, 팔로우요청, 버블가입승인, 팔로우수락)
- 인라인 액션 버튼 (수락/거절)
- 실시간 구독 (Supabase Realtime)
- 미읽음 뱃지 (헤더 벨 아이콘)

---

## 2. Domain 엔티티

### `src/domain/entities/notification.ts`

```typescript
/** 알림 유형 (5가지만) */
export type NotificationType =
  | 'level_up'                // 레벨업 달성
  | 'bubble_join_request'     // 버블 가입 신청
  | 'bubble_join_approved'    // 버블 가입 승인
  | 'follow_request'          // 팔로우 요청
  | 'follow_accepted';        // 팔로우 수락

/** 액션 상태 */
export type ActionStatus = 'pending' | 'accepted' | 'rejected' | null;

/** 알림 엔티티 */
export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;                  // metadata에서 렌더링된 표시 텍스트
  body: string | null;            // 부가 설명 (레벨업: "기록이 쌓이고 있어요")
  isRead: boolean;
  actionStatus: ActionStatus;
  actorId: string | null;         // 행위자 (가입 신청자, 팔로우 요청자)
  bubbleId: string | null;        // 관련 버블 (가입신청/승인)
  createdAt: string;
}

/** 알림 유형별 설정 */
export interface NotificationTypeConfig {
  type: NotificationType;
  icon: string;                   // lucide 아이콘명
  iconColor: string;              // CSS variable name
  hasAction: boolean;             // 수락/거절 버튼 유무
  navigationTarget: 'profile' | 'bubble_detail' | 'actor_profile';
}

/** 알림 유형 설정 테이블 */
export const NOTIFICATION_TYPE_CONFIG: Record<NotificationType, NotificationTypeConfig> = {
  level_up: {
    type: 'level_up',
    icon: 'trophy',
    iconColor: 'var(--caution)',       // #C9A96E
    hasAction: false,
    navigationTarget: 'profile',
  },
  bubble_join_request: {
    type: 'bubble_join_request',
    icon: 'circle-dot',
    iconColor: 'var(--accent-food)',   // #C17B5E
    hasAction: true,
    navigationTarget: 'bubble_detail',
  },
  bubble_join_approved: {
    type: 'bubble_join_approved',
    icon: 'circle-check',
    iconColor: 'var(--positive)',      // #7EAE8B
    hasAction: false,
    navigationTarget: 'bubble_detail',
  },
  follow_request: {
    type: 'follow_request',
    icon: 'user-plus',
    iconColor: 'var(--accent-social)', // #7A9BAE
    hasAction: true,
    navigationTarget: 'actor_profile',
  },
  follow_accepted: {
    type: 'follow_accepted',
    icon: 'user-check',
    iconColor: 'var(--accent-social)', // #7A9BAE
    hasAction: false,
    navigationTarget: 'actor_profile',
  },
};
```

---

## 3. Domain Repository

### `src/domain/repositories/notification-repository.ts`

```typescript
import type { Notification, ActionStatus } from '@/domain/entities/notification';

export interface NotificationRepository {
  /** 알림 목록 조회 (최대 20개, 최신순) */
  getNotifications(userId: string, limit: number): Promise<Notification[]>;

  /** 미읽음 수 조회 */
  getUnreadCount(userId: string): Promise<number>;

  /** 개별 읽음 처리 */
  markAsRead(notificationId: string): Promise<void>;

  /** 전체 읽음 처리 */
  markAllAsRead(userId: string): Promise<void>;

  /** 액션 처리 (수락/거절) */
  updateActionStatus(notificationId: string, status: 'accepted' | 'rejected'): Promise<void>;

  /** 알림 생성 (서버 사이드 — XP 레벨업, 버블 가입, 팔로우 등에서 호출) */
  createNotification(notification: Omit<Notification, 'id' | 'createdAt' | 'isRead'>): Promise<Notification>;

  /** 실시간 구독 설정 (Supabase Realtime) */
  subscribeToNotifications(
    userId: string,
    onNew: (notification: Notification) => void,
  ): { unsubscribe: () => void };
}
```

---

## 4. Infrastructure 구현

### `src/infrastructure/repositories/supabase-notification-repository.ts`

```typescript
import type { NotificationRepository } from '@/domain/repositories/notification-repository';
import type { Notification, ActionStatus } from '@/domain/entities/notification';
import { createClient } from '@/infrastructure/supabase/client';

export class SupabaseNotificationRepository implements NotificationRepository {
  private supabase = createClient();

  async getNotifications(userId: string, limit: number): Promise<Notification[]> {
    const { data, error } = await this.supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return (data ?? []).map(mapNotification);
  }

  async getUnreadCount(userId: string): Promise<number> {
    const { count, error } = await this.supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_read', false);
    if (error) throw error;
    return count ?? 0;
  }

  async markAsRead(notificationId: string): Promise<void> {
    const { error } = await this.supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId);
    if (error) throw error;
  }

  async markAllAsRead(userId: string): Promise<void> {
    const { error } = await this.supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false);
    if (error) throw error;
  }

  async updateActionStatus(notificationId: string, status: 'accepted' | 'rejected'): Promise<void> {
    const { error } = await this.supabase
      .from('notifications')
      .update({ action_status: status, is_read: true })
      .eq('id', notificationId);
    if (error) throw error;
  }

  async createNotification(notification: Omit<Notification, 'id' | 'createdAt' | 'isRead'>): Promise<Notification> {
    const { data, error } = await this.supabase
      .from('notifications')
      .insert({
        user_id: notification.userId,
        type: notification.type,
        title: notification.title,
        body: notification.body,
        action_status: notification.actionStatus,
        actor_id: notification.actorId,
        bubble_id: notification.bubbleId,
      })
      .select()
      .single();
    if (error) throw error;
    return mapNotification(data);
  }

  subscribeToNotifications(
    userId: string,
    onNew: (notification: Notification) => void,
  ): { unsubscribe: () => void } {
    const channel = this.supabase
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          onNew(mapNotification(payload.new));
        },
      )
      .subscribe();

    return {
      unsubscribe: () => {
        this.supabase.removeChannel(channel);
      },
    };
  }
}

function mapNotification(row: Record<string, unknown>): Notification {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    type: row.type as Notification['type'],
    title: row.title as string,
    body: (row.body as string) ?? null,
    isRead: row.is_read as boolean,
    actionStatus: (row.action_status as Notification['actionStatus']) ?? null,
    actorId: (row.actor_id as string) ?? null,
    bubbleId: (row.bubble_id as string) ?? null,
    createdAt: row.created_at as string,
  };
}
```

---

## 5. Application Hook

### `src/application/hooks/use-notifications.ts`

```typescript
import useSWR, { useSWRConfig } from 'swr';
import { useCallback, useEffect } from 'react';
import { notificationRepo } from '@/shared/di/container';
import { useAuth } from '@/application/hooks/use-auth';
import type { Notification } from '@/domain/entities/notification';

const MAX_NOTIFICATIONS = 20;

export function useNotifications() {
  const { user } = useAuth();
  const userId = user?.id;
  const { mutate } = useSWRConfig();

  // 알림 목록
  const { data: notifications, isLoading } = useSWR(
    userId ? ['notifications', userId] : null,
    () => notificationRepo.getNotifications(userId!, MAX_NOTIFICATIONS),
  );

  // 미읽음 수
  const { data: unreadCount } = useSWR(
    userId ? ['unread-count', userId] : null,
    () => notificationRepo.getUnreadCount(userId!),
  );

  // 실시간 구독
  useEffect(() => {
    if (!userId) return;
    const { unsubscribe } = notificationRepo.subscribeToNotifications(userId, () => {
      // 새 알림 → SWR 갱신
      mutate(['notifications', userId]);
      mutate(['unread-count', userId]);
    });
    return unsubscribe;
  }, [userId, mutate]);

  // 개별 읽음 처리
  const markAsRead = useCallback(async (notificationId: string) => {
    if (!userId) return;
    // optimistic update
    mutate(
      ['notifications', userId],
      (prev: Notification[] | undefined) =>
        prev?.map((n) => (n.id === notificationId ? { ...n, isRead: true } : n)),
      false,
    );
    mutate(
      ['unread-count', userId],
      (prev: number | undefined) => Math.max(0, (prev ?? 1) - 1),
      false,
    );
    await notificationRepo.markAsRead(notificationId);
  }, [userId, mutate]);

  // 전체 읽음 처리
  const markAllAsRead = useCallback(async () => {
    if (!userId) return;
    mutate(
      ['notifications', userId],
      (prev: Notification[] | undefined) =>
        prev?.map((n) => ({ ...n, isRead: true })),
      false,
    );
    mutate(['unread-count', userId], 0, false);
    await notificationRepo.markAllAsRead(userId);
  }, [userId, mutate]);

  // 액션 처리 (수락/거절)
  const handleAction = useCallback(async (
    notificationId: string,
    action: 'accepted' | 'rejected',
  ) => {
    if (!userId) return;
    // optimistic: 버튼 → 결과 텍스트, 읽음 처리
    mutate(
      ['notifications', userId],
      (prev: Notification[] | undefined) =>
        prev?.map((n) =>
          n.id === notificationId
            ? { ...n, actionStatus: action, isRead: true }
            : n,
        ),
      false,
    );
    mutate(
      ['unread-count', userId],
      (prev: number | undefined) => Math.max(0, (prev ?? 1) - 1),
      false,
    );
    await notificationRepo.updateActionStatus(notificationId, action);
    // TODO: 수락 시 실제 비즈니스 로직 (버블 가입 승인, 팔로우 수락)
  }, [userId, mutate]);

  return {
    notifications: notifications ?? [],
    unreadCount: unreadCount ?? 0,
    isLoading,
    markAsRead,
    markAllAsRead,
    handleAction,
  };
}
```

---

## 6. Presentation 컴포넌트 구조

### 컴포넌트 트리

```
NotificationDropdown (헤더 bell 클릭 시 표시)
├── NotificationOverlay (블러 오버레이, 클릭 → 닫기)
├── NotificationDropdownContainer (절대 위치, 300px, max-h 400px)
│   ├── NotificationDropdownHeader ("알림" + "모두 읽음")
│   ├── NotificationList (overflow-y: auto)
│   │   ├── NotificationItem × N (최대 20개)
│   │   │   ├── NotificationIcon (유형별 색상)
│   │   │   ├── NotificationContent (제목 + 본문 + 타임스탬프)
│   │   │   ├── NotificationDot (미읽음 ● 도트, 조건부)
│   │   │   └── NotificationActions ([수락][거절] 또는 결과 텍스트, 조건부)
│   │   └── NotificationEmpty (빈 상태 — 벨 아이콘 + "아직 알림이 없어요")
│   └── NotificationDropdownFooter ("알림 설정 →" → /settings)
└── UnreadBadge (벨 아이콘 위 빨간 dot, 미읽음 > 0 시)
```

---

## 7. 핵심 컴포넌트 상세

### 7-1. `NotificationDropdown` — `src/presentation/components/notification/notification-dropdown.tsx`

```typescript
interface NotificationDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: Notification[];
  unreadCount: number;
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onAction: (id: string, action: 'accepted' | 'rejected') => void;
  onNavigate: (notification: Notification) => void;
}
```

### 7-2. 드롭다운 컨테이너 CSS

```css
/* 위치 & 크기 */
position: absolute;
top: 90px;                        /* 헤더 하단 기준 */
right: 16px;
width: 300px;
max-height: 400px;
overflow: hidden;                 /* 내부 리스트만 스크롤 */

/* 외관 */
background: var(--bg-elevated);
border: 1px solid var(--border);
border-radius: 14px;
box-shadow: 0 6px 24px rgba(0,0,0,0.1);
z-index: 200;

/* 레이아웃 */
display: flex;
flex-direction: column;
transform-origin: top right;
```

### 7-3. 오픈 애니메이션

```css
@keyframes notifOpen {
  from {
    opacity: 0;
    transform: scale(0.94) translateY(-6px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}
/* duration: 0.16s ease */
```

### 7-4. 오버레이

```css
position: absolute;
inset: 0;                         /* device-inner 전체 */
background: rgba(0,0,0,0.15);
backdrop-filter: blur(4px);
z-index: 190;
```

### 7-5. `NotificationItem` — `src/presentation/components/notification/notification-item.tsx`

```typescript
interface NotificationItemProps {
  notification: Notification;
  onPress: () => void;            // 관련 페이지 이동 (액션 pending 시 비활성)
  onAction: (action: 'accepted' | 'rejected') => void;
}
```

- 아이콘: 16px, 배경 없음, 유형별 색상 (`NOTIFICATION_TYPE_CONFIG` 참조)
- **미읽음**: 제목 `font-weight: 600` + 우측 `●` 도트 (`bg-brand`, 6px)
- **읽음**: 제목 `font-weight: 500`, 도트 없음
- 패딩: `px-3.5 py-2.5`
- 타임스탬프: 11px, text-hint (상대 시간: "3시간 전", "1일 전")
- 구분선: 1px `border-bottom` (마지막 제외)

### 7-6. `NotificationActions` — `src/presentation/components/notification/notification-actions.tsx`

```typescript
interface NotificationActionsProps {
  actionStatus: ActionStatus;
  onAccept: () => void;
  onReject: () => void;
}
```

**actionStatus === 'pending':**
- `[수락]`: `bg-text text-white`, 11px semibold, `px-2.5 py-0.75 rounded-md`
- `[거절]`: `bg-transparent text-hint border border-border`, 동일 사이즈

**actionStatus === 'accepted':**
- "수락 완료" (11px, semibold, `positive` 색상)

**actionStatus === 'rejected':**
- "거절됨" (11px, `text-hint` 색상)

### 7-7. 드롭다운 헤더

- "알림" (14px, bold) 좌측
- "모두 읽음" (11px, `text-hint`) 우측 → 전체 읽음 처리
- 패딩: `px-3.5 pt-3 pb-2.5`
- 하단 구분선: 1px `border-bottom`

### 7-8. 드롭다운 푸터

- "알림 설정 →" 텍스트 → `/settings` (알림 섹션 스크롤)
- 중앙 정렬, 12px, `accent-social`, `py-2.25`
- 상단 구분선: 1px `border-top`

### 7-9. `UnreadBadge` — `src/presentation/components/notification/unread-badge.tsx`

```typescript
interface UnreadBadgeProps {
  count: number;
}
```

- 위치: 벨 아이콘 `absolute top-0.5 right-0.5`
- 크기: `w-[7px] h-[7px]`, `rounded-full`
- 색상: `bg-brand` (`--brand`)
- 테두리: `1.5px solid var(--bg)` (배경색 분리감)
- `count === 0`: `display: none`
- 숫자 없이 dot만 (미읽음 유무만 전달)

### 7-10. 빈 상태

```
┌──────────────────┐
│        🔔        │
│  아직 알림이 없어요  │
└──────────────────┘
```

- 중앙 정렬, lucide `bell` 아이콘 (32px, text-hint)
- 텍스트: 13px, text-hint
- 패딩: `py-8`

---

## 8. 인터랙션 규칙

| 동작 | 결과 |
|------|------|
| 벨 아이콘 탭 | 드롭다운 토글 (열기/닫기) |
| 오버레이 탭 | 닫기 |
| ESC 키 | 닫기 |
| 벨 아이콘 재탭 | 닫기 |
| 아이템 탭 (액션 없음) | 관련 페이지 이동 + `is_read = true` + 닫기 |
| 아이템 탭 (액션 pending) | 비활성 (버튼만 동작) |
| [수락] 클릭 | 즉시 처리 → "수락 완료" + 읽음 (드롭다운 유지) |
| [거절] 클릭 | 즉시 처리 → "거절됨" + 읽음 (드롭다운 유지) |
| "모두 읽음" 탭 | 전체 `is_read = true` + dot 제거 (드롭다운 유지, 액션 상태 불변) |

---

## 9. 알림 생성 타이밍 (서버 사이드)

| 이벤트 | 알림 유형 | title 생성 | body |
|--------|----------|-----------|------|
| 레벨업 (종합/카테고리/세부) | `level_up` | `{axisValue} 레벨 {level} 달성!` | "기록이 쌓이고 있어요" |
| 버블 가입 신청 | `bubble_join_request` | `{nickname}님이 '{bubbleName}' 가입을 신청했어요` | `null` |
| 버블 가입 승인 | `bubble_join_approved` | `'{bubbleName}' 가입이 승인되었어요` | `null` |
| 팔로우 요청 | `follow_request` | `{nickname}님이 팔로우를 요청했어요` | `null` |
| 팔로우 수락 | `follow_accepted` | `{nickname}님이 팔로우를 수락했어요` | `null` |

> 레벨업 `{axisValue}`: 카테고리면 "와인"/"식당", 세부면 "을지로"/"일식"/"보르도" 등.
> DB `notifications.metadata` JSONB에서 렌더링 (infrastructure 레이어).

---

## 10. 알림 → 네비게이션 매핑

| 유형 | 이동 대상 | 경로 |
|------|----------|------|
| `level_up` | 내 프로필 | `/profile` |
| `bubble_join_request` | 버블 상세 | `/bubbles/{bubbleId}` |
| `bubble_join_approved` | 버블 상세 | `/bubbles/{bubbleId}` |
| `follow_request` | 상대 프로필 | `/bubbler/{actorId}` |
| `follow_accepted` | 상대 프로필 | `/bubbler/{actorId}` |

---

## 11. 상태 관리 요약

| 상태 | 범위 | 타입 | 용도 |
|------|------|------|------|
| `isOpen` | 헤더 local | `boolean` | 드롭다운 열림/닫힘 |
| `notifications` | SWR (서버) | `Notification[]` | 알림 목록 (최대 20) |
| `unreadCount` | SWR (서버) | `number` | 미읽음 수 (뱃지) |

---

## 12. 파일 체크리스트

| 파일 | 레이어 |
|------|--------|
| `src/domain/entities/notification.ts` | domain |
| `src/domain/repositories/notification-repository.ts` | domain |
| `src/infrastructure/repositories/supabase-notification-repository.ts` | infrastructure |
| `src/application/hooks/use-notifications.ts` | application |
| `src/presentation/components/notification/notification-dropdown.tsx` | presentation |
| `src/presentation/components/notification/notification-item.tsx` | presentation |
| `src/presentation/components/notification/notification-actions.tsx` | presentation |
| `src/presentation/components/notification/notification-icon.tsx` | presentation |
| `src/presentation/components/notification/notification-empty.tsx` | presentation |
| `src/presentation/components/notification/unread-badge.tsx` | presentation |
| `src/shared/di/container.ts` | shared (추가) |
