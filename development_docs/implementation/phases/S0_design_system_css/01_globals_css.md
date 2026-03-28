# T1: globals.css 공통 클래스 정의

> DESIGN_SYSTEM.md §7 "재사용 컴포넌트" 전체를 globals.css에 CSS 클래스로 정의한다.

---

## 현재 globals.css 상태

이미 정의됨:
- `:root` 디자인 토큰 (컬러, 반지름, 그림자, 간격, 게이지, 씬태그)
- `[data-theme="dark"]` 토큰 오버라이드
- `.text-display`, `.text-h1`, `.text-h2`, `.text-body`, `.text-sub`, `.text-caption`
- `.logo-gradient`
- `.wine-slider` (커스텀 슬라이더)
- 애니메이션: `@keyframes dropdown-in`, `slide-up`, `aiPulse`, `wishlist-*`

정의 안 됨 (전부 추가 필요):
- 레이아웃 (헤더, FAB)
- 버튼
- 카드
- 태그 / 뱃지
- 드롭다운 / 셀렉트
- 필터 시스템
- 컴팩트 리스트
- 토글 / 세그먼트
- 인풋
- 바텀 시트
- 알림 드롭다운
- 넛지
- 스텝 프로그레스
- 빈 상태 / 토스트 / 로딩

---

## 추가할 클래스 목록 (DESIGN_SYSTEM.md 기준)

### 1. 레이아웃 — 헤더

```css
/* ── 고정 헤더 ── */
.top-fixed { }
.app-header { }
.header-right { }
.header-brand { }     /* nyam 로고 */
.header-bubbles { }   /* bubbles 텍스트 버튼 */
.icon-btn { }         /* 34x34 원형 아이콘 버튼 (알림 벨 등) */
.notif-badge { }      /* 미읽음 7px dot */
.header-avatar { }    /* 30x30 아바타 원형 */
.avatar-menu { }      /* 아바타 드롭다운 메뉴 */
.avatar-menu-item { } /* 드롭다운 메뉴 항목 */

/* ── 이너 페이지 헤더 ── */
.inner-back-btn { }
.inner-back-btn svg { }
.inner-back-btn span { }
```

**DESIGN_SYSTEM.md 값:**

| 클래스 | 주요 속성 |
|--------|----------|
| `.top-fixed` | `position: absolute; top:0; z-index:90; bg:rgba(248,246,243,0.55); backdrop-filter:blur(20px) saturate(1.5); box-shadow:0 1px 12px rgba(0,0,0,0.08)` |
| `.app-header` | `padding:2px 16px 8px; display:flex; align-items:center; justify-content:space-between` |
| `.header-right` | `display:flex; gap:6px; align-items:center` |
| `.header-brand` | `font-family:Comfortaa; font-size:22px; font-weight:700; letter-spacing:-0.5px; gradient` |
| `.header-bubbles` | `font-family:Comfortaa; font-size:13px; font-weight:700; color:var(--brand)` |
| `.icon-btn` | `width:34px; height:34px; border-radius:50%; display:flex; align-items:center; justify-content:center; position:relative` |
| `.notif-badge` | `position:absolute; top:2px; right:2px; width:7px; height:7px; border-radius:50%; background:var(--brand); border:1.5px solid var(--bg)` |
| `.header-avatar` | `width:30px; height:30px; border-radius:50%; overflow:hidden; font-size:12px; font-weight:700; color:#fff; background:var(--accent-food)` |
| `.avatar-menu` | `position:absolute; top:calc(100%+8px); right:0; min-width:120px; bg:var(--bg-elevated); border-radius:var(--r-md); border:1px solid var(--border); box-shadow:0 8px 28px rgba(0,0,0,0.12); z-index:90; padding:4px` |
| `.avatar-menu-item` | `display:flex; gap:8px; padding:10px 12px; font-size:13px; font-weight:500; border-radius:var(--r-sm); color:var(--text); hover→bg:var(--bg)` |
| `.inner-back-btn` | `display:flex; align-items:center; gap:2px; background:none; border:none; padding:4px 0; color:var(--text); active→opacity:0.6` |

다크모드:
```css
[data-theme="dark"] .top-fixed {
  background: rgba(30,28,26,0.88);
  backdrop-filter: blur(20px) saturate(1.2);
  box-shadow: 0 1px 12px rgba(0,0,0,0.25);
}
```

