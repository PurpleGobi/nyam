# 01: 앱 셸 — 헤더 + FAB 공통 컴포넌트

> 모든 페이지에서 재사용되는 앱 헤더(glassmorphism), FAB 버튼 4종, 아바타 드롭다운 구현

---

## SSOT 출처

| 문서 | 섹션 |
|------|------|
| `pages/06_HOME.md` | §2-1 앱 헤더, §2-5 FAB |
| `systems/DESIGN_SYSTEM.md` | §0 Brand & 로고, §1 컬러 토큰, 앱 헤더 공통 요소 |
| `prototype/01_home.html` | `.top-fixed`, `.fab-add`, `.fab-back` |

---

## 구현 완료 파일 목록

```
src/presentation/components/layout/app-header.tsx        ← 앱 공통 헤더 (로고+bubbles+bell+레벨바+아바타)
src/presentation/components/layout/avatar-dropdown.tsx   ← 아바타 드롭다운 메뉴
src/presentation/components/layout/notification-bell.tsx ← 알림 벨 + 미읽음 뱃지
src/presentation/components/layout/header-level-bar.tsx  ← XP 레벨 바 (헤더 내 표시)
src/presentation/components/layout/fab-back.tsx          ← 뒤로가기 FAB (좌측)
src/presentation/components/layout/fab-add.tsx           ← 추가 FAB (우측, variant 지원)
src/presentation/components/layout/fab-forward.tsx       ← 전진 FAB (우측, accent)
src/presentation/components/layout/fab-actions.tsx       ← 멀티 액션 FAB (수정/공유/삭제 등)
```

---

## 상세 구현 현황

### 1. AppHeader 컴포넌트

단일 variant로 구현 (main/inner 구분 없음). 모든 메인 페이지에서 동일 헤더 사용.

```typescript
export function AppHeader() {
  // useAuth() → user 정보
  // useNotifications() → notifications, unreadCount, markAsRead 등
  // useXp() → levelInfo (XP 레벨 정보)
}
```

**레이아웃**:

```
┌──────────────────────────────────────┐
│ nyam    bubbles 🔔 [레벨바] [아바타]  │
└──────────────────────────────────────┘
좌: 로고   우: bubbles + bell + 레벨바 + avatar
```

- `nyam` 로고: Comfortaa, gradient, 클릭 시 `/` 이동
- `bubbles`: Comfortaa, `--brand` 색상, 클릭 시 `/bubbles` 이동
- 알림 벨: `NotificationBell` — unreadCount > 0 시 dot 표시
- 알림 드롭다운: `NotificationDropdown` — 벨 클릭 시 팝오버
- 레벨 바: `HeaderLevelBar` — XP 레벨 뱃지 + 진행률 바
- 아바타: `AvatarDropdown` — 프로필/설정 메뉴

**CSS**: `.top-fixed` (sticky, glassmorphism blur)

### 2. HeaderLevelBar 컴포넌트

```typescript
interface HeaderLevelBarProps {
  levelInfo: LevelInfo   // { level, progress, color, ... }
}
```

- 레벨 뱃지: 레벨 숫자 + levelInfo.color 배경
- XP 트랙: progress 비율로 fill 너비 결정
- CSS: `.header-level-bar`, `.header-level-badge`, `.header-xp-track`, `.header-xp-fill`

### 3. FABAdd 컴포넌트

```typescript
type FabVariant = 'default' | 'food' | 'wine' | 'social'

interface FabAddProps {
  onClick: () => void
  variant?: FabVariant   // default: 'default' (glassmorphism), food/wine/social: accent 배경
}
```

- variant별 스타일: default=투명, food=`--accent-food`, wine=`--accent-wine`, social=`--accent-social`
- 아이콘: `Plus` lucide 26x26
- HomeContainer에서는 `variant={activeTab === 'wine' ? 'wine' : 'food'}` 으로 사용
- 클릭 시 `/add?type=${activeTab}` 이동

### 4. FABBack 컴포넌트

```typescript
interface FabBackProps {
  onClick?: () => void   // 생략 시 useBackNavigation().goBack() 사용
}
```

- `useBackNavigation` 훅으로 네비게이션 depth 기반 뒤로가기
- 아이콘: `ChevronLeft` lucide 22x22
- CSS: `.fab-back` (fixed, 좌하단)

### 5. FABForward 컴포넌트

- 기록 플로우 "다음 단계"에 사용
- accent 배경, 흰색 아이콘

### 6. FABActions 컴포넌트

```typescript
interface FabActionsProps {
  variant?: 'food' | 'wine'
  buttons?: FabActionButton[]  // 커스텀 버튼 배열
  onEdit?: () => void
  onShare?: () => void
  onDelete?: () => void
}
```

- preset: 상세 페이지용 수정/공유/삭제 버튼 조합
- 커스텀 buttons 배열로 자유롭게 구성 가능
- tone: 'accent' | 'neutral' | 'danger' 로 스타일 분기

---

## 데이터 흐름

```
[사용자 세션] → useAuth() → { user }
                          → AppHeader → NotificationBell(unreadCount)
                                      → HeaderLevelBar(levelInfo)
                                      → AvatarDropdown(nickname, avatarUrl)

[notifications 테이블] → useNotifications() → { notifications, unreadCount, markAsRead, markAllAsRead }
                       → NotificationDropdown (벨 클릭 시 토글)

[xp 시스템] → useXp(userId) → { levelInfo }
           → HeaderLevelBar → 레벨 뱃지 + XP 진행률 바

[FABAdd 탭] → router.push('/add?type=restaurant') 또는 '/add?type=wine'
```

---

## 검증 체크리스트

```
□ AppHeader: nyam 로고 그라데이션 정상, Comfortaa
□ AppHeader: bubbles 텍스트 --brand, Comfortaa
□ AppHeader: glassmorphism (blur, opacity, shadow)
□ NotificationBell: 미읽음 시 dot 표시
□ NotificationDropdown: 벨 클릭 시 팝오버, 알림 목록 표시
□ HeaderLevelBar: 레벨 뱃지 + XP 진행률 바 표시
□ AvatarDropdown: 원형 아바타, 이니셜, 드롭다운 (프로필/설정)
□ AvatarDropdown: 외부 클릭 / Escape 시 닫힘
□ FABBack: fixed 좌하단, useBackNavigation 연동
□ FABAdd: variant 지원 (food/wine/social/default), Plus 26x26
□ FABForward: accent 배경, 흰색 아이콘
□ FABActions: 수정/공유/삭제 또는 커스텀 버튼 조합
□ R1~R5 위반 없음
□ pnpm build 에러 없음
□ pnpm lint 경고 0개
```
