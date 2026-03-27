# S6-T3: 설정 페이지

> SSOT: `pages/11_SETTINGS.md`, `systems/AUTH.md`, `systems/DATA_MODEL.md`
> 선행: S1 (DB, Auth), S6-T2 (프로필)
> 라우트: `/settings`
> 목업: `prototype/05_settings.html`

---

## 1. 라우팅

| 라우트 | 파일 | 역할 |
|--------|------|------|
| `/settings` | `src/app/(main)/settings/page.tsx` | SettingsContainer 렌더링만 |

---

## 2. Domain 엔티티

### `src/domain/entities/settings.ts`

```typescript
/** 프라이버시 가시성 설정 (JSONB) */
export interface VisibilityConfig {
  score: boolean;
  comment: boolean;
  photos: boolean;
  level: boolean;
  quadrant: boolean;
  bubbles: boolean;
  price: boolean;
}

/** 프라이버시 프로필 공개 범위 */
export type PrivacyProfile = 'public' | 'bubble_only' | 'private';

/** 기록 공개 범위 */
export type PrivacyRecords = 'all' | 'shared_only';

/** 사용자 설정 (users 테이블에서 추출) */
export interface UserSettings {
  // 계정
  nickname: string;
  bio: string | null;
  avatarUrl: string | null;

  // 프라이버시
  privacyProfile: PrivacyProfile;
  privacyRecords: PrivacyRecords;
  visibilityPublic: VisibilityConfig;
  visibilityBubble: VisibilityConfig;

  // 알림
  notifyPush: boolean;
  notifyLevelUp: boolean;
  notifyBubbleJoin: boolean;
  notifyFollow: boolean;
  dndStart: string | null;       // 'HH:MM' (예: '23:00')
  dndEnd: string | null;         // 'HH:MM' (예: '08:00')

  // 화면 디폴트
  prefLanding: string;            // 'last'|'home'|'bubbles'|'profile'
  prefHomeTab: string;            // 'last'|'restaurant'|'wine'
  prefRestaurantSub: string;      // 'last'|'visited'|'wishlist'|'recommended'|'following'
  prefWineSub: string;            // 'last'|'tasted'|'wishlist'|'cellar'
  prefBubbleTab: string;          // 'last'|'bubble'|'bubbler'
  prefViewMode: string;           // 'last'|'detailed'|'compact'|'calendar'

  // 기능 디폴트
  prefDefaultSort: string;        // 'latest'|'score_high'|'score_low'|'name'|'visit_count'
  prefRecordInput: string;        // 'camera'|'search'
  prefBubbleShare: string;        // 'ask'|'auto'|'never'
  prefTempUnit: string;           // 'C'|'F'

  // 계정 삭제
  deletedAt: string | null;
  deleteMode: 'anonymize' | 'hard_delete' | null;
  deleteScheduledAt: string | null;
}

/** 버블별 프라이버시 오버라이드 (bubble_members 테이블) */
export interface BubblePrivacyOverride {
  bubbleId: string;
  bubbleName: string;
  bubbleAvatarColor: string | null;
  useDefault: boolean;            // visibility_override === null
  visibilityOverride: VisibilityConfig | null;
}

/** 계정 삭제 모드 */
export type DeleteMode = 'anonymize' | 'hard_delete';

/** NyamSelect 옵션 */
export interface SelectOption {
  value: string;
  label: string;
}
```

---

## 3. Domain Repository

### `src/domain/repositories/settings-repository.ts`

