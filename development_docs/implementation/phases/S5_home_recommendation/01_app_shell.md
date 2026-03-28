# 01: 앱 셸 — 헤더 + FAB 공통 컴포넌트

> 모든 페이지에서 재사용되는 앱 헤더(glassmorphism), FAB 버튼 3종, 아바타 드롭다운 구현

---

## SSOT 출처

| 문서 | 섹션 |
|------|------|
| `pages/06_HOME.md` | §2-1 앱 헤더, §2-5 FAB |
| `systems/DESIGN_SYSTEM.md` | §0 Brand & 로고, §1 컬러 토큰, 앱 헤더 공통 요소 |
| `prototype/01_home.html` | `.top-fixed`, `.fab-add`, `.fab-back` |

---

## 선행 조건

- S1: 디자인 토큰 (`@theme` block, CSS 변수 전체), 인증 (로그인 상태, 사용자 정보)
- S4: 알림 시스템 (notifications 테이블, 미읽음 카운트 조회)

---

## 구현 범위

### 파일 목록

```
src/presentation/components/layout/app-header.tsx        ← 앱 공통 헤더 (메인 + 이너)
src/presentation/components/layout/avatar-dropdown.tsx   ← 아바타 드롭다운 메뉴
src/presentation/components/layout/fab-back.tsx          ← 뒤로가기 FAB (좌측)
src/presentation/components/layout/fab-add.tsx           ← 추가 FAB (우측)
src/presentation/components/layout/fab-forward.tsx       ← 전진 FAB (우측, accent)
src/presentation/components/layout/notification-bell.tsx ← 알림 벨 + 미읽음 뱃지
src/presentation/hooks/use-dropdown.ts                   ← 드롭다운 open/close 훅
src/application/hooks/use-unread-count.ts                ← 미읽음 알림 수 조회
```

### 스코프 외

- 알림 드롭다운 상세 패널 (S8)
- 알림 목록 페이지 (S6)
- 바텀 네비게이션 (이 태스크에서 구현하지 않음 — 별도 레이아웃 태스크)

---

## 상세 구현 지침

### 1. AppHeader 컴포넌트

두 가지 모드를 `variant` prop으로 구분한다.

#### variant="main" (홈, 버블, 프로필)

```typescript
interface AppHeaderProps {
  variant?: 'main' | 'inner'; // default: 'main'
  // variant="inner" 전용
  title?: string;
  backHref?: string; // 생략 시 router.back() fallback
  actions?: React.ReactNode;
}
```

**레이아웃 (main)**:

```
┌──────────────────────────────┐
│ nyam    bubbles 🔔 [J]      │
└──────────────────────────────┘
좌: 로고   우: bubbles + bell + avatar (gap 6px)
```

**CSS 클래스**: `.top-fixed`

```css
.top-fixed {
  position: sticky;
  top: 0;
  z-index: 60;
  padding: 2px 16px 8px;
  background: rgba(248, 246, 243, 0.55);
  backdrop-filter: blur(20px) saturate(1.5);
  -webkit-backdrop-filter: blur(20px) saturate(1.5);
  box-shadow: 0 1px 12px rgba(0, 0, 0, 0.08);
  display: flex;
  align-items: center;
  justify-content: space-between;
}
```

**nyam 로고**:

```css
.header-logo {
  font-family: 'Comfortaa', cursive;
  font-weight: 700;
  font-size: 22px;
  letter-spacing: -0.5px;
  background: linear-gradient(135deg, #FF6038, #8B7396);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  cursor: pointer;
  user-select: none;
}
/* 다크모드 */
.dark .header-logo {
  background: linear-gradient(135deg, #FF8060, #B8A0C8);
}
```

로고 클릭 시 `/` (홈)으로 이동한다.

**bubbles 텍스트 버튼**:

