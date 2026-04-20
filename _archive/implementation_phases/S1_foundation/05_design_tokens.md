# 1.5: 디자인 토큰 + Tailwind 설정

> DESIGN_SYSTEM.md의 모든 토큰을 CSS 변수 + Tailwind 설정으로 구현한다.

## SSOT 출처

| 문서 | 참조 섹션 |
|------|----------|
| `systems/DESIGN_SYSTEM.md` | §0 브랜드, §1 컬러, §2 타이포그래피, §4 라운딩, §5 그림자, §6 스페이싱, §9 레벨 컬러, §10 다크모드 |

## 선행 조건

- [ ] 1.1 프로젝트 초기화 완료 (Next.js + TypeScript + Tailwind)

## 구현 범위

### 생성할 파일 목록

| 파일 경로 | 역할 |
|----------|------|
| `src/app/globals.css` | CSS 커스텀 프로퍼티 (라이트+다크), Tailwind directives, `@theme` 블록 (테마 설정), 폰트 로드 |

### 생성하지 않는 것

- 개별 컴포넌트 스타일링 (S2~S9에서 해당 태스크 시)
- shadcn/ui 컴포넌트 커스터마이징 (필요 시 해당 스프린트에서)
- 다크모드 토글 UI (S6 설정에서)

---

## 상세 구현 지침

### 1. `src/app/globals.css`