```typescript
import type { UserSettings, VisibilityConfig, PrivacyProfile, PrivacyRecords, BubblePrivacyOverride, DeleteMode } from '@/domain/entities/settings';

export interface SettingsRepository {
  getUserSettings(userId: string): Promise<UserSettings>;

  // 계정
  updateNickname(userId: string, nickname: string): Promise<void>;
  updateBio(userId: string, bio: string): Promise<void>;
  updateAvatar(userId: string, avatarUrl: string): Promise<void>;

  // 프라이버시
  updatePrivacyProfile(userId: string, value: PrivacyProfile): Promise<void>;
  updatePrivacyRecords(userId: string, value: PrivacyRecords): Promise<void>;
  updateVisibilityPublic(userId: string, config: VisibilityConfig): Promise<void>;
  updateVisibilityBubble(userId: string, config: VisibilityConfig): Promise<void>;

  // 버블별 프라이버시
  getBubblePrivacyOverrides(userId: string): Promise<BubblePrivacyOverride[]>;
  updateBubbleVisibilityOverride(userId: string, bubbleId: string, override: VisibilityConfig | null): Promise<void>;

  // 알림
  updateNotifySetting(userId: string, field: string, value: boolean): Promise<void>;
  updateDndTime(userId: string, start: string | null, end: string | null): Promise<void>;

  // 화면/기능 디폴트
  updatePreference(userId: string, field: string, value: string): Promise<void>;

  // 계정 삭제
  requestAccountDeletion(userId: string, mode: DeleteMode): Promise<void>;
  cancelAccountDeletion(userId: string): Promise<void>;

  // 데이터
  exportData(userId: string, format: 'json' | 'csv'): Promise<Blob>;
  importData(userId: string, file: File): Promise<void>;
  getCacheSize(): Promise<number>;
  clearCache(): Promise<void>;
}
```

---

## 4. Application Hook

### `src/application/hooks/use-settings.ts`

```typescript
import useSWR, { useSWRConfig } from 'swr';
import { useCallback, useState } from 'react';
import { settingsRepo } from '@/shared/di/container';
import { useAuth } from '@/application/hooks/use-auth';
import type { VisibilityConfig, PrivacyProfile, PrivacyRecords, DeleteMode } from '@/domain/entities/settings';

export function useSettings() {
  const { user } = useAuth();
  const userId = user?.id;
  const { mutate } = useSWRConfig();

  const { data: settings, isLoading, error } = useSWR(
    userId ? ['settings', userId] : null,
    () => settingsRepo.getUserSettings(userId!),
  );

  const { data: bubbleOverrides } = useSWR(
    userId ? ['bubble-overrides', userId] : null,
    () => settingsRepo.getBubblePrivacyOverrides(userId!),
  );

  // ── 프라이버시 ──

  const updatePrivacyProfile = useCallback(async (value: PrivacyProfile) => {
    if (!userId || !settings) return;
    // optimistic update
    mutate(['settings', userId], { ...settings, privacyProfile: value }, false);
    try {
      await settingsRepo.updatePrivacyProfile(userId, value);
    } catch {
      // 롤백
      mutate(['settings', userId]);
    }
  }, [userId, settings, mutate]);

  const updatePrivacyRecords = useCallback(async (value: PrivacyRecords) => {
    if (!userId || !settings) return;
    mutate(['settings', userId], { ...settings, privacyRecords: value }, false);
    try {
      await settingsRepo.updatePrivacyRecords(userId, value);
    } catch {
      mutate(['settings', userId]);
    }
  }, [userId, settings, mutate]);

  const updateVisibilityPublic = useCallback(async (config: VisibilityConfig) => {
    if (!userId || !settings) return;
    mutate(['settings', userId], { ...settings, visibilityPublic: config }, false);
    try {
      await settingsRepo.updateVisibilityPublic(userId, config);
    } catch {
      mutate(['settings', userId]);
    }
  }, [userId, settings, mutate]);

  const updateVisibilityBubble = useCallback(async (config: VisibilityConfig) => {
    if (!userId || !settings) return;
    mutate(['settings', userId], { ...settings, visibilityBubble: config }, false);
    try {
      await settingsRepo.updateVisibilityBubble(userId, config);
    } catch {
      mutate(['settings', userId]);
    }
  }, [userId, settings, mutate]);

  // ── 알림 ──

  const updateNotify = useCallback(async (field: string, value: boolean) => {
    if (!userId) return;
    await settingsRepo.updateNotifySetting(userId, field, value);
    mutate(['settings', userId]);
  }, [userId, mutate]);

  // ── 환경설정 ──

  const updatePreference = useCallback(async (field: string, value: string) => {
    if (!userId) return;
    await settingsRepo.updatePreference(userId, field, value);
    mutate(['settings', userId]);
  }, [userId, mutate]);

  // ── 계정 삭제 ──

  const requestDeletion = useCallback(async (mode: DeleteMode) => {
    if (!userId) return;
    await settingsRepo.requestAccountDeletion(userId, mode);
    mutate(['settings', userId]);
  }, [userId, mutate]);

  const cancelDeletion = useCallback(async () => {
    if (!userId) return;
    await settingsRepo.cancelAccountDeletion(userId);
    mutate(['settings', userId]);
  }, [userId, mutate]);

  return {
    settings,
    bubbleOverrides,
    isLoading,
    error,
    updatePrivacyProfile,
    updatePrivacyRecords,
    updateVisibilityPublic,
    updateVisibilityBubble,
    updateNotify,
    updatePreference,
    requestDeletion,
    cancelDeletion,
  };
}
```

