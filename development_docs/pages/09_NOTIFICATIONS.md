# NOTIFICATIONS — 알림 드롭다운

> depends_on: DATA_MODEL, AUTH, BUBBLE, XP_SYSTEM
> affects: HOME, SETTINGS
> UI: 홈 헤더 🔔 아이콘 → 드롭다운 팝업 (별도 페이지 없음)
> header: 앱 헤더 내 벨 아이콘
> prototype: `prototype/06_notifications.html`

---

## 1. 와이어프레임

```
┌──────────────────────────────────────┐
│ nyam    bubbles [🔔] [▪] [J]        │  앱 헤더 (로고, bubbles, 벨, 레벨바, 아바타)
│              ┌───────────────────┐   │
│              │ 알림         모두 읽음│   │  드롭다운 팝업
│              │                   │   │
│              │ 🏆 을지로 레벨 4!  ●│   │  레벨업 (caution)
│              │ 기록이 쌓이고 있어요 │   │
│              │          3시간 전  │   │
│              │───────────────────│   │
│              │ 🫧 김영수님 가입신청 ●│   │  버블 가입신청 (accent-food)
│              │ '을지로 맛탐정 클럽' │   │
│              │ [수락] [거절] 1일 전│   │
│              │───────────────────│   │
│              │ 👤 이수진님 팔로우  ●│   │  팔로우 요청 (accent-social)
│              │ [수락] [거절] 2일 전│   │
│              │───────────────────│   │
│              │ ✅ '와인러버' 가입   │   │  버블 가입승인 (positive)
│              │ 승인됨     3일 전  │   │
│              │───────────────────│   │
│              │ 👤 박민호님 팔로우   │   │  팔로우 수락 (accent-social)
│              │ 수락       5일 전  │   │
│              │───────────────────│   │
│              │    알림 설정 →      │   │  설정 페이지 링크
│              └───────────────────┘   │
│                                      │
│ [홈] [탐색] [+] [버블] [나]          │
└──────────────────────────────────────┘
```

---

## 2. 드롭다운 UI 상세

### 트리거
- 홈 헤더 🔔 아이콘 탭 → 드롭다운 팝업 토글
- 외부 영역 탭 → 닫기 (오버레이 클릭)
- ESC 키 → 닫기
- 벨 아이콘 재탭 → 닫기

### 오버레이 (PopupWindow 공통 컴포넌트)
```
PopupWindow (createPortal → document.body)
├── popup-window-overlay (오버레이)
│   position: fixed
│   inset: 0
│   background: rgba(0,0,0,0.7)
│   backdrop-filter: blur(4px)
│   -webkit-backdrop-filter: blur(4px)
│   z-index: 190
│   onClick → onClose
└── children wrapper
    position: relative
    z-index: 200
```
- 드롭다운 오픈 시 함께 표시, 닫기 시 함께 숨김
- 오버레이 탭 → 드롭다운 닫기
- ESC 키 → 드롭다운 닫기 (PopupWindow 내장 keydown 핸들러)

### 드롭다운 컨테이너 (`.notif-dropdown`)
```css
.notif-dropdown {
  width: min(360px, calc(100vw - 48px));
  max-height: 70vh;
  overflow-y: auto;
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: 14px;
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.1);
  animation: dropdown-in 0.16s ease-out;
}
```
- 위치: `position: fixed`, 벨 아이콘 하단 기준 동적 계산 (`getBellPosition()`)
  - `top: bellRect.bottom + 8px`
  - `right: window.innerWidth - bellRect.right`

### 다크 모드
```css
[data-theme="dark"] .notif-dropdown {
  background: var(--bg-elevated);
  border-color: var(--border-bold);
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.4);
}
```

### 오픈 애니메이션
```css
@keyframes dropdown-in {
  0%   { opacity: 0; transform: scale(0.94) translateY(-6px); }
  100% { opacity: 1; transform: scale(1)    translateY(0);    }
}
/* duration: 0.16s ease-out */
```

### 헤더 바 (`.notif-header`)
- "알림" (14px, bold, `var(--text)`) 좌측
- "모두 읽음" (11px, `var(--text-hint)`) 우측 → 전체 읽음 처리 (미읽음 > 0일 때만 표시)
- 패딩: `14px 14px 8px`
- 하단 구분선: `1px solid var(--border)`