```css
@import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css');
@import url('https://fonts.googleapis.com/css2?family=Comfortaa:wght@700&display=swap');

@import "tailwindcss";

@theme {
  --font-family-sans: 'Pretendard Variable', -apple-system, BlinkMacSystemFont, 'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif;
  --font-family-comfortaa: 'Comfortaa', cursive;
  --color-background: var(--bg);
  --color-foreground: var(--text);
  --color-card: var(--bg-card);
  --color-elevated: var(--bg-elevated);
  --color-page: var(--bg-page);
  --color-text-sub: var(--text-sub);
  --color-text-hint: var(--text-hint);
  --color-border: var(--border);
  --color-border-bold: var(--border-bold);
  --color-brand: var(--brand);
  --color-accent-food: var(--accent-food);
  --color-accent-food-light: var(--accent-food-light);
  --color-accent-food-dim: var(--accent-food-dim);
  --color-accent-wine: var(--accent-wine);
  --color-accent-wine-light: var(--accent-wine-light);
  --color-accent-wine-dim: var(--accent-wine-dim);
  --color-accent-social: var(--accent-social);
  --color-accent-social-light: var(--accent-social-light);
  --color-positive: var(--positive);
  --color-caution: var(--caution);
  --color-negative: var(--negative);
  --color-gauge-food-min: var(--gauge-food-min);
  --color-gauge-food-max: var(--gauge-food-max);
  --color-gauge-exp-min: var(--gauge-exp-min);
  --color-gauge-exp-max: var(--gauge-exp-max);
  --color-gauge-total-min: var(--gauge-total-min);
  --color-gauge-total-max: var(--gauge-total-max);
  --radius-xs: var(--r-xs);
  --radius-sm: var(--r-sm);
  --radius-md: var(--r-md);
  --radius-lg: var(--r-lg);
  --radius-xl: var(--r-xl);
  --radius-full: var(--r-full);
  --shadow-sm: var(--shadow-sm);
  --shadow-md: var(--shadow-md);
  --shadow-lg: var(--shadow-lg);
  --shadow-sheet: var(--shadow-sheet);
}

/* ============================================================
   DESIGN TOKENS — LIGHT MODE (기본)
   SSOT: systems/DESIGN_SYSTEM.md
   ============================================================ */

:root {
  /* ── §0 Brand ── */
  --brand: #FF6038;

  /* ── §1 Surface ── */
  --bg: #F8F6F3;
  --bg-card: #FEFCFA;
  --bg-elevated: #FFFFFF;
  --bg-page: #EFECE7;

  /* ── §1 Text ── */
  --text: #3D3833;
  --text-sub: #8C8580;
  --text-hint: #B5AFA8;

  /* ── §1 Border ── */
  --border: #E8E4DF;
  --border-bold: #D4CFC8;

  /* ── §1 Accent — Restaurant (테라코타) ── */
  --accent-food: #C17B5E;
  --accent-food-light: #F5EDE8;
  --accent-food-dim: #E8D5CB;

  /* ── §1 Accent — Wine (모브) ── */
  --accent-wine: #8B7396;
  --accent-wine-light: #F0ECF3;
  --accent-wine-dim: #DDD5E3;

  /* ── §1 Accent — Social/Bubble (슬레이트) ── */
  --accent-social: #7A9BAE;
  --accent-social-light: #EDF2F5;

  /* ── §1 Semantic ── */
  --positive: #7EAE8B;
  --caution: #C9A96E;
  --negative: #B87272;

  /* ── §1 만족도 게이지 (채널 기반) ── */
  /* 실제 색상은 shared/utils/gauge-color.ts에서 채널별로 관리 */
  /* food: #C4B5A8 → #A83E1A (coral 계열) */
  /* experience: #B5B0BA → #6B3FA0 (보라 계열) */
  /* total: #C4BCA8 → #C87A0A (골드 계열) */
  /* wine-total: #D8D0E0 → #A050D0 (밝은 보라 계열) */
  --gauge-food-min: #C4B5A8;
  --gauge-food-max: #A83E1A;
  --gauge-exp-min: #B5B0BA;
  --gauge-exp-max: #6B3FA0;
  --gauge-total-min: #C4BCA8;
  --gauge-total-max: #C87A0A;
  --gauge-wine-min: #D8D0E0;
  --gauge-wine-max: #A050D0;

  /* ── §1 상황 태그 색상 ── */
  --scene-solo: #7A9BAE;       /* 혼밥/혼술 */
  --scene-romantic: #B8879B;   /* 데이트 */
  --scene-friends: #7EAE8B;    /* 친구/모임 */
  --scene-family: #C9A96E;     /* 가족 */
  --scene-business: #8B7396;   /* 회식/접대 */
  --scene-drinks: #B87272;     /* 술자리 */
  --scene-decanting: #A0896C;  /* 디캔팅 */

  /* ── §2 Typography ── */
  --font: 'Pretendard Variable', -apple-system, BlinkMacSystemFont, 'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif;
  --font-logo: 'Comfortaa', cursive;

  /* ── §4 Border Radius ── */
  --r-xs: 6px;    /* 태그, 칩, 체크박스 */
  --r-sm: 8px;    /* 버튼, 뱃지 */
  --r-md: 12px;   /* 인풋, 카드 아이콘 */
  --r-lg: 16px;   /* 카드 */
  --r-xl: 20px;   /* 바텀시트 상단 */
  --r-full: 50px; /* CTA pill 버튼, 이전 버튼 */

  /* ── §5 Shadow ── */
  --shadow-sm: 0 1px 2px rgba(61, 56, 51, 0.04);
  --shadow-md: 0 2px 8px rgba(61, 56, 51, 0.06);
  --shadow-lg: 0 4px 20px rgba(61, 56, 51, 0.08);
  --shadow-sheet: 0 -4px 24px rgba(61, 56, 51, 0.1);

  /* ── §6 Spacing ── */
  --s-2: 2px;
  --s-4: 4px;
  --s-6: 6px;
  --s-8: 8px;
  --s-10: 10px;
  --s-12: 12px;
  --s-16: 16px;
  --s-20: 20px;
  --s-24: 24px;
  --s-32: 32px;
  --s-40: 40px;
  --s-48: 48px;

  /* ── shadcn/ui 호환 (Tailwind 기본 매핑) ── */
  --background: var(--bg);
  --foreground: var(--text);
  --card: var(--bg-card);
  --card-foreground: var(--text);
  --popover: var(--bg-elevated);
  --popover-foreground: var(--text);
  --primary: var(--accent-food);
  --primary-foreground: #FFFFFF;
  --secondary: var(--accent-wine);
  --secondary-foreground: #FFFFFF;
  --muted: var(--bg-page);
  --muted-foreground: var(--text-sub);
  --accent: var(--accent-food-light);
  --accent-foreground: var(--accent-food);
  --destructive: var(--negative);
  --destructive-foreground: #FFFFFF;
  --border-color: var(--border);
  --input: var(--border);
  --ring: var(--accent-food);
  --radius: var(--r-md);
}

/* ============================================================
   DARK MODE — §10
   ============================================================ */

[data-theme="dark"] {
  /* ── Surface ── */
  --bg: #1E1C1A;
  --bg-card: #2A2725;
  --bg-elevated: #333029;
  --bg-page: #141210;

  /* ── Text ── */
  --text: #E0DDD9;
  --text-sub: #9C9690;
  --text-hint: #6B6560;

  /* ── Border ── */
  --border: #3A3632;
  --border-bold: #4A4640;

  /* ── Accent Light 오버라이드 ── */
  --accent-food-light: #3A2A22;
  --accent-wine-light: #2E2533;
  --accent-social-light: #1E2A30;

  /* ── Shadow (다크모드에서 더 강하게) ── */
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.12);
  --shadow-md: 0 2px 8px rgba(0, 0, 0, 0.2);
  --shadow-lg: 0 4px 20px rgba(0, 0, 0, 0.25);
  --shadow-sheet: 0 -4px 24px rgba(0, 0, 0, 0.3);
}

/* ============================================================
   BASE STYLES
   ============================================================ */

@layer base {
  * {
    border-color: var(--border);
  }

  html {
    font-family: var(--font);
    color: var(--text);
    background-color: var(--bg-page);
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  body {
    min-height: 100dvh;
  }
}

/* ============================================================
   TYPOGRAPHY UTILITY CLASSES (§2)
   ============================================================ */

@layer utilities {
  .scrollbar-hide {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }
  .scrollbar-hide::-webkit-scrollbar {
    display: none;
  }
}

/* 클릭 가능 요소 포인터 커서 일괄 적용 */
button,
a,
[role="button"],
[role="link"],
[role="tab"],
[role="menuitem"],
[role="option"],
label[for],
summary {
  cursor: pointer;
}

/* 전역 스크롤바 숨김 */
html, body, * {
  scrollbar-width: none;
  -ms-overflow-style: none;
}
::-webkit-scrollbar {
  display: none;

  .text-display {
    font-size: 36px;
    font-weight: 800;
    letter-spacing: -1px;
    line-height: 1.1;
  }

  .text-h1 {
    font-size: 22px;
    font-weight: 700;
    letter-spacing: -0.3px;
    line-height: 1.3;
  }

  .text-h2 {
    font-size: 17px;
    font-weight: 600;
    line-height: 1.4;
  }

  .text-body {
    font-size: 15px;
    font-weight: 400;
    line-height: 1.5;
  }

  .text-sub {
    font-size: 13px;
    font-weight: 400;
    line-height: 1.5;
  }

  .text-caption {
    font-size: 11px;
    font-weight: 400;
    line-height: 1.4;
  }
}

/* ============================================================
   LOGO GRADIENT (§0)
   ============================================================ */

.logo-gradient {
  font-family: var(--font-logo);
  font-weight: 700;
  background: linear-gradient(135deg, #FF6038, #8B7396);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

[data-theme="dark"] .logo-gradient {
  background: linear-gradient(135deg, #FF8060, #B8A0C8);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
```