---

### 2. FAB (Floating Action Buttons)

```css
.fab-back { }
.fab-forward { }
.fab-forward.wine { }
.fab-add { }
```

| 클래스 | 주요 속성 |
|--------|----------|
| `.fab-back` | `position:fixed; bottom:28px; left:16px; z-index:85; 44x44; border-radius:50%; bg:rgba(248,246,243,0.88); backdrop-filter:blur(12px); border:1px solid var(--border); box-shadow:0 2px 12px rgba(0,0,0,0.12); active→scale(0.9)` |
| `.fab-add` | `.fab-back`과 동일 스타일, `right:16px` (left 대신) |
| `.fab-forward` | `bottom:28px; right:16px; 44x44; bg:var(--accent-food); box-shadow:0 3px 16px rgba(193,123,94,0.4); color:#fff; active→scale(0.9)` |
| `.fab-forward.wine` | `bg:var(--accent-wine); box-shadow:0 3px 16px rgba(139,115,150,0.4)` |

다크모드:
```css
[data-theme="dark"] .fab-back,
[data-theme="dark"] .fab-add {
  background: rgba(42,39,37,0.92);
  border-color: var(--border-bold);
}
```

---

### 3. 버튼

```css
.btn-primary { }       /* CTA 필 */
.btn-primary.wine { }
.btn-primary:disabled { }
.btn-ghost { }         /* ← 돌아가기 */
.btn-skip { }          /* 건너뛰기 (밑줄) */
.btn-card-action { }   /* 카드 내 액션 */
.btn-card-action.active-food { }
.btn-card-action.active-wine { }
.btn-card-action.active-wish { }
.btn-search-submit { } /* 검색 제출 */
.btn-social { }        /* 소셜 로그인 공통 */
.btn-social.kakao { }
.btn-social.google { }
.btn-social.naver { }
.btn-social.apple { }
```

| 클래스 | 주요 속성 |
|--------|----------|
| `.btn-primary` | `pill; bg:var(--accent-food); color:#fff; font-weight:600` |
| `.btn-primary.wine` | `bg:var(--accent-wine)` |
| `.btn-primary:disabled` | `bg:var(--border); color:var(--text-hint)` |
| `.btn-ghost` | `pill; bg:var(--bg); border:1px solid var(--border); color:var(--text)` |
| `.btn-skip` | `text-decoration:underline; color:var(--text-hint)` |
| `.btn-card-action` | `display:flex; border-radius:var(--r-sm); border:1px solid var(--border); color:var(--text-sub)` |
| `.btn-card-action.active-food` | `bg:var(--accent-food); color:#fff; border-color:var(--accent-food)` |
| `.btn-card-action.active-wine` | `bg:var(--accent-wine); color:#fff` |
| `.btn-card-action.active-wish` | `bg:var(--caution); color:#fff` |
| `.btn-social.kakao` | `bg:#FEE500; color:#3C1E1E` |
| `.btn-social.google` | `bg:var(--bg-elevated); color:var(--text); border:1px solid var(--border)` |
| `.btn-social.naver` | `bg:#03C75A; color:#fff` |
| `.btn-social.apple` | `bg:#1D1D1F; color:#fff` |

---

### 4. 카드

```css
.card { }
.card.visited { }    /* 식당 방문 */
.card.confirmed { }  /* 와인 확인 */
.card.wishlisted { } /* 찜 */
.card-top { }
.card-actions { }
.card-gauge { }
```

| 클래스 | 주요 속성 |
|--------|----------|
| `.card` | `border:1px solid var(--border); bg:var(--bg-card); border-radius:var(--r-lg)` |
| `.card.visited` | `border-color:var(--accent-food-dim); bg:var(--accent-food-light)` |
| `.card.confirmed` | `border-color:var(--accent-wine-dim); bg:var(--accent-wine-light)` |
| `.card.wishlisted` | `border-color:var(--caution); bg:#FBF8F1` |

다크모드 카드 상태:
```css
[data-theme="dark"] .card.visited { background:var(--accent-food-light); border-color:#5A4030; }
[data-theme="dark"] .card.confirmed { background:var(--accent-wine-light); border-color:#4A3555; }
[data-theme="dark"] .card.wishlisted { background:#2E2A1E; border-color:#5A4A2A; }
```