---

## 5. Presentation 컴포넌트 구조

### 컴포넌트 트리

```
SettingsContainer
├── InnerPageHeader (← 설정 | bubbles bell avatar)
├── ScrollArea
│   ├── SettingsSection [계정]
│   │   └── SettingsCard
│   │       ├── SettingsItem (pencil, 닉네임, chevron)
│   │       ├── SettingsItem (message-square, 한줄 소개, chevron)
│   │       └── SettingsItem (image, 아바타, chevron)
│   ├── SettingsSection [프라이버시]
│   │   └── SettingsCard
│   │       ├── SegmentControl (전체 공개 / 버블만 / 비공개)
│   │       ├── SegmentControl (공유한 기록만 / 모든 기록) — privacyBase !== 'private' 시만
│   │       ├── PrivacySummary (상태 요약 텍스트)
│   │       ├── PrivacyLayer [전체에게 보이는 항목] — privacyBase === 'public' 시만
│   │       │   └── Toggle × 6 (score/comment/photos/level/quadrant/bubbles)
│   │       │   └── SettingsItem (price — disabled, "버블에서만" 힌트)
│   │       ├── PrivacyLayer [버블 멤버 기본 공개] — privacyBase !== 'private' 시만
│   │       │   └── Toggle × 7
│   │       ├── PrivacyLayer [버블별 설정] — privacyBase !== 'private' 시만
│   │       │   └── BubbleOverrideItem × N (→ BubblePrivacySheet)
│   │       └── PrivacyNote (안내 노트 4항목)
│   ├── SettingsSection [알림]
│   │   └── SettingsCard
│   │       ├── SettingsItem + Toggle (bell, 푸시 알림)
│   │       ├── SettingsItem + Toggle (trophy, 레벨업 알림)
│   │       ├── SettingsItem + Toggle (circle-dot, 버블 가입)
│   │       ├── SettingsItem + Toggle (user-plus, 팔로우)
│   │       └── SettingsItem (moon, 방해 금지, 현재값 + chevron)
│   ├── SettingsSection [화면 디폴트]
│   │   └── SettingsCard
│   │       ├── SettingsItem + NyamSelect (home, 랜딩 화면)
│   │       ├── SettingsItem + NyamSelect (utensils, 홈 시작 탭)
│   │       ├── SettingsItem + NyamSelect (map-pin, 식당 서브탭)
│   │       ├── SettingsItem + NyamSelect (wine, 와인 서브탭)
│   │       ├── SettingsItem + NyamSelect (circle-dot, 버블 시작 탭)
│   │       └── SettingsItem + NyamSelect (layout-grid, 홈 보기 모드)
│   ├── SettingsSection [기능 디폴트]
│   │   └── SettingsCard
│   │       ├── SettingsItem + NyamSelect (arrow-up-down, 기본 정렬)
│   │       ├── SettingsItem + NyamSelect (camera, 기록 시 카메라)
│   │       ├── SettingsItem + NyamSelect (share-2, 기록 후 버블 공유)
│   │       └── SettingsItem + NyamSelect (thermometer, 와인 온도 단위)
│   ├── SettingsSection [데이터]
│   │   └── SettingsCard
│   │       ├── SettingsItem (upload, 데이터 내보내기, chevron)
│   │       ├── SettingsItem (download, 데이터 가져오기, chevron)
│   │       └── SettingsItem (eraser, 캐시 삭제, 용량 + chevron)
│   ├── SettingsSection [정보]
│   │   └── SettingsCard
│   │       ├── SettingsItem (scroll-text, 이용약관, chevron)
│   │       ├── SettingsItem (shield, 개인정보처리방침, chevron)
│   │       └── SettingsItem (info, 버전, 버전 텍스트)
│   └── SettingsSection [계정 관리]
│       └── SettingsCard
│           ├── SettingsItem (log-out, 로그아웃, chevron)
│           └── SettingsItem (trash-2, 계정 삭제, danger 스타일, chevron)
├── BubblePrivacySheet (바텀시트)
└── DeleteAccountSheet (바텀시트)
```