```css
.header-bubbles {
  font-family: 'Comfortaa', cursive;
  font-weight: 700;
  font-size: 13px;
  color: var(--brand); /* #FF6038 */
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px 0;
}
```

클릭 시 `/bubbles`로 이동한다.

#### variant="inner" (상세, 설정)

```
┌──────────────────────────────┐
│ ← 식당 상세              [⋮] │
└──────────────────────────────┘
좌: back + title   우: actions (선택)
```

- back 아이콘: `chevron-left` lucide 20x20, `--text` 색상
- title: 16px weight 600, `--text` 색상
- 배경/blur/z-index: main과 동일

### 2. NotificationBell 컴포넌트

```typescript
interface NotificationBellProps {
  unreadCount: number;
  onClick: () => void;
}
```

```css
.icon-btn {
  width: 34px;
  height: 34px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  border: none;
  background: none;
  cursor: pointer;
  position: relative;
}

.notification-badge {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--brand); /* #FF6038 */
}
```

- 벨 아이콘: `bell` lucide 20x20, stroke `--text`
- 뱃지: `unreadCount > 0`일 때만 렌더
- 탭 시 `onClick` 호출 (알림 드롭다운 토글 — S8에서 구현, 여기서는 콜백만)

### 3. AvatarDropdown 컴포넌트

```typescript
interface AvatarDropdownProps {
  nickname: string;
  avatarUrl: string | null;
  avatarColor: string | null; // null 시 var(--accent-food) fallback
}
```

**아바타 원형**:

```css
.header-avatar {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
  color: #fff;
  cursor: pointer;
  overflow: hidden;
  /* avatarColor가 background, avatarUrl이 있으면 <img> */
}
```

**드롭다운 메뉴**:

```css
.avatar-dropdown {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  min-width: 120px;
  background: var(--bg-elevated); /* #FFFFFF */
  border-radius: 10px;
  border: 1px solid var(--border);
  box-shadow: 0 8px 28px rgba(0, 0, 0, 0.12);
  z-index: 90;
  overflow: hidden;
  padding: 4px;
}

.avatar-dropdown-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  font-size: 13px;
  font-weight: 500;
  color: var(--text);
  border-radius: 8px;
  cursor: pointer;
}
.avatar-dropdown-item:hover {
  background: var(--bg);
}
```

| 항목 | 아이콘 | 라벨 | 동작 |
|------|--------|------|------|
| 프로필 | `user` lucide 16x16 | 프로필 | → `/profile` |
| 설정 | `settings` lucide 16x16 | 설정 | → `/settings` |

외부 클릭 시 닫힘 (`use-dropdown.ts`에서 `useEffect` + `mousedown` 이벤트로 처리).

### 4. FABBack 컴포넌트

```typescript
interface FABBackProps {
  onClick: () => void; // router.back() 또는 특정 경로
}
```

```css
.fab-back {
  position: fixed;
  bottom: 28px;
  left: 16px;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: rgba(248, 246, 243, 0.88);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid var(--border);
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.12);
  z-index: 85;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}
```

- 아이콘: `chevron-left` lucide 22x22, `--text` 색상
- 이너 페이지(상세, 설정)에서만 렌더

### 5. FABAdd 컴포넌트

```typescript
interface FABAddProps {
  currentTab: 'restaurant' | 'wine';
  onClick: () => void;
}
```

```css
.fab-add {
  position: fixed;
  bottom: 28px;
  right: 16px;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: rgba(248, 246, 243, 0.88);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid var(--border);
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.12);
  z-index: 85;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}
```

- 아이콘: `plus` lucide 22x22, `--text` 색상
- 홈에서만 렌더
- 탭 동작: `currentTab`에 따라 분기 (식당 → 카메라/음식 인식, 와인 → 카메라/라벨 인식)

### 6. FABForward 컴포넌트

```typescript
interface FABForwardProps {
  onClick: () => void;
  disabled?: boolean;
  accentColor?: string; // default: 'var(--accent-food)', 와인 플로우 시 'var(--accent-wine)'
}
```