### 알림 아이템 (`.notif-item`)
```
┌──────────────────────────────────────┐
│ [⬤ 아이콘]  제목 (13px)        [● dot] │
│             본문 (12px, text-sub)      │
│             타임스탬프 (11px, text-hint)│
│             [액션 버튼들] (있는 경우)   │
└──────────────────────────────────────┘
```
- **아이콘**: `.notif-icon` 래퍼 (CSS 20x20px, flex-shrink:0) 안에 NotificationIcon 컴포넌트 (Tailwind `h-8 w-8` 32px 원형 배경 `color-mix(in srgb, {iconColor} 15%, transparent)` + 16px lucide 아이콘). 래퍼에 `overflow: hidden` 없으므로 32px 원형이 시각적으로 표시됨
- **미읽음**: 제목 `font-weight: 600` + 우측 `●` 도트 (`bg-brand`, 6px) + 배경색 `color-mix(in srgb, var(--accent-food) 5%, transparent)`
- **읽음**: 제목 `font-weight: 500`, 도트 없음, 배경 transparent
- **패딩**: `11px 14px`, gap 10px
- **탭 동작**: 관련 페이지로 이동 + 자동 읽음 처리 + 드롭다운 닫기 (액션 pending 아이템은 예외 — §5 참조)
- **아이템 사이 구분**: `1px solid var(--border)` (inline style)

### 하단 링크 (`.notif-footer`)
- "알림 설정 →" 텍스트 → `/settings` 페이지로 이동 + 드롭다운 닫기
- 구조: `div.notif-footer > button.notif-footer` (동일 클래스 이중 적용 — 이중 패딩 발생)
- CSS `.notif-footer`: 중앙 정렬, 12px, font-weight 500, `var(--accent-social)`, padding `10px 14px`, cursor pointer
- 상단 구분선: `1px solid var(--border)` (외부 div inline style)

### 빈 상태 (NotificationEmpty)
```
┌──────────────────────────────────────┐
│            🔔 (Bell, 32px)           │
│     아직 알림이 없어요                │
└──────────────────────────────────────┘
```
- `.empty-state` + `.empty-state-icon` + `.empty-state-desc` 클래스 사용

---

## 3. 알림 유형 (10종)

| 유형 | 아이콘 (lucide) | 아이콘 색상 | hasAction | 탭 이동 | 인라인 액션 |
|------|----------------|------------|-----------|---------|------------|
| `level_up` | `Trophy` | `var(--caution)` | ✗ | `/profile` | — |
| `bubble_join_request` | `CircleDot` | `var(--accent-food)` | ✓ | `/bubbles/{bubbleId}` | [수락] [거절] |
| `bubble_join_approved` | `CircleCheck` | `var(--positive)` | ✗ | `/bubbles/{bubbleId}` | — |
| `follow_request` | `UserPlus` | `var(--accent-social)` | ✓ | `/bubbler/{actorId}` | [수락] [거절] |
| `follow_accepted` | `UserCheck` | `var(--accent-social)` | ✗ | `/bubbler/{actorId}` | — |
| `bubble_invite` | `Mail` | `var(--accent-social)` | ✓ | `/bubbles/{bubbleId}` | [수락] [거절] |
| `bubble_new_record` | `FilePlus` | `var(--accent-food)` | ✗ | `/bubbles/{bubbleId}` | — |
| `bubble_member_joined` | `UserPlus` (config icon: `user-plus-2` → ICON_MAP에서 `UserPlus`로 매핑) | `var(--accent-social)` | ✗ | `/bubbles/{bubbleId}` | — |
| `reaction_like` | `Heart` | `var(--negative)` | ✗ | `/bubbles/{bubbleId}` (record_detail) | — |
| `comment_reply` | `MessageCircle` | `var(--accent-social)` | ✗ | `/bubbles/{bubbleId}` (record_detail) | — |

> **레벨업 title 예시**: "을지로 레벨 4 달성!", "와인 레벨 7 달성!", "일식 레벨 6 달성!"
> title, body는 DB에 직접 저장된 텍스트 (infrastructure에서 별도 변환 없이 그대로 사용)

### 아이콘 렌더링 (NotificationIcon 컴포넌트)
```tsx
// 32px 원형 배경 + 16px 아이콘
<div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
     style={{ backgroundColor: `color-mix(in srgb, ${iconColor} 15%, transparent)` }}>
  <Icon size={16} style={{ color: iconColor }} />
</div>
```

