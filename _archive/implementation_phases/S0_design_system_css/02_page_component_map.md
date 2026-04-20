# T2: 페이지별 컴포넌트-클래스 매핑

> 각 페이지에서 사용되는 공통 UI 클래스를 명시하고, 마이그레이션 대상 컴포넌트를 특정한다.

---

## 범례

- **클래스**: globals.css에 정의할 공통 클래스
- **컴포넌트**: 해당 클래스를 적용할 TSX 파일
- **작업**: 인라인 스타일 → 클래스 교체 내용

---

## 전역 (모든 페이지)

모든 페이지에 공통 적용되는 클래스와 컴포넌트.

| 클래스 | 컴포넌트 파일 | 작업 |
|--------|-------------|------|
| `.top-fixed` | `layout/app-header.tsx` | `style={{ bg, backdropFilter, boxShadow }}` → `className="top-fixed"` |
| `.app-header` | `layout/app-header.tsx` | padding, flex 인라인 → 클래스 |
| `.header-brand` | `layout/app-header.tsx` | 로고 인라인 스타일 전체 → 클래스 |
| `.header-bubbles` | `layout/app-header.tsx` | bubbles 버튼 인라인 → 클래스 |
| `.icon-btn` | `layout/app-header.tsx`, `layout/notification-bell.tsx` | 34x34 원형 버튼 인라인 → 클래스 |
| `.notif-badge` | `notification/unread-badge.tsx` | 뱃지 인라인 → 클래스 |
| `.header-avatar` | `layout/avatar-dropdown.tsx` | 아바타 원형 인라인 → 클래스 |
| `.avatar-menu` | `layout/avatar-dropdown.tsx` | 드롭다운 컨테이너 인라인 → 클래스 |
| `.avatar-menu-item` | `layout/avatar-dropdown.tsx` | 메뉴 항목 인라인 → 클래스 |
| `.inner-back-btn` | `layout/app-header.tsx` | inner variant back 영역 |
| `.fab-back` | `layout/fab-back.tsx` | 전체 인라인 스타일 → 클래스 |
| `.fab-add` | `layout/fab-add.tsx` | 전체 인라인 스타일 → 클래스 |
| `.fab-forward` | `layout/fab-forward.tsx` | 전체 인라인 스타일 → 클래스 |
| `.notif-dropdown` | `notification/notification-dropdown.tsx` | 드롭다운 패널 인라인 → 클래스 |
| `.notif-item` | `notification/notification-item.tsx` | 알림 항목 인라인 → 클래스 |
| `.bottom-sheet` | 바텀시트 사용 컴포넌트 전체 | 공통 스타일 |
| `.toast` | 토스트 표시 컴포넌트 | 공통 스타일 |
| `.empty-state` | 빈 상태 표시 컴포넌트 전체 | 공통 스타일 |

**마이그레이션 파일 수**: ~12개

---

## 페이지별 매핑

### 1. 홈 (`/`) — `src/app/(main)/page.tsx`

컨테이너: `src/presentation/containers/home-container.tsx`

| 클래스 | 컴포넌트 파일 | 비고 |
|--------|-------------|------|
| `.filter-tab` | 홈 탭 (식당/와인) | 언더라인 탭 |
| `.filter-tab.active.food` | 식당 탭 활성 | |
| `.filter-tab.active.wine` | 와인 탭 활성 | |
| `.icon-button` | `home/` 필터/소트/검색 버튼 | 32x32 |
| `.ds-filter-drawer` | 필터 패널 | Notion 스타일 |
| `.filter-chip` | 필터 칩 바 | 수평 스크롤 |
| `.ds-sort-dropdown` | `home/sort-dropdown.tsx` | 정렬 드롭다운 |
| `.ds-search-dropdown` | `home/search-dropdown.tsx` | 검색 드롭다운 |
| `.nyam-select` | 필터 내 셀렉트 | 범용 셀렉트 |
| `.nyam-dropdown` | 필터/셀렉트 드롭다운 | 범용 드롭다운 |
| `.view-cycle-btn` | 뷰 모드 전환 버튼 | 상세/컴팩트/캘린더 |
| `.card` | 카드 뷰 항목 | 상세 뷰 |
| `.card.visited` / `.wishlisted` | 카드 상태 | |
| `.card-actions` | 카드 하단 버튼 | |
| `.btn-card-action` | 카드 액션 버튼 | 방문/찜/매칭 |
| `.satisfaction-gauge` | 카드 게이지 | 평가 후 표시 |
| `.compact-item` | `home/` 컴팩트 리스트 | 컴팩트 뷰 |
| `.tag` | 카드/리스트 내 태그 | |
| `.nudge-card` | 넛지 카드 | |
| `.nudge-strip` | 넛지 스트립 | |

**마이그레이션 파일 수**: ~15개

---