---

## 6. 핵심 컴포넌트 상세

### 6-1. `SettingsSection` — `src/presentation/components/settings/settings-section.tsx`

```typescript
interface SettingsSectionProps {
  title: string;
  children: React.ReactNode;
}
```

- 섹션 타이틀: 13px semibold, text-sub, uppercase tracking
- 패딩: `px-4 pt-6 pb-2`

### 6-2. `SettingsCard` — `src/presentation/components/settings/settings-card.tsx`

```typescript
interface SettingsCardProps {
  children: React.ReactNode;
}
```

- `bg-card rounded-xl border border-border`
- 내부 아이템 사이 1px divider

### 6-3. `SettingsItem` — `src/presentation/components/settings/settings-item.tsx`

```typescript
interface SettingsItemProps {
  icon: string;                   // lucide 아이콘명
  label: string;
  hint?: string;                  // 서브텍스트 (11px, text-hint)
  value?: string;                 // 현재값 표시
  onPress?: () => void;
  showChevron?: boolean;
  danger?: boolean;               // 빨간색 스타일 (계정 삭제)
  disabled?: boolean;
  rightElement?: React.ReactNode; // Toggle | NyamSelect | 커스텀
}
```

- 레이아웃: `flex items-center px-3.5 py-3 gap-3`
- 아이콘: 16px, text-sub
- danger 시: text-red, icon 빨간색
- chevron: lucide `chevron-right`, 12px, text-hint

### 6-4. `Toggle` — `src/presentation/components/settings/toggle.tsx`

```typescript
interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}
```

- 크기: `44px × 26px` (터치 타겟 44px)
- ON: `bg-accent-food` (식당 primary)
- OFF: `bg-border`
- 동그라미: 20px, 흰색, transition 0.2s
- disabled: `opacity: 0.5`, pointer-events none

### 6-5. `NyamSelect` — `src/presentation/components/settings/nyam-select.tsx`

```typescript
interface NyamSelectProps {
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
}
```

- 닫힌 상태: 현재 선택값 텍스트 + lucide `chevron-down` (12px)
- 열린 상태: 드롭다운 패널 (bg-elevated, rounded-lg, border, shadow)
- 항목 선택 → 닫힘 + 값 반영
- z-index: 100 (설정 페이지 내)

### 6-6. `SegmentControl` — `src/presentation/components/settings/segment-control.tsx`

```typescript
interface SegmentControlProps {
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
  variant?: 'default' | 'privacy'; // privacy: 색상 차등 (public=green, bubble=blue, private=red)
}
```

- 3단 세그먼트 (또는 2단)
- 선택된 세그먼트: `bg-card`, 나머지: `bg-transparent`
- 컨테이너: `bg-page rounded-lg p-0.5`
- 각 옵션: `py-2 px-3 rounded-md text-center transition-all 0.2s`

### 6-7. `PrivacyLayer` — `src/presentation/components/settings/privacy-layer.tsx`

```typescript
interface PrivacyLayerProps {
  visible: boolean;
  dotColor: string;               // green | blue(accent-social) | yellow(caution)
  title: string;
  note?: string;                  // 하단 노트
  children: React.ReactNode;
}
```

- 애니메이션: `max-height` + `opacity` transition
  - 열림: `max-height: 500px, opacity: 1` (0.35s ease)
  - 닫힘: `max-height: 0, opacity: 0, overflow: hidden` (0.25s ease)
- 헤더: dot (8px 원형) + 제목 (13px semibold)
- 하단 노트: `text-hint, 11px, italic`

### 6-8. `BubblePrivacySheet` — `src/presentation/components/settings/bubble-privacy-sheet.tsx`