### 색상 매핑 (NOTIFICATION_TYPE_CONFIG 기준)
```
level_up             → var(--caution)       #C9A96E
bubble_join_request  → var(--accent-food)   #C17B5E
bubble_join_approved → var(--positive)      #7EAE8B
follow_request       → var(--accent-social) #7A9BAE
follow_accepted      → var(--accent-social) #7A9BAE
bubble_invite        → var(--accent-social) #7A9BAE
bubble_new_record    → var(--accent-food)   #C17B5E
bubble_member_joined → var(--accent-social) #7A9BAE
reaction_like        → var(--negative)      #B87272
comment_reply        → var(--accent-social) #7A9BAE
```

### 인라인 액션 버튼 (NotificationActions 컴포넌트)
- **[수락]**: `bg: var(--text)`, `color: #FFFFFF`, 11px semibold, `px-2.5 py-[3px] rounded-md`
- **[거절]**: `bg: transparent`, `color: var(--text-hint)`, `border: 1px solid var(--border)`, 동일 사이즈
- **처리 후**: 버튼 → 결과 텍스트로 치환
  - 수락: "수락 완료" (11px, `var(--positive)` 색상)
  - 거절: "거절됨" (11px, `var(--text-hint)` 색상)
- 액션 처리 시 해당 아이템 자동 읽음 처리 (dot 제거 + unread 해제)
- 버튼 클릭 시 `e.stopPropagation()` → 아이템 탭 이벤트 전파 방지

---

## 4. HOME 연동: 미읽음 뱃지

- 홈 헤더 🔔 아이콘에 미읽음 뱃지 dot 표시 (NotificationBell + UnreadBadge 컴포넌트)
- 뱃지 (`.notif-badge`):
  ```css
  position: absolute;
  top: 2px;
  right: 2px;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--brand);
  border: 1.5px solid var(--bg);
  pointer-events: none;
  ```
- 미읽음 0개: 뱃지 숨김 (`UnreadBadge` → `return null`)
- 미읽음 수 = `notifications WHERE user_id = me AND is_read = false` COUNT
- 뱃지는 숫자 없이 dot만 표시 (미읽음 유무만 전달)
- 벨 아이콘: `Bell` (lucide), `size={22}`, `.icon-btn` 클래스

---

## 5. 인터랙션

- 최대 20개 표시 (최신순, `created_at DESC`) — `MAX_NOTIFICATIONS = 20`
- **아이템 탭 (액션 없는 유형)**: 관련 페이지 이동 + `is_read = true` UPDATE + 드롭다운 닫기
- **아이템 탭 (액션 pending 유형)**: 읽음 처리만 수행, 페이지 이동 없음, 드롭다운 유지 (`actionStatus === 'pending' → return`, `onClose()` 미호출). 인라인 버튼만 동작
- **인라인 [수락] [거절]**: 낙관적 업데이트 → `actionStatus` 변경 + 읽음 처리 → 서버 반영 (드롭다운 유지)
- **"모두 읽음" 탭**: 전체 `is_read = true` 낙관적 업데이트 → 서버 반영 (드롭다운 유지, 액션 상태 변경 없음)
- **드롭다운 닫기**: 오버레이 탭, ESC 키, 벨 아이콘 재탭

### 네비게이션 매핑 (handleItemClick)
```typescript
config.navigationTarget === 'profile'       → router.push('/profile')
config.navigationTarget === 'bubble_detail'  → router.push(`/bubbles/${n.bubbleId}`)
config.navigationTarget === 'actor_profile'  → router.push(`/bubbler/${n.actorId}`)
config.navigationTarget === 'record_detail'  → router.push(`/bubbles/${n.bubbleId}`)
```

---

## 6. 데이터 소스

| UI 요소 | 소스 | 갱신 |
|---------|------|------|
| 알림 목록 | `notifications` 테이블 | 실시간 (Supabase realtime `postgres_changes` INSERT 구독) |
| 미읽음 수 | `notifications` (is_read=false COUNT) | 실시간 (useNotifications 내 SWR mutate + Supabase realtime) |
| 알림 설정 | `users.notify_push`, `notify_level_up`, `notify_bubble_join`, `notify_follow`, `dnd_start`, `dnd_end` | 사용자 변경 시 |