### 2. 식당 상세 (`/restaurants/[id]`) — `02_detail_restaurant`

| 클래스 | 컴포넌트 파일 | 비고 |
|--------|-------------|------|
| `.badge` | `detail/badge-row.tsx` | 미슐랭/블루리본/TV |
| `.badge.michelin` / `.blue-ribbon` / `.tv` | 뱃지 변형 | |
| `.tag` | 메타 태그 | 장르, 지역 |
| `.scene-tag` | 씬 태그 | |
| `.btn-card-action` | 방문/찜 버튼 | |
| `.satisfaction-gauge` | 만족도 게이지 | |
| `.compact-item` | 연관 항목 리스트 | |
| `.fab-back` | 좌하단 뒤로가기 | 히어로 이미지 위 |

**마이그레이션 파일 수**: ~8개

---

### 3. 와인 상세 (`/wines/[id]`) — `02_detail_wine`

| 클래스 | 컴포넌트 파일 | 비고 |
|--------|-------------|------|
| `.badge` | `detail/badge-row.tsx` | 와인클래스/비비노/WS |
| `.badge.wine-class` / `.vivino` / `.wine-spectator` | 뱃지 변형 | |
| `.wine-chip` | `detail/wine-type-chip.tsx` | 레드/화이트/... |
| `.tag.wine` | 와인 태그 | |
| `.scene-tag` | 씬 태그 | |
| `.satisfaction-gauge` | 만족도 게이지 | |
| `.fab-back` | 좌하단 뒤로가기 | |

**마이그레이션 파일 수**: ~7개

---

### 4. 기록 상세 (`/records/[id]`) — `04_record_detail`

| 클래스 | 컴포넌트 파일 | 비고 |
|--------|-------------|------|
| `.tag` / `.tag.food` / `.tag.wine` | 기록 태그 | |
| `.scene-tag` | 씬 태그 | |
| `.wine-chip` | 와인 타입 표시 | |
| `.badge` | 외부 평가 | |

**마이그레이션 파일 수**: ~4개

---

### 5. 기록 플로우 (`/record`) — `05_record_flow`

| 클래스 | 컴포넌트 파일 | 비고 |
|--------|-------------|------|
| `.fab-forward` | 다음 단계 FAB | |
| `.fab-back` | 이전 단계 FAB | |
| `.satisfaction-gauge` | `record/satisfaction-gauge.tsx` | 만족도 입력 |
| `.scene-tag` | `record/scene-tag-selector.tsx` | 씬 선택 |
| `.btn-primary` | 저장 버튼 | |
| `.nyam-input` | 텍스트 입력 | |
| `.step-progress` | 기록 단계 표시 | |

**마이그레이션 파일 수**: ~10개

---

### 6. 검색/등록 (`/search`, `/register`) — `01_search_register`

| 클래스 | 컴포넌트 파일 | 비고 |
|--------|-------------|------|
| `.btn-primary` | 검색/등록 버튼 | |
| `.btn-search-submit` | `search/search-bar.tsx` | |
| `.nyam-input` | 검색/등록 입력 | |
| `.card` | 검색 결과 카드 | |
| `.tag` | 결과 태그 | |

**마이그레이션 파일 수**: ~6개

---

### 7. Discover (`/discover`) — `07_discover`

| 클래스 | 컴포넌트 파일 | 비고 |
|--------|-------------|------|
| `.filter-chip` | 지역 칩 | |
| `.card` | 식당 카드 | |
| `.tag` | 메타 태그 | |

**마이그레이션 파일 수**: ~3개

---

### 8. 버블 (`/bubbles`, `/bubbles/[id]`) — `08_bubble`

| 클래스 | 컴포넌트 파일 | 비고 |
|--------|-------------|------|
| `.filter-tab` | 버블/버블러 탭 | |
| `.icon-button` | 필터/소트 | |
| `.filter-chip` | 버블 필터 칩 | |
| `.nyam-select` | 필터 셀렉트 | |
| `.card` | 버블 카드, 공유 기록 카드 | |
| `.compact-item` | 멤버 랭킹 리스트 | |
| `.btn-primary` | 가입/초대 버튼 | |
| `.tag` | 버블 태그 | |
| `.view-cycle-btn` | 뷰 모드 전환 | |

**마이그레이션 파일 수**: ~8개

---

### 9. 버블러 프로필 (`/bubbles/[id]/members/[userId]`)

| 클래스 | 컴포넌트 파일 | 비고 |
|--------|-------------|------|
| `.tag` | 취향 태그 | |
| `.compact-item` | 최근 기록 리스트 | |
| `.card` | 활동/맥락 카드 | |

**마이그레이션 파일 수**: ~6개

---

### 10. 프로필 (`/profile`, `/profile/wrapped`) — `10_profile`