---

### 5. 만족도 게이지

```css
.satisfaction-gauge { }
.satisfaction-gauge-fill { }
.satisfaction-gauge-label { }
.satisfaction-gauge-hint { }
```

| 클래스 | 주요 속성 |
|--------|----------|
| `.satisfaction-gauge` | `height:32px; border-radius:var(--r-full); bg:var(--bg); border:1px solid var(--border)` |
| `.satisfaction-gauge-label` | `font-size:14px; font-weight:700; color:#fff; text-shadow:0 1px 2px rgba(0,0,0,0.15)` |
| `.satisfaction-gauge-hint` | `font-size:10px; color:var(--text-hint)` |

---

### 6. 태그 / 뱃지 / 칩

```css
/* 범용 태그 */
.tag { }
.tag.food { }
.tag.wine { }

/* 씬 태그 */
.scene-tag { }
.tag-chip { }           /* 타임라인 인라인 */

/* 와인 칩 */
.wine-chip { }
.wine-chip.red { }
.wine-chip.white { }
.wine-chip.rose { }
.wine-chip.orange { }
.wine-chip.sparkling { }
.wine-chip.fortified { }
.wine-chip.dessert { }

/* 외부 평가 뱃지 */
.badge { }
.badge.michelin { }
.badge.blue-ribbon { }
.badge.tv { }
.badge.wine-class { }
.badge.vivino { }
.badge.wine-spectator { }
```

**태그 값:**

| 클래스 | 주요 속성 |
|--------|----------|
| `.tag` | `inline-flex; gap:3px; font-size:11px; font-weight:500; padding:3px 8px; border-radius:var(--r-xs); bg:var(--bg); color:var(--text-sub); border:1px solid var(--border)` |
| `.tag.food` | `bg:var(--accent-food-light); color:var(--accent-food); border-color:var(--accent-food-dim)` |
| `.tag.wine` | `bg:var(--accent-wine-light); color:var(--accent-wine); border-color:var(--accent-wine-dim)` |
| `.scene-tag` | `font-size:11px; font-weight:600; border-radius:var(--r-xs); color:#fff; bg:해당 씬 컬러` |
| `.tag-chip` | `font-size:10px; font-weight:600; border-radius:20px; padding:2px 8px; color:#fff` |
| `.badge` | `inline-flex; gap:3px; font-size:10px; font-weight:600; padding:3px 9px; border-radius:20px` |

**와인 칩 값:**

| 변형 | bg | text | border |
|------|-----|------|--------|
| `.wine-chip.red` | `#FAF0F0` | `#B87272` | `var(--border)` |
| `.wine-chip.white` | `#FBF8F1` | `#C9A96E` | `var(--border)` |
| `.wine-chip.rose` | `#F8F0F4` | `#B8879B` | `var(--border)` |
| `.wine-chip.orange` | `#F5F0EA` | `#B8A078` | `var(--border)` |
| `.wine-chip.sparkling` | `#EDF2F5` | `#7A9BAE` | `var(--border)` |
| `.wine-chip.fortified` | `#F5F0F0` | `#8B6B5E` | `#DDD0C8` |
| `.wine-chip.dessert` | `#FDF8F0` | `#C9A96E` | `#E8E0C8` |

**뱃지 값:**

| 변형 | bg | text | border | icon |
|------|-----|------|--------|------|
| `.badge.michelin` | `#FDF6EC` | `#B8860B` | `#E8DDCA` | `star` 10px |
| `.badge.blue-ribbon` | `#EDF2FB` | `#4A6FA5` | `#D0DCF0` | `award` 10px |
| `.badge.tv` | `#FFF3F0` | `var(--brand)` | `#F0D8D0` | `tv` 10px |
| `.badge.wine-class` | `var(--accent-wine-light)` | `var(--accent-wine)` | `#DDD6E3` | `award` 10px |
| `.badge.vivino` | `#FBF0F0` | `#9B2335` | `#E8D0D0` | `grape` 10px |
| `.badge.wine-spectator` | `#F5F0E8` | `#8B7355` | `#E0D8C8` | `trophy` 10px |

---

### 7. 필터 시스템