### DB 스키마 (008_notifications.sql + 018_notifications_title_body.sql)
```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  notification_type VARCHAR(30) NOT NULL,
  actor_id UUID REFERENCES users(id),
  target_type VARCHAR(20),
  target_id UUID,
  bubble_id UUID REFERENCES bubbles(id) ON DELETE SET NULL,
  metadata JSONB,
  is_read BOOLEAN NOT NULL DEFAULT false,
  action_status VARCHAR(10),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- 018_notifications_title_body.sql에서 추가
  title TEXT,
  body TEXT,

  CONSTRAINT chk_notif_type CHECK (notification_type IN (
    'level_up', 'bubble_join_request', 'bubble_join_approved',
    'follow_request', 'follow_accepted',
    'bubble_invite', 'bubble_new_record', 'bubble_member_joined',
    'reaction_like', 'comment_reply'
  )),
  CONSTRAINT chk_notif_action_status CHECK (
    action_status IS NULL OR action_status IN ('pending', 'accepted', 'rejected')
  )
);

CREATE INDEX idx_notifications_user ON notifications(user_id, is_read, created_at DESC);
```

---

## 7. 알림 설정 → SETTINGS 페이지로 편입

알림 설정은 `/settings` 페이지의 "알림" 섹션에서 관리:

| 항목 | 옵션 | 기본값 |
|------|------|--------|
| 푸시 알림 | ON / OFF | ON |
| 레벨업 알림 | ON / OFF | ON |
| 버블 가입 알림 | ON / OFF | ON |
| 팔로우 알림 | ON / OFF | ON |
| 방해 금지 | 시간 설정 | 꺼짐 (placeholder 23:00~08:00) |

> 상세 스펙: SETTINGS.md §알림 섹션 참조
> DB 필드: `users.notify_push`, `users.notify_level_up`, `users.notify_bubble_join`, `users.notify_follow`, `users.dnd_start`, `users.dnd_end`

---

## 8. 컴포넌트 구조

### 파일 구조 (실제 코드베이스)
```
src/presentation/components/
├── layout/
│   ├── app-header.tsx              # 앱 헤더 (벨+드롭다운 통합 관리)
│   └── notification-bell.tsx       # 🔔 벨 아이콘 + UnreadBadge
├── notification/
│   ├── notification-dropdown.tsx   # 드롭다운 컨테이너 (헤더+목록+푸터 포함)
│   ├── notification-item.tsx       # 개별 알림 아이템 (독립 컴포넌트, 현재 미사용)
│   ├── notification-icon.tsx       # 유형별 색상 아이콘 (lucide 매핑)
│   ├── notification-actions.tsx    # [수락][거절] 버튼 + 결과 텍스트
│   ├── notification-empty.tsx      # 빈 상태
│   └── unread-badge.tsx            # 미읽음 dot 뱃지
└── ui/
    └── popup-window.tsx            # 공통 팝업 (오버레이+ESC+Portal)
```

### 컴포넌트 트리
```
AppHeader (presentation/components/layout/app-header.tsx)
├── header
│   ├── "nyam" 로고 (→ / 이동)
│   ├── "bubbles" 링크 (→ /bubbles)
│   ├── NotificationBell (벨 아이콘 + UnreadBadge)
│   ├── HeaderLevelBar (레벨 진행 바)
│   └── AvatarDropdown (사용자 아바타)
└── NotificationDropdown
    └── PopupWindow (Portal + 오버레이 + ESC 핸들링)
        └── .notif-dropdown
            ├── .notif-header ("알림" + "모두 읽음")
            ├── 목록 (div.flex-1.overflow-y-auto — 단, 부모가 flex 아니므로 실제 스크롤은 .notif-dropdown의 overflow-y:auto가 담당)
            │   ├── NotificationEmpty (알림 0개일 때)
            │   └── 아이템 반복 (button.notif-item)
            │       ├── .notif-icon > NotificationIcon (유형별 아이콘)
            │       ├── 제목 (.notif-title)
            │       ├── 본문 (.notif-body, 조건부)
            │       ├── 타임스탬프 (.notif-time, formatTimeAgo)
            │       ├── NotificationActions (항상 렌더링, 내부 분기: pending→버튼, accepted/rejected→텍스트, null→null)
            │       └── .notif-unread-dot (미읽음일 때)
            └── div.notif-footer (borderTop)
                └── button.notif-footer ("알림 설정 →")
```