```css
.fab-forward {
  position: fixed;
  bottom: 28px;
  right: 16px;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: var(--accent-food); /* 식당 플로우 기본, 와인 플로우 시 --accent-wine */
  border: none;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.12);
  z-index: 85;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #fff;
}
.fab-forward:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
```

- 아이콘: `chevron-right` lucide 22x22, 흰색
- 기록 플로우에서 "다음 단계"에 사용

### 7. useDropdown 훅

```typescript
// src/presentation/hooks/use-dropdown.ts
function useDropdown(containerRef: React.RefObject<HTMLElement | null>): {
  isOpen: boolean;
  toggle: () => void;
  close: () => void;
}
```

- 호출 측에서 `containerRef`를 생성하여 전달
- `containerRef` 외부 클릭 시 `close()` 자동 호출
- `Escape` 키 시 `close()` 호출

### 8. useUnreadCount 훅

```typescript
// src/application/hooks/use-unread-count.ts
function useUnreadCount(): {
  count: number;
  isLoading: boolean;
}
```

- `notifications` 테이블에서 `user_id = 현재 사용자 AND is_read = false` 카운트
- 30초 간격 리프레시 (SWR `refreshInterval: 30000`)

---

## 목업 매핑

| 목업 요소 | 컴포넌트 | 비고 |
|-----------|----------|------|
| `prototype/01_home.html` `.top-fixed` | `AppHeader variant="main"` | 홈/버블/프로필 공통 |
| `prototype/02_detail_restaurant.html` 상단 | `AppHeader variant="inner"` | 상세 페이지 |
| `prototype/01_home.html` `.fab-add` | `FABAdd` | 홈 우하단 |
| `prototype/02_detail_restaurant.html` `.fab-back` | `FABBack` | 상세 좌하단 |

---

## 데이터 흐름

```
[사용자 세션] → useAuth() → { user: AuthUser { id, email, nickname, avatarUrl, authProvider } }
                          → AppHeader → NotificationBell(unreadCount)
                                      → AvatarDropdown(nickname, avatarUrl, avatarColor=null)

[notifications 테이블] → useNotifications() → { unreadCount, notifications, markAsRead, ... }
                       → AppHeader 내부에서 NotificationBell + NotificationDropdown에 공급

[useUnreadCount 훅] → 단독 사용 시 (AppHeader 외부에서 미읽음 수만 필요할 때)

[FABAdd 탭] → currentTab 판별 → 기록 플로우 진입 (S3 카메라/검색)
```

---

## 검증 체크리스트

```
□ AppHeader variant="main": nyam 로고 그라데이션 정상, Comfortaa 22px 700
□ AppHeader variant="main": bubbles 텍스트 #FF6038, Comfortaa 13px 700
□ AppHeader variant="main": glassmorphism (blur 20px, 55% opacity, shadow)
□ AppHeader variant="inner": ← back + title + actions 레이아웃
□ NotificationBell: 34x34 아이콘 버튼, 미읽음 시 7px --brand dot
□ AvatarDropdown: 30x30 원형, 이니셜 12px 700 흰색, 드롭다운 120px min-width
□ AvatarDropdown: 외부 클릭 / Escape 시 닫힘
□ FABBack: fixed left 16px bottom 28px, 44x44, glassmorphism
□ FABAdd: fixed right 16px bottom 28px, 44x44, glassmorphism, plus 22x22
□ FABForward: accent 배경, 흰색 아이콘, disabled 시 opacity 0.4
□ 다크모드: 로고 그라데이션 (#FF8060 → #B8A0C8)
□ 360px: 모든 헤더 요소 잘림 없음, FAB 겹침 없음
□ z-index: 헤더 60, FAB 85, 드롭다운 90
□ R1~R5 위반 없음
□ pnpm build 에러 없음
□ pnpm lint 경고 0개
```