```typescript
interface BubblePrivacySheetProps {
  isOpen: boolean;
  onClose: () => void;
  bubble: BubblePrivacyOverride;
  defaultConfig: VisibilityConfig;
  onSave: (override: VisibilityConfig | null) => void;
}
```

- 바텀시트: overlay(0.35) + translateY 슬라이드, max-height 75%
- 라디오 선택: 기본값 사용 / 커스텀 설정
- 커스텀 선택 시: 7개 항목별 Toggle 노출
- 저장 버튼

### 6-9. `DeleteAccountSheet` — `src/presentation/components/settings/delete-account-sheet.tsx`

```typescript
interface DeleteAccountSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (mode: DeleteMode) => void;
}
```

- 타이틀: "계정 삭제"
- 설명: "삭제를 요청하면 30일간 복구 가능합니다. 이후 영구 삭제됩니다."
- 라디오 카드:
  - ○ **기록 익명화** (기본 선택): "닉네임 → '탈퇴한 사용자', 아바타 삭제. 기록은 익명으로 집계에 유지됩니다."
  - ○ **기록 완전 삭제**: "모든 기록, 사진, 버블 공유, 댓글이 삭제됩니다. 복구 불가."
- 안내 info box (4항목):
  - 소속 버블에서 자동 탈퇴
  - 내가 owner인 버블 → 다음 admin에게 이전 (없으면 삭제)
  - 팔로우 관계 삭제
  - 소셜 로그인 연결 해제
- 버튼: `[계정 삭제 요청]` (btn-danger, bg-red)

---

## 7. 프라이버시 상태 요약 텍스트

| privacyProfile | privacyRecords | 텍스트 |
|----------------|---------------|--------|
| `public` | `shared_only` | "모든 사용자가 프로필을 볼 수 있습니다. 버블에 공유한 기록만 해당 버블에서 보입니다." |
| `public` | `all` | "모든 사용자가 프로필을 볼 수 있습니다. 내 모든 기록이 공개됩니다." |
| `bubble_only` | `shared_only` | "같은 버블 멤버만 프로필을 볼 수 있고, 내가 공유한 기록만 해당 버블에서 보입니다." |
| `bubble_only` | `all` | "같은 버블 멤버만 프로필을 볼 수 있고, 내 모든 기록을 볼 수 있습니다." |
| `private` | — | "프로필과 기록이 나에게만 보입니다. 버블 공유도 불가합니다. 추천 알고리즘에는 여전히 반영됩니다." |

---

## 8. 프라이버시 레이어 표시 조건

| 레이어 | 표시 조건 |
|--------|----------|
| 기록 범위 세그먼트 | `privacyProfile !== 'private'` |
| 전체 공개 토글 레이어 | `privacyProfile === 'public'` |
| 버블 기본 토글 레이어 | `privacyProfile !== 'private'` |
| 버블별 설정 레이어 | `privacyProfile !== 'private'` |
| 프라이버시 안내 노트 | 항상 표시 |

---

## 9. 서버 동기화 전략

| 변경 유형 | 동기화 방식 |
|-----------|-----------|
| SegmentControl (프라이버시 핵심) | 즉시 서버 반영 |
| Toggle (가시성, 알림) | optimistic update + debounce(500ms) 후 서버 반영 |
| NyamSelect (환경설정) | optimistic update + debounce(500ms) 후 서버 반영 |
| 실패 시 | 이전 값 롤백 + 에러 토스트 |

---

## 10. 화면 디폴트 옵션 매핑

| 설정 | DB 필드 | 옵션 (value → label) |
|------|---------|---------------------|
| 랜딩 화면 | `pref_landing` | `last`→마지막 사용, `home`→홈, `bubbles`→버블, `profile`→프로필 |
| 홈 시작 탭 | `pref_home_tab` | `last`→마지막 사용, `restaurant`→식당, `wine`→와인 |
| 식당 서브탭 | `pref_restaurant_sub` | `last`→마지막 사용, `visited`→방문, `wishlist`→찜, `recommended`→추천, `following`→팔로잉 |
| 와인 서브탭 | `pref_wine_sub` | `last`→마지막 사용, `tasted`→시음, `wishlist`→찜, `cellar`→셀러 |
| 버블 시작 탭 | `pref_bubble_tab` | `last`→마지막 사용, `bubble`→버블, `bubbler`→버블러 |
| 홈 보기 모드 | `pref_view_mode` | `last`→마지막 사용, `detailed`→상세, `compact`→간단, `calendar`→캘린더 |