### 2. Tailwind v4 테마 설정

Tailwind v4는 `tailwind.config.ts` 파일을 사용하지 않는다. 대신 `globals.css`의 `@theme` 블록에서 테마를 정의한다.

위 globals.css의 `@theme` 블록이 Tailwind 유틸리티 클래스를 생성한다:
- `bg-background` → `var(--bg)` (#F8F6F3)
- `text-foreground` → `var(--text)` (#3D3833)
- `bg-accent-food` → `var(--accent-food)` (#C17B5E)
- `rounded-xs` → `var(--r-xs)` (6px)
- `shadow-sheet` → `var(--shadow-sheet)`
- (etc.)

`tailwind.config.ts` 파일은 생성하지 않는다. Tailwind v4에서는 불필요하다.

### 3. 폰트 로드

Pretendard Variable은 `globals.css`의 `@import url(...)` 구문으로 CDN에서 로드한다 (1.1 프로젝트 초기화에서 정의된 정규 방식). `next/font/local`이나 `next/font/google`은 사용하지 않는다.

`globals.css`의 `--font` CSS 변수에 이미 Pretendard Variable이 포함되어 있으므로 `layout.tsx`에서 별도 폰트 설정이 불필요하다.

Comfortaa는 `globals.css` 상단의 `@import url(...)` 구문으로 Google Fonts에서 로드한다.

### 4. 만족도 게이지 색상 매핑 유틸리티

`src/shared/utils/gauge-color.ts`:

채널별 색상 체계로 food(음식 퀄리티), experience(경험 가치), total(총점), wine-total(와인 총점)을 구분한다.

```typescript
/**
 * 점수(0~100)를 게이지 색상으로 변환한다.
 * 채널별 색상 체계:
 *   food (음식 퀄리티): 모노톤 → 강렬한 오렌지레드
 *   experience (경험 가치): 모노톤 → 강렬한 블루
 *   total (총점/조합): 모노톤 → 강렬한 골드
 *   default: food와 동일 (하위 호환)
 */

export type GaugeChannel = 'food' | 'experience' | 'total' | 'wine-total' | 'default'

const CHANNEL_STEPS: Record<GaugeChannel, string[]> = {
  food:         ['#C4B5A8', '#C8907A', '#C17B5E', '#B5603A', '#A83E1A'],
  experience:   ['#B5B0BA', '#A08DA8', '#8B7396', '#7A5A8E', '#6B3FA0'],
  total:        ['#C4BCA8', '#D4B85C', '#E0A820', '#D49215', '#C87A0A'],
  'wine-total': ['#D8D0E0', '#D0B0E8', '#C090E0', '#B070D8', '#A050D0'],
  default:      ['#C4B5A8', '#C8907A', '#C17B5E', '#B5603A', '#A83E1A'],
}

export const GAUGE_COLORS = {
  1: '#C4B5A8',
  2: '#E8A87C',
  3: '#E8913A',
  4: '#E06B20',
  5: '#D4451A',
} as const

export function getGaugeColor(score: number, channel: GaugeChannel = 'default'): string {
  return CHANNEL_STEPS[channel][getStepIndex(score)]
}

export function getGaugeCssVar(score: number): string {
  const clamped = Math.max(0, Math.min(100, score))
  const step = GAUGE_STEPS.find((g) => clamped <= g.max)
  return step ? step.cssVar : GAUGE_STEPS[4].cssVar
}

export function getGaugeTailwindClass(score: number): string {
  const clamped = Math.max(0, Math.min(100, score))
  const step = GAUGE_STEPS.find((g) => clamped <= g.max)
  return step ? step.tailwind : GAUGE_STEPS[4].tailwind
}
```

### 5. 레벨 색상 매핑 유틸리티

`src/shared/utils/level-color.ts`:

```typescript
/**
 * 사용자 레벨(1~10)을 색상으로 변환한다.
 * DESIGN_SYSTEM.md §9 레벨 색상.
 *
 * | 레벨    | CSS 변수          | 색상    |
 * |---------|-------------------|---------|
 * | Lv.1~3  | --positive        | #7EAE8B |
 * | Lv.4~5  | --accent-social   | #7A9BAE |
 * | Lv.6~7  | --accent-wine     | #8B7396 |
 * | Lv.8~9  | --accent-food     | #C17B5E |
 * | Lv.10   | --caution         | #C9A96E |
 */

interface LevelColorConfig {
  minLevel: number
  maxLevel: number
  color: string
  cssVar: string
  tailwind: string
}

const LEVEL_COLORS: LevelColorConfig[] = [
  { minLevel: 1, maxLevel: 3, color: '#7EAE8B', cssVar: '--positive', tailwind: 'positive' },
  { minLevel: 4, maxLevel: 5, color: '#7A9BAE', cssVar: '--accent-social', tailwind: 'accent-social' },
  { minLevel: 6, maxLevel: 7, color: '#8B7396', cssVar: '--accent-wine', tailwind: 'accent-wine' },
  { minLevel: 8, maxLevel: 9, color: '#C17B5E', cssVar: '--accent-food', tailwind: 'accent-food' },
  { minLevel: 10, maxLevel: 10, color: '#C9A96E', cssVar: '--caution', tailwind: 'caution' },
]

export function getLevelColor(level: number): string {
  const config = LEVEL_COLORS.find((c) => level >= c.minLevel && level <= c.maxLevel)
  return config ? config.color : LEVEL_COLORS[0].color
}

export function getLevelCssVar(level: number): string {
  const config = LEVEL_COLORS.find((c) => level >= c.minLevel && level <= c.maxLevel)
  return config ? config.cssVar : LEVEL_COLORS[0].cssVar
}

export function getLevelTailwindClass(level: number): string {
  const config = LEVEL_COLORS.find((c) => level >= c.minLevel && level <= c.maxLevel)
  return config ? config.tailwind : LEVEL_COLORS[0].tailwind
}
```

---

## Tailwind 클래스 → CSS 변수 매핑 레퍼런스

사용 시 참고하는 전체 매핑 테이블.

### 배경색

| Tailwind 클래스 | CSS 변수 | 라이트 값 | 다크 값 |
|----------------|----------|----------|---------|
| `bg-background` | `--bg` | `#F8F6F3` | `#1E1C1A` |
| `bg-bg-card` | `--bg-card` | `#FEFCFA` | `#2A2725` |
| `bg-bg-elevated` | `--bg-elevated` | `#FFFFFF` | `#333029` |
| `bg-bg-page` | `--bg-page` | `#EFECE7` | `#141210` |
| `bg-accent-food` | `--accent-food` | `#C17B5E` | `#C17B5E` |
| `bg-accent-food-light` | `--accent-food-light` | `#F5EDE8` | `#3A2A22` |
| `bg-accent-wine` | `--accent-wine` | `#8B7396` | `#8B7396` |
| `bg-accent-wine-light` | `--accent-wine-light` | `#F0ECF3` | `#2E2533` |
| `bg-accent-social` | `--accent-social` | `#7A9BAE` | `#7A9BAE` |
| `bg-accent-social-light` | `--accent-social-light` | `#EDF2F5` | `#1E2A30` |
| `bg-positive` | `--positive` | `#7EAE8B` | `#7EAE8B` |
| `bg-caution` | `--caution` | `#C9A96E` | `#C9A96E` |
| `bg-negative` | `--negative` | `#B87272` | `#B87272` |

### 텍스트색

| Tailwind 클래스 | CSS 변수 | 라이트 값 | 다크 값 |
|----------------|----------|----------|---------|
| `text-foreground` | `--text` | `#3D3833` | `#E0DDD9` |
| `text-text-sub` | `--text-sub` | `#8C8580` | `#9C9690` |
| `text-text-hint` | `--text-hint` | `#B5AFA8` | `#6B6560` |
| `text-accent-food` | `--accent-food` | `#C17B5E` | `#C17B5E` |
| `text-accent-wine` | `--accent-wine` | `#8B7396` | `#8B7396` |
| `text-accent-social` | `--accent-social` | `#7A9BAE` | `#7A9BAE` |
| `text-brand` | `--brand` | `#FF6038` | `#FF6038` |

### 보더

| Tailwind 클래스 | CSS 변수 | 라이트 값 | 다크 값 |
|----------------|----------|----------|---------|
| `border-border` | `--border` | `#E8E4DF` | `#3A3632` |
| `border-border-bold` | `--border-bold` | `#D4CFC8` | `#4A4640` |

### Border Radius

| Tailwind 클래스 | CSS 변수 | 값 |
|----------------|----------|-----|
| `rounded-xs` | `--r-xs` | `6px` |
| `rounded-sm` | `--r-sm` | `8px` |
| `rounded-md` | `--r-md` | `12px` |
| `rounded-lg` | `--r-lg` | `16px` |
| `rounded-xl` | `--r-xl` | `20px` |
| `rounded-full` | `--r-full` | `50px` |

### Shadow

| Tailwind 클래스 | CSS 변수 | 값 |
|----------------|----------|-----|
| `shadow-sm` | `--shadow-sm` | `0 1px 2px rgba(61,56,51,0.04)` |
| `shadow-md` | `--shadow-md` | `0 2px 8px rgba(61,56,51,0.06)` |
| `shadow-lg` | `--shadow-lg` | `0 4px 20px rgba(61,56,51,0.08)` |
| `shadow-sheet` | `--shadow-sheet` | `0 -4px 24px rgba(61,56,51,0.1)` |

### Typography

| Tailwind 클래스 | 크기 | Weight | letter-spacing |
|----------------|------|--------|---------------|
| `text-display` | 36px | 800 | -1px |
| `text-h1` | 22px | 700 | -0.3px |
| `text-h2` | 17px | 600 | 없음 |
| `text-body` | 15px | 400 | 없음 |
| `text-sub` | 13px | 400 | 없음 |
| `text-caption` | 11px | 400 | 없음 |

---

## 금지 사항

| 금지 패턴 | 대체 |
|----------|------|
| `bg-white` | `bg-bg-elevated` |
| `bg-black` | `bg-foreground` |
| `text-white` | 소셜 버튼/게이지 라벨 등 디자인 시스템에서 명시적으로 `#fff`를 지정한 경우만 허용 |
| `text-black` | `text-foreground` |
| `bg-[#F8F6F3]` | `bg-background` |
| `text-[#3D3833]` | `text-foreground` |
| `border-[#E8E4DF]` | `border-border` |
| `rounded-[12px]` | `rounded-md` |

---

## 검증 체크리스트

- [ ] `pnpm build` 에러 없음
- [ ] CSS 변수 적용 확인: 브라우저 DevTools에서 `:root`의 `--bg` = `#F8F6F3`, `--accent-food` = `#C17B5E`, `--accent-wine` = `#8B7396` 확인
- [ ] Tailwind 클래스 동작 확인: `bg-background` → `background-color: var(--bg)` 적용
- [ ] Tailwind 클래스 동작 확인: `text-foreground` → `color: var(--text)` 적용
- [ ] Tailwind 클래스 동작 확인: `text-accent-food` → `color: var(--accent-food)` 적용
- [ ] Tailwind 클래스 동작 확인: `text-accent-wine` → `color: var(--accent-wine)` 적용
- [ ] Tailwind 클래스 동작 확인: `border-border` → `border-color: var(--border)` 적용
- [ ] Tailwind 클래스 동작 확인: `rounded-md` → `border-radius: var(--r-md)` = `12px` 적용
- [ ] Tailwind 클래스 동작 확인: `shadow-sheet` → `box-shadow: var(--shadow-sheet)` 적용
- [ ] 타이포그래피 확인: `text-display` → 36px/800/-1px 적용
- [ ] 타이포그래피 확인: `text-h1` → 22px/700/-0.3px 적용
- [ ] 다크모드 전환 확인: `<html data-theme="dark">` 추가 시 `--bg` = `#1E1C1A`, `--text` = `#E0DDD9` 전환
- [ ] 다크모드 전환 확인: `--accent-food-light` = `#3A2A22` (라이트: `#F5EDE8`)
- [ ] 다크모드 전환 확인: `--accent-wine-light` = `#2E2533` (라이트: `#F0ECF3`)
- [ ] 로고 확인: `.logo-gradient` 클래스 적용 시 `#FF6038 → #8B7396` 그라데이션 표시
- [ ] 로고 다크모드 확인: `[data-theme="dark"] .logo-gradient` → `#FF8060 → #B8A0C8` 그라데이션
- [ ] Pretendard Variable 폰트 로드 확인 (DevTools Network 탭)
- [ ] Comfortaa 폰트 로드 확인 (DevTools Network 탭)
- [ ] 하드코딩 색상 없음 확인: `grep -r "bg-white\|bg-black\|text-white\|text-black" src/` → 결과 없음 (허용: Tailwind 내부 파일, 소셜 버튼 등 디자인 시스템 명시 `#fff`)
- [ ] `getGaugeColor(0)` → `#C4B5A8` 확인
- [ ] `getGaugeColor(50)` → `#C17B5E` 확인
- [ ] `getGaugeColor(100)` → `#A83E1A` 확인
- [ ] `getGaugeColor(50, 'experience')` → `#8B7396` 확인
- [ ] `getGaugeColor(100, 'total')` → `#C87A0A` 확인
- [ ] `getLevelColor(1)` → `#7EAE8B` 확인
- [ ] `getLevelColor(5)` → `#7A9BAE` 확인
- [ ] `getLevelColor(10)` → `#C9A96E` 확인
