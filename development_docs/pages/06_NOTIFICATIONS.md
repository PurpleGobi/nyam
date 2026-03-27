# NOTIFICATIONS — 알림 드롭다운

> depends_on: DATA_MODEL, AUTH, BUBBLE, XP_SYSTEM
> affects: HOME, SETTINGS
> UI: 홈 헤더 🔔 아이콘 → 드롭다운 팝업 (별도 페이지 없음)
> header: 앱 헤더 내 벨 아이콘

---

## 1. 와이어프레임

```
┌──────────────────────────────────────┐
│ nyam    bubbles [🔔] [J]            │  앱 헤더
│              ┌───────────────────┐   │
│              │ 알림         모두 읽음│   │  드롭다운 팝업
│              │                   │   │
│              │ 🏆 을지로 레벨 4!  ●│   │  레벨업 (caution)
│              │ 기록이 쌓이고 있어요 │   │
│              │          3시간 전  │   │
│              │───────────────────│   │
│              │ 🫧 김영수님 가입신청 ●│   │  버블 가입신청 (primary)
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

### 오버레이
```
position: absolute (device-inner 전체 덮음)
background: rgba(0,0,0,0.15)
backdrop-filter: blur(4px)
z-index: 190
```
- 드롭다운 오픈 시 함께 표시, 닫기 시 함께 숨김
- 오버레이 탭 → 드롭다운 닫기

### 드롭다운 컨테이너
```
position: absolute
top: 90px  (헤더 하단 기준)
right: 16px
width: 300px
max-height: 400px
overflow: hidden (내부 리스트만 스크롤)
background: var(--bg-elevated)
border: 1px solid var(--border)
border-radius: 14px
box-shadow: 0 6px 24px rgba(0,0,0,0.1)
z-index: 200
display: flex
flex-direction: column
transform-origin: top right
```

### 오픈 애니메이션
```css
@keyframes notifOpen {
  from { opacity: 0; transform: scale(0.94) translateY(-6px); }
  to   { opacity: 1; transform: scale(1)    translateY(0);    }
}
duration: 0.16s ease
```

### 헤더 바
- "알림" (14px, bold) 좌측
- "모두 읽음" (11px, `text-hint`) 우측 → 전체 읽음 처리
- 패딩: `px-3.5 pt-3 pb-2.5`
- 하단 구분선: 1px `border-bottom`

### 알림 아이템
```
┌──────────────────────────────────────┐
│ [아이콘]  제목 (13px)            [● dot] │
│          본문 (12px, text-sub)        │
│          타임스탬프 (11px, text-hint) │
│          [액션 버튼들] (있는 경우)     │
└──────────────────────────────────────┘
```
- **아이콘**: 16px, 배경 없음, **유형별 색상 분리** (§3 참조)
- **미읽음**: 제목 `font-weight: 600` + 우측 `●` 도트 (`bg-brand`, 6px)
- **읽음**: 제목 `font-weight: 500`, 도트 없음
- **패딩**: `px-3.5 py-2.75`
- **탭 동작**: 관련 페이지로 이동 + 자동 읽음 처리 + 드롭다운 닫기
- **아이템 사이 구분**: 1px `border-bottom` (마지막 아이템은 구분선 없음)

### 하단 링크
- "알림 설정 →" 텍스트 → `/settings` (알림 섹션으로 스크롤)
- 중앙 정렬, 12px, `accent-social`, `py-2.25`
- 상단 구분선: 1px `border-top`

### 빈 상태
```
┌──────────────────────────────────────┐
│            🔔                        │
│     아직 알림이 없어요                │
└──────────────────────────────────────┘
```

---

## 3. 알림 유형 (5가지만)

| 유형 | 아이콘 | 아이콘 색상 | 제목 | 본문 | 탭 이동 | 인라인 액션 |
|------|--------|------------|------|------|---------|------------|
| 레벨업 | `trophy` | `caution` | {area} 레벨 {level} 달성! | 기록이 쌓이고 있어요 | 프로필 | — |
| 버블 가입신청 | `circle-dot` | `primary` | {nickname}님이 '{bubble_name}' 가입을 신청했어요 | — | 버블 상세 | [수락] [거절] |
| 팔로우 요청 | `user-plus` | `accent-social` | {nickname}님이 팔로우를 요청했어요 | — | 상대 프로필 | [수락] [거절] |
| 버블 가입승인 | `circle-check` | `positive` | '{bubble_name}' 가입이 승인되었어요 | — | 버블 상세 | — |
| 팔로우 수락 | `user-check` | `accent-social` | {nickname}님이 팔로우를 수락했어요 | — | 상대 프로필 | — |

### 아이콘 색상 매핑
```
type-level   → var(--caution)       #C9A96E
type-bubble  → var(--primary)       #C17B5E
type-social  → var(--accent-social) #7A9BAE
type-success → var(--positive)      #7EAE8B
```

### 인라인 액션 버튼
- **[수락]**: `bg-text text-white`, 11px semibold, `px-2.5 py-0.75 rounded-md`
- **[거절]**: `bg-transparent text-hint border border-border`, 동일 사이즈
- **처리 후**: 버튼 → 결과 텍스트로 치환
  - 수락: "수락 완료" (11px, semibold, `positive` 색상)
  - 거절: "거절됨" (11px, `text-hint` 색상)
- 액션 처리 시 해당 아이템 자동 읽음 처리 (dot 제거 + unread 해제)

---

## 4. HOME 연동: 미읽음 뱃지

- 홈 헤더 🔔 아이콘에 미읽음 뱃지 dot 표시
- 뱃지: `absolute top-0.5 right-0.5`, `bg-brand rounded-full w-[7px] h-[7px]`
- 뱃지 테두리: `1.5px solid var(--bg)` (배경색과 동일한 테두리로 분리감)
- 미읽음 0개: 뱃지 숨김 (`display: none`)
- 미읽음 수 = `notifications WHERE user_id = me AND is_read = false` COUNT
- 뱃지는 숫자 없이 dot만 표시 (미읽음 유무만 전달)

---

## 5. 인터랙션

- 최대 20개 표시 (최신순, `created_at DESC`)
- **아이템 탭**: 관련 페이지 이동 + `is_read = true` UPDATE + 드롭다운 닫기
- **버블 가입신청 / 팔로우 요청**: 인라인 [수락] [거절] 버튼 (탭 이동 없이 즉시 처리)
- **"모두 읽음" 탭**: 전체 `is_read = true` UPDATE + 모든 dot 제거
- **드롭다운 닫기**: 오버레이 탭, ESC 키, 벨 아이콘 재탭
- **인라인 액션 처리 후**: 버튼 → 결과 텍스트 치환 + 해당 아이템 읽음 처리

---

## 6. 데이터 소스

| UI 요소 | 소스 | 갱신 |
|---------|------|------|
| 알림 목록 | notifications | 실시간 (Supabase realtime 구독) |
| 미읽음 수 | notifications (is_read=false COUNT) | 실시간 |
| 알림 설정 | `users.notify_push`, `notify_level_up`, `notify_bubble_join`, `notify_follow`, `dnd_start`, `dnd_end` | 사용자 변경 시 |

---

## 7. 알림 설정 → SETTINGS 페이지로 편입

알림 설정은 `/settings` 페이지의 "알림" 섹션에서 관리:

| 항목 | 옵션 | 기본값 |
|------|------|--------|
| 푸시 알림 | ON / OFF | ON |
| 레벨업 알림 | ON / OFF | ON |
| 버블 가입 알림 | ON / OFF | ON |
| 팔로우 알림 | ON / OFF | ON |
| 방해 금지 | 시간 설정 | 23:00~08:00 |

> 상세 스펙: SETTINGS.md §알림 섹션 참조

---

## 8. 컴포넌트 구조

```
NotificationDropdown/
├── NotificationOverlay          # 블러 오버레이 (닫기 트리거)
├── NotificationDropdownHeader   # "알림" + "모두 읽음"
├── NotificationList             # 스크롤 가능한 아이템 목록
│   ├── NotificationItem         # 개별 알림 아이템
│   │   ├── NotificationIcon     # 유형별 색상 아이콘
│   │   ├── NotificationContent  # 제목 + 본문 + 타임스탬프
│   │   ├── NotificationDot      # 미읽음 도트 (조건부)
│   │   └── NotificationActions  # [수락][거절] 버튼 (조건부)
│   └── NotificationEmpty        # 빈 상태
└── NotificationDropdownFooter   # "알림 설정 →"
```

### 상태 관리
```typescript
// 드롭다운 상태
isOpen: boolean                    // 드롭다운 열림/닫힘

// 알림 데이터 (서버 상태 — React Query)
notifications: Notification[]      // 최대 20개, created_at DESC
unreadCount: number                // 미읽음 수 (뱃지 표시용)

// 낙관적 업데이트
markAsRead(id): void               // 개별 읽음 처리
markAllAsRead(): void              // 전체 읽음 처리
handleAction(id, action): void     // 수락/거절 처리
```

### 알림 엔티티 (domain)
```typescript
interface Notification {
  id: string;
  user_id: string;
  type: 'level_up' | 'bubble_join_request' | 'bubble_join_approved' | 'follow_request' | 'follow_accepted';
  title: string;
  body: string | null;
  is_read: boolean;
  action_status: 'pending' | 'accepted' | 'declined' | null;
  // 연결 참조
  target_user_id: string | null;     // 팔로우 관련
  target_bubble_id: string | null;   // 버블 관련
  // 메타
  created_at: string;
}
```