---

## 11. 기능 디폴트 옵션 매핑

| 설정 | DB 필드 | 옵션 |
|------|---------|------|
| 기본 정렬 | `pref_default_sort` | `latest`→최신순, `score_high`→점수 높은순, `score_low`→점수 낮은순, `name`→이름순, `visit_count`→방문 많은순 |
| 기록 시 카메라 | `pref_record_input` | `camera`→카메라 우선, `search`→검색 우선 |
| 기록 후 버블 공유 | `pref_bubble_share` | `ask`→매번 물어보기, `auto`→자동 공유, `never`→공유 안 함 |
| 와인 온도 단위 | `pref_temp_unit` | `C`→°C, `F`→°F |

---

## 12. 계정 삭제 플로우

```
[계정 삭제] 항목 클릭
  → DeleteAccountSheet 오픈
  → 삭제 모드 선택 (anonymize | hard_delete)
  → [계정 삭제 요청] 버튼
  → API: requestAccountDeletion(userId, mode)
    → users.deleted_at = NOW()
    → users.delete_mode = mode
    → users.delete_scheduled_at = NOW() + 30일
    → 버블 탈퇴 처리
    → owner 버블 이전
    → 팔로우 삭제
    → 로그아웃
  → 30일 유예 기간 (복구 가능)
  → 크론: 30일 후 영구 삭제 실행
```

---

## 13. 프라이버시 안내 노트 (항상 표시)

1. 동반자 정보는 항상 비공개입니다 (나만 열람)
2. OFF로 설정해도 나에게는 항상 표시됩니다
3. 버블 owner의 공개수위가 더 제한적이면 버블 설정 우선
4. 추천 알고리즘에는 설정과 무관하게 항상 반영됩니다

---

## 14. 상태 관리 요약

| 상태 | 타입 | 초기값 | 용도 |
|------|------|--------|------|
| `privacyBase` | `PrivacyProfile` | DB 로드 | 기본 공개 대상 세그먼트 |
| `recordScope` | `PrivacyRecords` | DB 로드 | 기록 범위 세그먼트 |
| `visibilityPublic` | `VisibilityConfig` | DB 로드 | 전체 공개 토글 7개 |
| `visibilityBubble` | `VisibilityConfig` | DB 로드 | 버블 기본 토글 7개 |
| `activeBubbleSheet` | `string \| null` | `null` | 열린 버블별 시트 ID |
| `deleteSheetOpen` | `boolean` | `false` | 계정 삭제 시트 |
| `deleteMode` | `DeleteMode` | `'anonymize'` | 삭제 모드 선택 |

---

## 15. 파일 체크리스트

| 파일 | 레이어 |
|------|--------|
| `src/domain/entities/settings.ts` | domain |
| `src/domain/repositories/settings-repository.ts` | domain |
| `src/infrastructure/repositories/supabase-settings-repository.ts` | infrastructure |
| `src/application/hooks/use-settings.ts` | application |
| `src/presentation/components/settings/settings-section.tsx` | presentation |
| `src/presentation/components/settings/settings-card.tsx` | presentation |
| `src/presentation/components/settings/settings-item.tsx` | presentation |
| `src/presentation/components/settings/toggle.tsx` | presentation |
| `src/presentation/components/settings/nyam-select.tsx` | presentation |
| `src/presentation/components/settings/segment-control.tsx` | presentation |
| `src/presentation/components/settings/privacy-layer.tsx` | presentation |
| `src/presentation/components/settings/privacy-summary.tsx` | presentation |
| `src/presentation/components/settings/privacy-note.tsx` | presentation |
| `src/presentation/components/settings/bubble-privacy-sheet.tsx` | presentation |
| `src/presentation/components/settings/delete-account-sheet.tsx` | presentation |
| `src/presentation/containers/settings-container.tsx` | presentation |
| `src/app/(main)/settings/page.tsx` | app |