```css
/* 필터/소트/검색 아이콘 버튼 */
.icon-button { }
.icon-button.active { }

/* 필터 패널 */
.ds-filter-drawer { }

/* 필터 칩 */
.filter-chip { }
.filter-chip.active { }

/* 소트 드롭다운 */
.ds-sort-dropdown { }

/* 검색 드롭다운 */
.ds-search-dropdown { }
```

| 클래스 | 주요 속성 |
|--------|----------|
| `.icon-button` | `width:32px; height:32px; bg:none; border:none; color:var(--text-hint)` |
| `.icon-button.active` | `color:var(--accent-food)` |
| `.ds-filter-drawer` | `max-height animation 0→260px` |
| `.filter-chip` | `pill; border:1px solid var(--border); bg:var(--bg); font-size:11px; font-weight:600; color:var(--text-sub)` |
| `.filter-chip.active` | `bg:var(--accent-food); border-color:var(--accent-food); color:#fff` |
| `.ds-sort-dropdown` | `position:absolute; right:0; border-radius:var(--r-md); box-shadow:0 8px 28px rgba(0,0,0,0.12)` |
| `.ds-search-dropdown` | `position:absolute; right:0; width:50%; border-radius:var(--r-md); box-shadow:0 8px 28px` |

---

### 8. 드롭다운 셀렉트 (범용)

```css
.nyam-select-wrap { }
.nyam-select { }
.nyam-select.open { }
.nyam-select-value { }
.nyam-select-arrow { }
.nyam-dropdown { }
.nyam-dropdown-item { }
.nyam-dropdown-item.selected { }
.nyam-dropdown-divider { }

/* 변형 */
.nyam-select.wine { }
.nyam-select.inline { }
.nyam-dropdown-item .item-desc { }
```

| 클래스 | 주요 속성 |
|--------|----------|
| `.nyam-select` | `padding:7px 12px; border-radius:10px; border:1px solid var(--border); bg:var(--bg-card); font-size:13px; font-weight:500; color:var(--text)` |
| `.nyam-select-arrow` | `width:16px; height:16px; color:var(--text-hint); open→rotate(180deg)` |
| `.nyam-dropdown` | `bg:var(--bg-elevated); border-radius:var(--r-md); box-shadow:0 8px 28px rgba(0,0,0,0.12); padding:4px` |
| `.nyam-dropdown-item` | `padding:9px 12px; border-radius:var(--r-sm); font-size:13px; hover→bg:var(--bg)` |
| `.nyam-dropdown-item.selected` | `color:accent; font-weight:600` |
| `.nyam-dropdown-divider` | `height:1px; bg:var(--border); margin:2px 0` |
| `.nyam-select.inline` | `font-size:12px; border-radius:var(--r-sm); bg:var(--bg)` |

다크모드:
```css
[data-theme="dark"] .nyam-dropdown,
[data-theme="dark"] .avatar-menu,
[data-theme="dark"] .ds-sort-dropdown,
[data-theme="dark"] .ds-search-dropdown {
  background: var(--bg-elevated);
  border-color: var(--border-bold);
  box-shadow: 0 8px 28px rgba(0,0,0,0.4);
}
```

---

### 9. 필터 탭 (언더라인)

```css
.filter-tab { }
.filter-tab.active { }
.filter-tab.active.food { }
.filter-tab.active.wine { }
```

| 클래스 | 주요 속성 |
|--------|----------|
| `.filter-tab` | `font-size:13px; font-weight:500; color:var(--text-hint); border-bottom:2px solid transparent` |
| `.filter-tab.active` | `font-weight:700; border-bottom-color:accent` |
| `.filter-tab.active.food` | `color:var(--accent-food); border-color:var(--accent-food)` |
| `.filter-tab.active.wine` | `color:var(--accent-wine); border-color:var(--accent-wine)` |

---

### 10. 뷰 사이클 버튼

```css
.view-cycle-btn { }
.view-cycle-btn.active { }
```

| 클래스 | 주요 속성 |
|--------|----------|
| `.view-cycle-btn` | `width:34px; height:34px; border-radius:var(--r-sm); bg:none; color:var(--text-sub)` |
| `.view-cycle-btn.active` | `bg:var(--bg-page)` |

---

### 11. 컴팩트 리스트

```css
.compact-item { }
.compact-rank { }
.compact-rank.top { }       /* 1~3위 */
.compact-thumb { }
.compact-thumb.wine { }
.compact-name { }
.compact-meta { }
.compact-score { }
.compact-score.food { }
.compact-score.wine { }
.compact-score.unrated { }
```