| 클래스 | 컴포넌트 파일 | 비고 |
|--------|-------------|------|
| `.card` | 레벨 카드, 통계 카드 | |
| `.tag` | 취향 태그 | |
| `.compact-item` | XP 리스트 | |
| `.btn-primary` | 공유 버튼 | |
| `.bottom-sheet` | 레벨 상세 시트 | |

**마이그레이션 파일 수**: ~8개

---

### 11. 설정 (`/settings`) — `11_settings`

| 클래스 | 컴포넌트 파일 | 비고 |
|--------|-------------|------|
| `.toggle` | `settings/toggle.tsx` | ON/OFF 스위치 |
| `.prv-segment` | `settings/privacy-*.tsx` | 프라이버시 세그먼트 |
| `.nyam-select.inline` | 설정 드롭다운 | 컴팩트 셀렉트 |
| `.nyam-dropdown` | 셀렉트 드롭다운 | |
| `.btn-primary` | 저장 버튼 | |
| `.nyam-input` | 설정 입력 | |
| `.bottom-sheet` | 버블 프라이버시/계정 삭제 | |

**마이그레이션 파일 수**: ~8개

---

### 12. 알림 (헤더 드롭다운) — `09_notifications`

| 클래스 | 컴포넌트 파일 | 비고 |
|--------|-------------|------|
| `.notif-dropdown` | `notification/notification-dropdown.tsx` | 알림 패널 |
| `.notif-dropdown-overlay` | 오버레이 | |
| `.notif-item` | `notification/notification-item.tsx` | 알림 항목 |
| `.notif-icon.type-*` | 타입별 아이콘 | |
| `.notif-action-accept` / `.reject` | 수락/거절 버튼 | |
| `.empty-state` | `notification/notification-empty.tsx` | 빈 상태 |

**마이그레이션 파일 수**: ~4개

---

### 13. 온보딩 (`/onboarding`) — `12_onboarding`

| 클래스 | 컴포넌트 파일 | 비고 |
|--------|-------------|------|
| `.step-progress` | `onboarding/onboarding-progress.tsx` | 진행 바 |
| `.fab-forward` | 다음 단계 | |
| `.fab-back` | 이전 단계 | |
| `.btn-primary` | CTA 버튼 | |
| `.btn-skip` | 건너뛰기 | |
| `.intro-card` | 선택 카드 | |
| `.nyam-input` | 입력 필드 | |

**마이그레이션 파일 수**: ~8개

---

### 14. 로그인 (`/auth/login`)

| 클래스 | 컴포넌트 파일 | 비고 |
|--------|-------------|------|
| `.btn-social` | `auth/login-buttons.tsx` | 소셜 로그인 버튼 |
| `.btn-social.kakao` / `.google` / `.naver` / `.apple` | 플랫폼별 스타일 | |

**마이그레이션 파일 수**: ~1개

---

## 마이그레이션 요약

| 영역 | 파일 수 | 우선순위 |
|------|---------|---------|
| 전역 (헤더/FAB/알림/시트) | ~12 | **1순위** — 모든 페이지 기반 |
| 홈 | ~15 | **2순위** — 가장 많은 클래스 사용 |
| 기록 플로우 | ~10 | **3순위** — 핵심 플로우 |
| 식당/와인 상세 | ~15 | **4순위** |
| 버블 | ~14 | **5순위** |
| 설정 | ~8 | **6순위** |
| 프로필 | ~8 | **7순위** |
| 온보딩 | ~8 | **8순위** |
| 검색/등록 | ~6 | **9순위** |
| Discover | ~3 | **10순위** |
| 로그인 | ~1 | **11순위** |
| **합계** | **~100** | |

---

## 마이그레이션 패턴

### Before (현재)

```tsx
<button
  style={{
    bottom: '28px',
    left: '16px',
    width: '44px',
    height: '44px',
    backgroundColor: 'rgba(248,246,243,0.88)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    border: '1px solid var(--border)',
    boxShadow: '0 2px 12px rgba(0,0,0,0.12)',
  }}
>
```

### After (마이그레이션 후)

```tsx
<button className="fab-back">
```

### 규칙

1. 인라인 `style={{}}` 제거 → `className="공통클래스"` 교체
2. 동적 값(accent 분기, 점수 기반 색상)만 인라인 유지
3. Tailwind 유틸리티(`flex`, `items-center` 등)는 공통 클래스에 포함되므로 중복 제거
4. `dark:` Tailwind 접두사 대신 `[data-theme="dark"]` CSS 셀렉터 사용 (globals.css에서 일괄 관리)

---

## 검증

```
□ 각 페이지의 모든 공통 요소가 클래스 기반으로 전환됨
□ 인라인 스타일은 동적 값만 남음
□ 다크모드 정상 동작
□ 360px 레이아웃 깨짐 없음
□ 프로토타입 HTML과 비주얼 일치
□ pnpm build 에러 없음
□ pnpm lint 경고 0개
```