### 상태 관리 (SWR + 낙관적 업데이트)
```typescript
// useNotifications (application/hooks/use-notifications.ts)
// SWR로 서버 상태 관리, Supabase realtime으로 실시간 동기화

// 데이터
notifications: Notification[]      // SWR key: ['notifications', userId], 최대 20개
unreadCount: number                // SWR key: ['unread-count', userId]

// 실시간 구독
useEffect → notificationRepo.subscribeToNotifications(userId, onNew)
  // INSERT 이벤트 → SWR mutate로 목록+카운트 갱신

// 낙관적 업데이트 함수
markAsRead(id): void               // 개별 읽음 (낙관적 → 서버)
markAllAsRead(): void              // 전체 읽음 (낙관적 → 서버, 액션 상태 불변)
handleAction(id, action): void     // 수락/거절 (낙관적: actionStatus+isRead → 서버)
```

### useUnreadCount (별도 경량 훅 — 현재 미사용)
```typescript
// application/hooks/use-unread-count.ts
// 30초 간격 SWR 폴링 (refreshInterval: 30000)
// 현재 AppHeader에서 import하지 않음 — useNotifications의 unreadCount가 대신 사용됨
useUnreadCount() → { count: number, isLoading: boolean }
```

### 알림 엔티티 (domain/entities/notification.ts)
```typescript
type NotificationType =
  | 'level_up'
  | 'bubble_join_request'
  | 'bubble_join_approved'
  | 'follow_request'
  | 'follow_accepted'
  | 'bubble_invite'
  | 'bubble_new_record'
  | 'bubble_member_joined'
  | 'reaction_like'
  | 'comment_reply'

type ActionStatus = 'pending' | 'accepted' | 'rejected' | null

interface Notification {
  id: string
  userId: string
  type: NotificationType
  title: string
  body: string | null
  isRead: boolean
  actionStatus: ActionStatus
  actorId: string | null
  targetType: string | null
  targetId: string | null
  bubbleId: string | null
  createdAt: string
}

interface NotificationTypeConfig {
  type: NotificationType
  icon: string           // lucide 아이콘 이름
  iconColor: string      // CSS 변수
  hasAction: boolean     // 인라인 수락/거절 여부
  navigationTarget: 'profile' | 'bubble_detail' | 'actor_profile' | 'record_detail'
}
```

### Repository 인터페이스 (domain/repositories/notification-repository.ts)
```typescript
interface NotificationRepository {
  getNotifications(userId: string, limit: number): Promise<Notification[]>
  getUnreadCount(userId: string): Promise<number>
  markAsRead(notificationId: string): Promise<void>
  markAllAsRead(userId: string): Promise<void>
  updateActionStatus(notificationId: string, status: 'accepted' | 'rejected'): Promise<void>
  createNotification(notification: Omit<Notification, 'id' | 'createdAt' | 'isRead'>): Promise<Notification>
  subscribeToNotifications(
    userId: string,
    onNew: (notification: Notification) => void,
  ): { unsubscribe: () => void }
}
```

### Infrastructure 구현 (SupabaseNotificationRepository)
- `getNotifications`: `SELECT * ... ORDER BY created_at DESC LIMIT {limit}`
- `getUnreadCount`: `SELECT count ... WHERE is_read = false`
- `markAsRead`: `UPDATE is_read = true WHERE id = {id}`
- `markAllAsRead`: `UPDATE is_read = true WHERE user_id = {id} AND is_read = false`
- `updateActionStatus`: `UPDATE action_status + is_read = true WHERE id = {id}`
- `createNotification`: `INSERT ... RETURNING *`
- `subscribeToNotifications`: Supabase `postgres_changes` channel (INSERT 이벤트, `user_id=eq.{userId}` 필터)

### DI 등록 (shared/di/container.ts)
```typescript
export const notificationRepo: NotificationRepository = new SupabaseNotificationRepository()
```

### 미사용 CSS 클래스 (globals.css에 정의되어 있으나 컴포넌트에서 미적용)
- `.notif-action-accept`, `.notif-action-reject` — NotificationActions가 inline style 사용
- `.notif-icon.type-level`, `.type-bubble`, `.type-social`, `.type-success` — NotificationIcon이 inline style 사용