| 클래스 | 주요 속성 |
|--------|----------|
| `.compact-item` | `display:flex; align-items:center; gap:10px; padding:10px 0; border-bottom:1px solid var(--border)` |
| `.compact-item:last-child` | `border-bottom:none` |
| `.compact-rank` | `font-size:13px; font-weight:700; width:18px; text-align:center; color:var(--text-hint)` |
| `.compact-rank.top` | `color:accent` |
| `.compact-thumb` | `width:40px; height:40px; border-radius:10px; flex-shrink:0` |
| `.compact-name` | `font-size:14px; font-weight:600; color:var(--text); text-overflow:ellipsis; overflow:hidden; white-space:nowrap` |
| `.compact-meta` | `font-size:11px; color:var(--text-hint)` |
| `.compact-score` | `font-size:18px; font-weight:800; min-width:32px; text-align:right` |
| `.compact-score.food` | `color:var(--accent-food)` |
| `.compact-score.wine` | `color:var(--accent-wine)` |
| `.compact-score.unrated` | `font-size:14px; font-weight:600; color:var(--text-hint)` |

---

### 12. 토글 / 세그먼트 / 인풋

```css
/* 토글 스위치 */
.toggle { }
.toggle.on { }
.toggle::after { }
.toggle.on::after { }

/* 세그먼트 컨트롤 */
.prv-segment { }
.prv-segment-btn { }
.prv-segment-btn.active { }

/* 인풋 */
.nyam-input { }
.nyam-input:focus { }
```

| 클래스 | 주요 속성 |
|--------|----------|
| `.toggle` | `width:44px; height:26px; border-radius:13px; bg:var(--border-bold); position:relative` |
| `.toggle.on` | `bg:var(--accent-food)` |
| `.toggle::after` | `22x22 circle; bg:#fff; shadow; left:2px` |
| `.toggle.on::after` | `left:20px` |
| `.prv-segment` | `display:flex; gap:4px; bg:var(--bg-page); border-radius:10px; padding:3px` |
| `.prv-segment-btn` | `flex:1; padding:8px 4px; border-radius:var(--r-sm); font-size:13px; font-weight:500; bg:transparent; color:var(--text-sub)` |
| `.prv-segment-btn.active` | `bg:var(--bg-elevated); color:var(--text); font-weight:600; box-shadow:0 1px 4px rgba(0,0,0,0.08)` |
| `.nyam-input` | `border-radius:var(--r-md); border:1px solid var(--border); bg:var(--bg); font-size:14px` |
| `.nyam-input:focus` | `border-color:var(--border-bold)` |

---

### 13. 바텀 시트

```css
.bottom-sheet-overlay { }
.bottom-sheet { }
.bottom-sheet-handle { }
```

| 클래스 | 주요 속성 |
|--------|----------|
| `.bottom-sheet-overlay` | `bg:rgba(0,0,0,0.35); z-index:20` |
| `.bottom-sheet` | `bg:var(--bg-elevated); border-radius:var(--r-xl) var(--r-xl) 0 0; box-shadow:var(--shadow-sheet); z-index:30; max-height:75%; overflow-y:auto` |
| `.bottom-sheet-handle` | `width:36px; height:4px; border-radius:2px; bg:var(--border-bold); margin:10px auto 6px` |

애니메이션: `translateY(100%)→translateY(0)`, `0.3s cubic-bezier(0.32,0.72,0,1)`

---

### 14. 알림 드롭다운

```css
.notif-dropdown-overlay { }
.notif-dropdown { }
.notif-header { }
.notif-item { }
.notif-item.unread { }
.notif-icon { }
.notif-icon.type-level { }
.notif-icon.type-bubble { }
.notif-icon.type-social { }
.notif-icon.type-success { }
.notif-action-accept { }
.notif-action-reject { }
.notif-footer { }
```

| 클래스 | 주요 속성 |
|--------|----------|
| `.notif-dropdown-overlay` | `bg:rgba(0,0,0,0.15); backdrop-filter:blur(4px); z-index:190` |
| `.notif-dropdown` | `position:absolute; top:90px; right:16px; width:300px; max-height:400px; bg:var(--bg-elevated); border-radius:14px; box-shadow:0 6px 24px rgba(0,0,0,0.1); z-index:200` |
| `.notif-item` | `display:flex; gap:10px; padding:11px 14px` |
| `.notif-item.unread` title | `font-weight:600` (default 500) |
| `.notif-icon.type-level` | `color:var(--caution)` |
| `.notif-icon.type-bubble` | `color:var(--accent-food)` |
| `.notif-icon.type-social` | `color:var(--accent-social)` |
| `.notif-icon.type-success` | `color:var(--positive)` |

애니메이션: `scale(0.94) translateY(-6px)→scale(1) translateY(0)`, `0.16s`

다크모드:
```css
[data-theme="dark"] .notif-dropdown {
  background: var(--bg-elevated);
  border-color: var(--border-bold);
  box-shadow: 0 6px 24px rgba(0,0,0,0.4);
}
```

---

### 15. 넛지

```css
.nudge-card { }
.nudge-strip { }
```

| 클래스 | 주요 속성 |
|--------|----------|
| `.nudge-card` | `margin:14px 16px 0; padding:12px 14px; border-radius:14px; bg:var(--bg-card); border:1px solid var(--border); display:flex; gap:12px; align-items:center` |
| `.nudge-strip` | `padding:10px 16px; bg:var(--accent-food-light); max-height:60px` |

---

### 16. 스텝 프로그레스

```css
.step-progress { }
.step-bar { }
.step-bar.complete { }
.step-bar.current { }
```

| 클래스 | 주요 속성 |
|--------|----------|
| `.step-progress` | `display:flex; gap:6px` |
| `.step-bar` | `flex:1; height:3px; border-radius:2px; bg:var(--border)` |
| `.step-bar.current` | `bg:var(--accent-food)` |
| `.step-bar.complete` | `bg:var(--accent-food); opacity:0.45` |

---

### 17. 선택 카드 (온보딩)

```css
.intro-card { }
.intro-card.selected { }
.intro-card-check { }
```

| 클래스 | 주요 속성 |
|--------|----------|
| `.intro-card` | `border-radius:var(--r-lg); border:1.5px solid var(--border); bg:var(--bg-card)` |
| `.intro-card.selected` | `border-color:accent; bg:accent-light` |
| `.intro-card-check` | `22x22; border-radius:var(--r-xs); selected→accent bg + white check` |

---

### 18. 빈 상태 / 토스트 / 로딩

```css
.empty-state { }
.empty-state-icon { }
.empty-state-title { }
.empty-state-desc { }

.toast { }

.loading-state { }
```

| 클래스 | 주요 속성 |
|--------|----------|
| `.empty-state` | `text-align:center` |
| `.empty-state-icon` | `28px; color:var(--text-hint)` |
| `.empty-state-title` | `font-size:14px; font-weight:600; color:var(--text-sub)` |
| `.empty-state-desc` | `font-size:12px; color:var(--text-hint)` |
| `.toast` | `bg:var(--text); color:var(--bg); border-radius:var(--r-md); font-size:13px; font-weight:600; bottom:100px; center` |
| `.loading-state` | `lucide search icon; pulse; font-size:13px; color:var(--text-sub)` |

---

## 구현 순서

1. 레이아웃 (헤더 + FAB) — 모든 페이지 공통
2. 버튼 — 모든 페이지에서 사용
3. 카드 + 게이지 — 홈, 상세, 프로필
4. 태그 / 뱃지 / 칩 — 상세, 기록, 홈
5. 드롭다운 / 셀렉트 — 홈 필터, 설정
6. 필터 시스템 — 홈
7. 컴팩트 리스트 — 홈 컴팩트 뷰
8. 토글 / 세그먼트 / 인풋 — 설정
9. 바텀 시트 — 전역
10. 알림 드롭다운 — 전역
11. 넛지 — 홈
12. 스텝 프로그레스 / 선택카드 — 온보딩
13. 빈 상태 / 토스트 / 로딩 — 전역

---

## 검증

```
□ DESIGN_SYSTEM.md의 모든 클래스가 globals.css에 정의됨
□ 다크모드 오버라이드 누락 없음
□ 토큰 변수(--r-*, --shadow-*) 사용 — 하드코딩 없음
□ prototype/*.html의 클래스명과 일치
□ pnpm build 에러 없음
```
