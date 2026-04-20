# ONBOARDING — 온보딩 플로우

> depends_on: AUTH, DATA_MODEL, DESIGN_SYSTEM, XP_SYSTEM, BUBBLE
> affects: HOME, RECORD_FLOW, PROFILE
> 목표: 30초 안에 완료, 텅 빈 앱 방지, 첫 버블 생성 유도
> route: /onboarding
> prototype: `prototype/00_onboarding.html`

---

## 0. 온보딩 공통 UI 규칙

### 화면 레이아웃 (Step 1~3 공통)

컨테이너(`OnboardingContainer`)가 `StepLayout`으로 공통 레이아웃을 제공하고,
각 Step 컴포넌트가 하단 카드 영역의 children으로 렌더링된다.
각 Step 컴포넌트는 카드 영역 내에 자체 헤더(타이틀/서브타이틀)와 콘텐츠를 포함하며,
하단에 고정 CTA 버튼(`fixed bottom`)을 별도로 갖는다.

```
┌──────────────────────────────┐
│  ┃━━━━┃━━━━┃━━━━┃            │  ← 스텝 진행 바 (3칸)
│                              │     padding: 54px 28px 0
├──────────────────────────────┤
│                              │
│  큰 타이틀 (24px, bold)       │  ← 상단 ~28%: 멘트 구간 (StepLayout)
│  서브텍스트 (13px)            │     세로 중앙 정렬
│                              │
├──────────────────────────────┤
│  ┌ bg-card, radius 24px ──┐ │  ← 하단 ~72%: 인터랙티브 UI
│  │  (각 Step 컴포넌트)      │ │     border-top: 1px solid border
│  │   자체 헤더 + 콘텐츠     │ │     scroll-content (overflow-y)
│  │                         │ │
│  │  하단 고정 안내 텍스트    │ │  ← sticky bottom (StepLayout hint)
│  └─────────────────────────┘ │
│                              │
│ ┌─────────────────────────┐  │  ← 고정 CTA 버튼 (Step 컴포넌트)
│ │  N개 등록 완료 / 건너뛰기  │  │     fixed bottom, background: var(--bg)
│ └─────────────────────────┘  │
│ (fab-back)         (fab-fwd) │  ← FAB 네비게이션 (컨테이너)
└──────────────────────────────┘
```

### 스텝 진행 바 (step-progress)

- 3칸 고정 (Step 1 기록 / Step 2 버블 생성 / Step 3 버블 탐색)
- CSS 클래스: `.step-progress` (컨테이너), `.step-bar` (각 바)
- 레이아웃: `display:flex`, `gap:6px`
- 각 바: `flex:1`, `height:3px`, `border-radius:2px`

| 상태 | CSS 클래스 | 스타일 |
|------|-----------|--------|
| **active (현재)** | `.step-bar.current` | `background:var(--accent-food)` |
| **done (완료)** | `.step-bar.complete` | `background:var(--accent-food)`, `opacity:0.45` |
| **pending (대기)** | `.step-bar` (기본) | `background:var(--border)` |

- 컴포넌트: `OnboardingProgress` (`currentStep: number`, `totalSteps: number`)
- `currentStep`은 0-based 인덱스 (record=0, bubble=1, explore=2)
- 컨테이너 래퍼: `padding: 54px 28px 0` (상태바 회피 + 좌우 여백)
- 컴포넌트 내부: `.step-progress` 클래스 (`px-6 py-3` = `padding: 12px 24px`)

### FAB 네비게이션

Step 1~3에만 존재. 인트로 화면에서는 렌더링되지 않음.
컨테이너(`OnboardingContainer`)에서 `<FabBack>`, `<FabForward>` 컴포넌트를 렌더링.

| 요소 | 위치 | 크기 | 스타일 |
|------|------|------|--------|
| **fab-back** | `left:max(16px, calc(50% - 480px + 16px))`, `bottom:16px` | 44×44px 원형 | `background:rgba(248,246,243,0.88)`, `backdrop-filter:blur(12px)`, `border:1px solid var(--border)`, `box-shadow:0 2px 12px rgba(0,0,0,0.12)` |
| **fab-forward** | `right:max(16px, calc(50% - 480px + 16px))`, `bottom:28px` | 44×44px 원형 | `background:var(--accent-food)`, `color:#fff`, `box-shadow:0 3px 16px rgba(193,123,94,0.4)`, 보더 없음 |

> `max()` 함수: 모바일에서는 16px, 넓은 화면에서는 콘텐츠 영역(960px) 기준으로 정렬.

- 공통: `position:fixed`, `z-index:85`, `border-radius:50%`
- 아이콘: lucide `ChevronLeft` / `ChevronRight` (`22×22px`)
- `:active` → `transform:scale(0.9)`, `transition:0.15s`
- `:disabled` (fab-forward) → `opacity:0.4`, `cursor:not-allowed`
- 다크모드: `fab-back` → `background:rgba(42,39,37,0.92)`, `border-color:var(--border-bold)`
- `fab-forward`는 `variant` prop으로 `'food'`(기본) / `'wine'` 지원

### 전체 컨테이너

Step 1~3 공통 래퍼: `content-auth relative flex min-h-dvh flex-col`, `background:var(--bg)`
- `.content-auth`: `width:100%`, `max-width:480px`, `margin:0 auto` (모바일 중앙 정렬)

### 상단 멘트 구간 (StepLayout)

| 항목 | 스타일 |
|------|--------|
| 컨테이너 | `flex:0 0 28%`, `display:flex`, `flex-direction:column`, `justify-content:center`, `padding:0 28px` |
| 타이틀 | `font-size:24px`, `font-weight:700`, `line-height:1.45`, `letter-spacing:-0.4px`, `color:var(--text)` |
| 서브텍스트 | `font-size:13px`, `color:var(--text-sub)`, `margin-top:10px`, `line-height:1.7` |

### 하단 인터랙티브 영역 (StepLayout 카드)

| 항목 | 스타일 |
|------|--------|
| 컨테이너 | `flex:1`, `overflow-y:auto`, `background:var(--bg-card)`, `border-radius:24px 24px 0 0`, `border-top:1px solid var(--border)`, `scrollbar-width:none` |
| 내부 패딩 | `padding:0 24px`, 상단 여백 `height:20px` (빈 div) |
| sticky 안내 | `position:sticky`, `bottom:0`, `padding:14px 0 20px`, `background:var(--bg-card)` |
| 안내 텍스트 | `font-size:12px`, `font-style:italic`, `color:var(--text-hint)`, `text-align:center`, `line-height:1.5`, `margin:0` |

### 각 Step 하단 고정 CTA 버튼

각 Step 컴포넌트(`RestaurantRegisterStep`, `BubbleCreateStep`, `BubbleExploreStep`)가 자체적으로 하단에 고정 CTA 버튼을 갖는다.

| 항목 | 스타일 |
|------|--------|
| 컨테이너 | `position:fixed`, `bottom:0`, `left:0`, `right:0`, `padding:16px 24px 32px`, `background:var(--bg)` |
| 버튼 | `.btn-primary`, `width:100%`, `border-radius:12px`, `padding:14px 0`, lucide `ArrowRight` 아이콘 포함 |

### 화면 전환

- React 조건부 렌더링 (`step === 'record'` 등)으로 화면 교체
- `history` 배열로 뒤로가기 관리 (`pushStep`, `goBack`)
- CSS 슬라이드 애니메이션 없음 (즉시 전환)

### 하지 않는 것
- ❌ step dots / 원형 인디케이터 — 바 형태만 사용
- ❌ 고스트 텍스트 "← 이전" / pill 모양 "다음 →" — FAB 원형 버튼으로 통일

---

## 1. 플로우 총괄

```
/auth/login       로그인
  소셜 로그인 (Google/카카오/네이버/Apple) → 닉네임 자동 설정
       ↓ (auth callback → 홈 `/` 리다이렉트)
       ↓ (온보딩 미완료 시 앱 내에서 /onboarding으로 유도 — 현재 자동 리다이렉트 미구현)
/onboarding        (PUBLIC_ROUTE — 미인증 상태에서도 접근 가능)
  step='intro'     인트로
    앱 가치 헤드라인 → "시작하기 →" 텍스트 버튼
       ↓
  step='record'    Step 1/3 — 맛집 등록
    지역 필 선택(6개 지역) → 해당 지역 맛집 리스트 → 토글 등록
    검색 인풋으로 직접 검색 가능
       ↓
  step='bubble'    Step 2/3 — 버블 생성
    템플릿 카드 (가족/친구/직장동료) → 탭하여 생성
       ↓
  step='explore'   Step 3/3 — 버블 탐색
    공개 버블 카드 리스트 → "시작하기" 버튼
       ↓
  /                홈 진입 (awardBonus → router.push('/'))
```

### 네비게이션 경로

| 화면 | fab-back 목적지 | fab-forward 목적지 | 하단 CTA |
|------|----------------|-------------------|----------|
| intro | — (없음) | — (없음) | "시작하기 →" 텍스트 버튼 |
| record | intro (히스토리 스택) | bubble | "N개 등록 완료" 또는 "건너뛰기" (`goForward`) |
| bubble | record | explore | "다음" 또는 "건너뛰기" (`goForward`) |
| explore | bubble | 홈 (`/`, XP 미지급) | "시작하기" (`onComplete`, XP 지급 후 홈) |

### 상태 관리

컨테이너(`OnboardingContainer`)가 모든 상태를 직접 관리 (로컬 `useState`):

| 상태 | 타입 | 설명 |
|------|------|------|
| `step` | `'intro' \| 'record' \| 'bubble' \| 'explore'` | 현재 화면 |
| `history` | `OnboardingStep[]` | 네비게이션 히스토리 스택 |
| `area` | `OnboardingArea` | 선택한 지역 (기본: `ONBOARDING_AREAS[0]` = '을지로') |
| `searchQuery` | `string` | 검색 입력값 |
| `registeredIds` | `Set<string>` | 등록한 식당 ID 집합 |
| `createdBubbleIds` | `string[]` | 생성한 버블 이름 목록 |

> 참고: `use-onboarding.ts`, `use-onboarding-restaurants.ts`, `use-onboarding-bubbles.ts` 훅이
> `application/hooks/`에 정의되어 있지만, 현재 컨테이너에서는 **사용하지 않고** 직접 상태를 관리한다.
> 이 훅들은 향후 DB 연동 시 활용 예정.

### 라우팅 설정

- `src/middleware.ts`: `/onboarding`은 `PUBLIC_ROUTES`에 포함 (미인증 상태에서도 접근 가능)
- `src/shared/constants/navigation.ts`: `type: 'independent'`, `redirectTo: '/'` (탭 바 밖 독립 플로우)

### 중도 이탈 처리
- 현재 구현: 서버 저장 없음. 앱 종료 시 상태 초기화.
- 0개 등록/0개 생성으로 끝까지 진행 가능 → 빈 홈 상태로 진입

---

## 2. 로그인 화면 (/auth/login)

```
┌──────────────────────────────┐
│  (상단 여백)                   │
│                              │
│           nyam               │  ← Comfortaa 42px, logo-gradient
│                              │
│  낯선 별점 천 개보다,          │  ← 14px, text-sub
│  믿을만한 한 명의 기록.        │
│                              │
│  ┌──────────────────────────┐│
│  │ G  Google로 시작하기       ││  ← bg-card, border
│  └──────────────────────────┘│
│  ┌──────────────────────────┐│
│  │ 💬 카카오로 시작하기        ││  ← #FEE500, color:#3C1E1E
│  └──────────────────────────┘│
│  ┌──────────────────────────┐│
│  │ N  네이버로 시작하기        ││  ← #03C75A, color:#fff
│  └──────────────────────────┘│
│  ┌──────────────────────────┐│
│  │   Apple로 시작하기        ││  ← #1D1D1F, color:#fff
│  └──────────────────────────┘│
│                              │
│  가입 시 이용약관 및           │  ← 11px, text-hint
│  개인정보처리방침에 동의합니다   │     링크: text-sub, underline
└──────────────────────────────┘
```

### 구현 구조

- `src/app/auth/login/page.tsx` → `<Suspense>` + `<LoginContainer />`
- `src/presentation/containers/login-container.tsx` → `<LoginButtons />`
- `src/presentation/components/auth/login-buttons.tsx` → 4개 소셜 버튼

### 상세 규격

| 항목 | 스타일 |
|------|--------|
| 레이아웃 | `flex-direction:column`, `align-items:center`, `justify-content:center`, `min-h-dvh` |
| 배경 | `bg-background` |
| 로고 | `font-family:'Comfortaa'`, `42px`, `font-weight:700`, `letter-spacing:-1px`, `.logo-gradient` 클래스 |
| 태그라인 | `14px`, `color:var(--text-sub)`, `text-align:center`, `margin-bottom:48px` |
| 소셜 버튼 컨테이너 | `max-width:320px`, `mx-auto`, `flex-direction:column`, `gap:3px` |
| 소셜 버튼 | `.btn-social` + 프로바이더명 클래스, 인라인 SVG 아이콘 `20×20px` |
| 하단 약관 | `11px`, `color:var(--text-hint)`, 링크 `color:var(--text-sub)`, `text-decoration:underline`, `text-underline-offset:2px` |

### 동작
- 소셜 버튼 탭 → `signInWithOAuth(provider, redirect)` 호출 → OAuth 처리
- FAB 없음, 스텝 진행 바 없음

### Auth Callback (/auth/callback)

| 단계 | 동작 |
|------|------|
| 1 | OAuth `code` 수신 → `supabase.auth.exchangeCodeForSession(code)` |
| 2 | 인증 성공 → `supabase.auth.getUser()` |
| 3 | `users` 테이블에 프로필 존재 확인 |
| 4 (신규) | 프로필 생성: `id`, `email`, `nickname` (메타에서 추출, 최대 20자, 폴백: '냠유저'), `avatar_url`, `auth_provider` (폴백: 'google'), `auth_provider_id`, `privacy_profile: 'bubble_only'`, `privacy_records: 'shared_only'` |
| 5 | 홈(`/`)으로 리다이렉트 |
| 에러 | `/auth/login?error=callback_failed`로 리다이렉트 |

---

## 3. 인트로 화면 (step='intro')

```
┌──────────────────────────────┐
│                              │
│                              │
│   낯선 별점 천 개보다,         │  ← 26px, 700, text-align:center
│   믿을만한 한 명의 기록.       │
│                              │
│   기록은 쌓이고,              │  ← 14px, text-sub
│   취향은 선명해지고,           │     line-height:1.8
│   가까운 사람들과 나눌 수 있어요.│
│                              │
│                              │
│         시작하기 →            │  ← 15px, 600, accent-food, 텍스트 버튼
│                              │
└──────────────────────────────┘
```

### 컴포넌트

`OnboardingIntro` (`onNext: () => void`)

### 상세 규격

| 항목 | 스타일 |
|------|--------|
| 콘텐츠 컨테이너 | `flex:1`, `justify-content:center`, `align-items:center`, `padding:0 36px` |
| 전체 컨테이너 | `min-h-dvh`, `flex-col`, `background:var(--bg)` |
| 헤드라인 | `26px`, `font-weight:700`, `line-height:1.5`, `letter-spacing:-0.4px`, `text-align:center`, `color:var(--text)` |
| 서브텍스트 | `14px`, `color:var(--text-sub)`, `line-height:1.8`, `margin-top:16px`, `text-align:center` |
| CTA 컨테이너 | `padding:0 24px 56px`, `flex-shrink:0`, `text-align:center` |
| CTA 버튼 | `background:none`, `border:none`, `15px`, `font-weight:600`, `color:var(--accent-food)`, `padding:12px 24px`, `letter-spacing:-0.1px` |
| CTA press | `transition-opacity`, `active:opacity-50` (Tailwind) |

### 규칙
- 스텝 진행 바 없음, FAB 없음
- "시작하기 →" 탭 → `pushStep('record')` → Step 1

### 하지 않는 것
- ❌ 기록 유형 선택 (맛집/와인 토글 카드) — 온보딩 진입 장벽 제거
- ❌ 가치 스토리 3단 (아이콘 + 헤드라인 + 설명 ×3) — 헤드라인 + 서브텍스트로 충분
- ❌ 앱 스크린샷 / 미리보기 캐러셀 — 직접 해보는 게 빠름

---

## 4. Step 1/3: 맛집 등록 (step='record')

### StepLayout 멘트

| 항목 | 텍스트 |
|------|--------|
| 타이틀 | "기록할 때마다, 당신의 미식 경험치가 쌓여요." |
| 서브텍스트 | "경험치를 통해 레벨이 올라가고, 레벨은 사용자의 전문분야(지역, 장르)를 보여줍니다." |
| hint | "지금은 등록만 하고, 나중에 식당평가 기록을 완성해 주세요." |

### Step 내부 레이아웃

```
┌──────────────────────────────┐
│  ┃━━━━┃────┃────┃            │  ← Step 1 active
├──────────────────────────────┤
│  기록할 때마다,               │  ← StepLayout 타이틀
│  당신의 미식 경험치가 쌓여요.  │
│  경험치를 통해 레벨이 올라가고, │  ← StepLayout 서브텍스트
│  레벨은 사용자의 전문분야       │
│  (지역, 장르)를 보여줍니다.    │
├──────────────────────────────┤
│ ┌─ bg-card ─────────────────┐│
│ │                            ││
│ │  자주 가는 맛집을 등록하세요 ││  ← Step 컴포넌트 자체 헤더 (20px, bold)
│ │  가본 적 있는 식당을 선택... ││  ← 14px, text-sub
│ │                            ││
│ │  [을지로][광화문][성수]...   ││  ← AreaSelect 필 (rounded-full)
│ │                            ││
│ │  [🔍 식당 검색             ]││  ← OnboardingSearch
│ │                            ││
│ │  ┌─ restaurant card ─────┐ ││  ← 식당 카드 (토글 버튼)
│ │  │ [🍴] 을지면옥  한식 (✓)│ ││
│ │  └───────────────────────┘ ││
│ │  ┌─ restaurant card ─────┐ ││
│ │  │ [🍴] 스시코우지 일식 (+)│ ││
│ │  └───────────────────────┘ ││
│ │                            ││
│ │  지금은 등록만 하고,        ││  ← sticky 하단 안내
│ │  나중에 식당평가 기록을      ││
│ │  완성해 주세요.             ││
│ └────────────────────────────┘│
│ ┌ 2개 등록 완료          →  ┐ │  ← 고정 CTA 버튼
│ └────────────────────────────┘│
│ (◁)                     (▷)  │
└──────────────────────────────┘
```

### 4-1. 컴포넌트

`RestaurantRegisterStep` (Props):

| Prop | 타입 | 설명 |
|------|------|------|
| `area` | `OnboardingArea` | 현재 선택된 지역 |
| `onAreaChange` | `(area) => void` | 지역 변경 |
| `searchQuery` | `string` | 검색 입력값 |
| `onSearchChange` | `(query) => void` | 검색 변경 |
| `restaurants` | `OnboardingSeedRestaurant[]` | 표시할 식당 목록 |
| `registeredIds` | `Set<string>` | 등록된 식당 ID 집합 |
| `isLoading` | `boolean` | 로딩 상태 |
| `onRegister` | `(id) => void` | 식당 등록 |
| `onUnregister` | `(id) => void` | 식당 등록 해제 |
| `onNext` | `() => void` | 다음 스텝 |

### 4-2. 지역 필 선택 (AreaSelect)

**드롭다운이 아닌 가로 필(pill) 배열** 방식으로 구현.

| 항목 | 스타일 |
|------|--------|
| 컨테이너 | `display:flex`, `flex-wrap:wrap`, `gap:8px` |
| 각 필 | `rounded-full`, `padding:8px 16px`, `font-size:13px`, `font-weight:600`, `transition-colors` |
| **선택됨** | `background:var(--accent-food)`, `color:#FFFFFF`, `border:none` |
| **미선택** | `background:var(--bg-card)`, `color:var(--text-sub)`, `border:1px solid var(--border)` |

**지역 목록** (6개):
`을지로`, `광화문`, `성수`, `강남`, `홍대`, `이태원`

- 기본 선택: `ONBOARDING_AREAS[0]` = `을지로`
- 지역 변경 → 해당 지역 맛집 리스트로 교체
- 등록 완료 상태는 전역 `Set<string>`으로 지역 전환 후에도 유지

### 4-3. 검색 인풋 (OnboardingSearch)

| 항목 | 스타일 |
|------|--------|
| 컨테이너 | `.card` 클래스, `display:flex`, `align-items:center`, `gap:8px`, `rounded-xl`, `padding:10px 12px` |
| 아이콘 | lucide `Search` (`16×16px`), `color:var(--text-hint)` |
| 인풋 | `flex:1`, `bg-transparent`, `font-size:14px`, `color:var(--text)`, `outline:none` |
| placeholder | "식당 검색", `color:var(--text-hint)` |
| 지우기 | lucide `X` (`14×14px`), `color:var(--text-hint)` — 텍스트 있을 때만 표시 |

> 검색 결과 드롭다운 없음. 인라인 인풋만 제공.
> 현재 컨테이너에서 `searchQuery`를 관리하지만 시드 데이터 필터링은 미구현 (하드코딩 데이터 사용).
> `use-onboarding-restaurants` 훅에서는 2글자 이상 입력 시 `onboardingRepo.searchSeedRestaurants()` 호출하도록 준비되어 있음.

### 4-4. 식당 리스트 (카드 형태)

| 항목 | 스타일 |
|------|--------|
| 컨테이너 | `flex-col`, `gap:8px` |
| 카드 | `display:flex`, `align-items:center`, `gap:12px`, `rounded-xl`, `padding:12px`, `active:scale-[0.98]`, `transition-colors` |
| **미등록** 카드 | `background:var(--bg-card)`, `border:1px solid var(--border)` |
| **등록됨** 카드 | `background:var(--accent-food-light)`, `border:1px solid var(--accent-food)` |

**사진/아이콘 영역**:

| 항목 | 스타일 |
|------|--------|
| 크기 | `48×48px`, `rounded-lg`, `flex-shrink:0` |
| 배경 | `background:var(--bg-elevated)` |
| 사진 있음 | `<Image>`, `object-cover`, `rounded-lg` |
| 사진 없음 | lucide `UtensilsCrossed` (`20×20px`), `color:var(--text-hint)` |

**텍스트 영역**:

| 항목 | 스타일 |
|------|--------|
| 식당 이름 | `font-size:14px`, `font-weight:600`, `color:var(--text)` |
| 장르 · 지역 | `font-size:12px`, `color:var(--text-hint)`, `margin-top:2px` |

**토글 버튼 (우측)**:

| 상태 | 스타일 |
|------|--------|
| 미등록 | `28×28px` 원형, `background:var(--bg-elevated)`, `border:1px solid var(--border)`, lucide `Plus` (`14px`, `color:var(--text-hint)`) |
| 등록됨 | `28×28px` 원형, `background:var(--accent-food)`, `border:none`, lucide `Check` (`14px`, `color:#FFFFFF`) |

- 클릭 → 토글 (등록/등록 해제)
- 등록 해제 가능 (전역 Set에서 삭제)

**로딩 상태**: 5개 스켈레톤 (`h-16`, `animate-pulse`, `rounded-xl`, `bg:var(--bg-card)`)

**빈 상태**: "검색 결과가 없습니다" 또는 "이 지역의 식당이 없습니다" (`13px`, `color:var(--text-hint)`)

### 4-5. 시드 데이터

현재 컨테이너에 **인라인 하드코딩**된 시드 데이터 사용 (DB 미연동):

| 지역 | 식당 목록 |
|------|----------|
| 을지로 | 을지면옥 (한식), 스시코우지 (일식), 을지다락 (카페), 을지OB맥주 (바/주점) |
| 광화문 | 토속촌삼계탕 (한식), 경복궁 쌈밥집 (한식) |
| 성수 | 성수동 카페거리 (카페), 뚝섬 숯불갈비 (한식) |
| 강남 | 봉피양 (한식), 스시 쵸우 (일식) |
| 홍대 | 연남토마 (이탈리안) |
| 이태원 | 하동관 (한식) |

> `src/shared/constants/onboarding-seeds.ts`에도 별도의 시드 데이터(`SEED_RESTAURANTS`)가 정의되어 있으나,
> 현재 컨테이너에서는 사용하지 않음. 향후 통합 예정.
>
> constants 시드 데이터 (지역별 3개씩):
> 을지로: 을지로골뱅이, 을지다락, 양미옥 / 광화문: 토속촌, 광화문미진, 정식당
> 성수: 도토리, 센터커피, 떡볶이공장 / 강남: 본초밥, 봉피양, 리베
> 홍대: 키친크래프트, 제순식당, 메이사스 / 이태원: 라일락, 한남동 도피오, 플랜트

### 4-6. 인터랙션 규칙

| 항목 | 규칙 |
|------|------|
| 등록 | 카드 탭 → 배경색 + 보더 변경, Plus → Check 아이콘 변경 |
| 등록 해제 | 등록된 카드 재탭 → 원래 상태로 복원 (토글) |
| 중복 방지 | 전역 `Set<string>` (식당 ID 기준) |
| 지역 전환 | 필 변경 → 리스트 교체. 등록 상태는 Set으로 유지 |
| 0개 등록 | CTA 버튼 "건너뛰기"로 진행 가능 |
| N개 등록 | CTA 버튼 "N개 등록 완료"로 표시 |
| XP | 식당 등록 시 XP 없음 (팝업 없음) |

### 4-7. 하단 고정 CTA

| 상태 | 버튼 텍스트 |
|------|-----------|
| 0개 등록 | "건너뛰기" + `→` 아이콘 |
| N개 등록 | "N개 등록 완료" + `→` 아이콘 |

- `.btn-primary` 스타일, `width:100%`, `rounded-xl`, `padding:14px 0`
- lucide `ArrowRight` (`16px`) 아이콘 포함

### 4-8. 데이터 저장

현재 컨테이너는 **로컬 상태만 관리** (DB 저장 미연동).
`registeredIds` Set에 추가/삭제만 하고 서버 호출 없음.

`use-onboarding-restaurants` 훅과 `SupabaseOnboardingRepository`에 DB 저장 로직이 준비되어 있음:

```sql
-- 식당 등록 (lists 테이블에 upsert, Supabase .upsert() 사용)
INSERT INTO lists (user_id, target_id, target_type, status, source)
VALUES (:user_id, :restaurant_id, 'restaurant', 'visited', 'onboarding')
ON CONFLICT (user_id, target_id, target_type)
DO UPDATE SET status = 'visited', source = 'onboarding';
```

> `lists` 테이블 사용 (`records` 테이블 아님). `status='visited'`, `source='onboarding'`.

---

## 5. Step 2/3: 버블 생성 (step='bubble')

### StepLayout 멘트

| 항목 | 텍스트 |
|------|--------|
| 타이틀 | "내가 인정하는 미식가들끼리 숨겨진 맛집을 공유해요." |
| 서브텍스트 | "가족, 친구, 동료 — 나만의 버블을 만들어보세요." |
| hint | "세부 사항은 나중에 언제든 변경할 수 있어요." |

### Step 내부 레이아웃

```
┌──────────────────────────────┐
│  ┃━━━━┃━━━━┃────┃            │  ← Step 1 done(0.45), Step 2 active
├──────────────────────────────┤
│  내가 인정하는 미식가들끼리     │  ← StepLayout 타이틀
│  숨겨진 맛집을 공유해요.       │
│  가족, 친구, 동료 — 나만의     │  ← StepLayout 서브텍스트
│  버블을 만들어보세요.          │
├──────────────────────────────┤
│ ┌─ bg-card ─────────────────┐│
│ │                            ││
│ │  나만의 버블을 만들어보세요  ││  ← Step 헤더 (20px, bold)
│ │  가족, 친구, 직장 동료와...  ││  ← 14px, text-sub
│ │                            ││
│ │ ┌────────────────────────┐ ││
│ │ │ [🏠] 우리 가족 맛집      │ ││  ← bubble-template 카드
│ │ │      가족끼리 공유하는... │ ││
│ │ │      👥 초대 전용        │ ││
│ │ └────────────────────────┘ ││
│ │ ┌────────────────────────┐ ││
│ │ │ [🍺] 친구들 맛집        │ ││
│ │ │      친구들과 발견한...   │ ││
│ │ │      👥 초대 전용        │ ││
│ │ └────────────────────────┘ ││
│ │ ┌────────────────────────┐ ││
│ │ │ [💼] 직장 동료 맛집      │ ││
│ │ │      회사 근처 점심...    │ ││
│ │ │      👥 초대 전용        │ ││
│ │ └────────────────────────┘ ││
│ │                            ││
│ │  세부 사항은 나중에          ││  ← sticky 하단 안내
│ │  언제든 변경할 수 있어요.    ││
│ └────────────────────────────┘│
│ ┌ 다음 / 건너뛰기        →  ┐ │  ← 고정 CTA 버튼
│ └────────────────────────────┘│
│ (◁)                     (▷)  │
└──────────────────────────────┘
```

### 5-1. 컴포넌트

`BubbleCreateStep` (Props):

| Prop | 타입 | 설명 |
|------|------|------|
| `templates` | `OnboardingBubbleTemplate[]` | 템플릿 목록 |
| `createdBubbleIds` | `string[]` | 생성된 버블 이름 목록 |
| `isLoading` | `boolean` | 로딩 상태 |
| `onCreateBubble` | `(template) => void` | 생성 콜백 |
| `onNext` | `() => void` | 다음 스텝 |

### 5-2. 버블 템플릿 카드

| 항목 | 스타일 |
|------|--------|
| 카드 | `rounded-2xl`, `padding:16px`, `transition-all`, `active:scale-[0.98]` |
| 레이아웃 | `display:flex`, `align-items:center`, `gap:16px` |
| 카드 목록 간격 | `gap:12px` |
| **미생성** | `background:var(--bg-card)`, `border:1.5px solid var(--border)` |
| **생성됨** | `background:var(--accent-social-light)`, `border:1.5px solid var(--accent-social)`, `opacity:0.6`, `disabled` |

**아이콘 영역**:

| 항목 | 스타일 |
|------|--------|
| 크기 | `56×56px`, `rounded-2xl`, `flex-shrink:0` |
| 배경 | 각 템플릿의 `iconBgColor` |
| 아이콘 | 텍스트/이모지, `font-size:24px` (lucide 아이콘 아님) |

**텍스트 영역**:

| 항목 | 스타일 |
|------|--------|
| 이름 | `font-size:15px`, `font-weight:700`, `color:var(--text)` |
| 설명 | `font-size:12px`, `color:var(--text-sub)`, `margin-top:2px` |
| 정책 뱃지 | lucide `Users` (`11px`, `color:var(--text-hint)`) + "초대 전용" (`10px`, `color:var(--text-hint)`), `margin-top:6px` |

**생성 완료 표시**:
- 우측에 체크 아이콘: `28×28px` 원형, `background:var(--accent-social)`, lucide `Check` (`14px`, `color:#FFFFFF`)

### 5-3. 템플릿 데이터

`src/shared/constants/onboarding-seeds.ts`의 `BUBBLE_TEMPLATES`:

| 이름 | 아이콘 (텍스트) | 아이콘 배경색 | 설명 |
|------|---------------|-------------|------|
| 우리 가족 맛집 | `home` | `#FF6038` (주황) | 가족끼리 공유하는 맛집 리스트 |
| 친구들 맛집 | `beer` | `#7A9BAE` (블루) | 친구들과 발견한 맛집 모음 |
| 직장 동료 맛집 | `briefcase` | `#8B7396` (퍼플) | 회사 근처 점심 맛집 공유 |

공통: `joinPolicy: 'invite_only'`, `focusType: 'all'`

### 5-4. 인터랙션 규칙

| 항목 | 규칙 |
|------|------|
| 생성 | 카드 탭 → 배경색/보더 변경 (accent-social), 우측 Check 아이콘 표시, disabled 처리 |
| 순차 생성 | `idx < createdBubbleIds.length`로 판별 (인덱스 순서대로) |
| 중복 | 이미 생성된 템플릿은 `disabled`, `opacity:0.6` |
| 0개 생성 | CTA "건너뛰기"로 진행 가능 |
| XP 팝업 | **없음** (현재 구현에 XP 팝업 미포함) |
| 초대하기 | **없음** (현재 구현에 초대 기능 미포함) |

> `XpPopup` 컴포넌트가 `src/presentation/components/onboarding/xp-popup.tsx`에 정의되어 있지만,
> 현재 온보딩 플로우에서 사용되지 않음.

### 5-5. 데이터 저장

현재 컨테이너는 **로컬 상태만 관리**:
- `onCreateBubble` 콜백에서 `createdBubbleIds`에 템플릿 이름(`t.name`)만 추가
- DB 저장 미연동 (실제 bubbles 테이블 insert 없음)

`use-onboarding-bubbles` 훅에 DB 연동 로직이 준비되어 있음:
- `bubbleRepo.create()` 호출하여 실제 버블 생성
- 생성 시 `name`, `description`, `icon`, `iconBgColor`, `joinPolicy`, `focusType`, `createdBy` 전달

### 5-6. 하단 고정 CTA

| 상태 | 버튼 텍스트 |
|------|-----------|
| 0개 생성 | "건너뛰기" + `→` 아이콘 |
| 1개+ 생성 | "다음" + `→` 아이콘 |

---

## 6. Step 3/3: 버블 탐색 (step='explore')

### StepLayout 멘트

| 항목 | 텍스트 |
|------|--------|
| 타이틀 | "경험을 쌓으면, 맛잘알들의 세계가 열려요." |
| 서브텍스트 | "레벨이 오를수록 더 많은 버블에 들어가 모르는 맛잘알들과도 맛집을 나눌 수 있어요." |
| hint | "내가 만든 버블은 가입 조건을 직접 설정해서, 원하는 사람들과만 맛집을 공유할 수 있어요." |

### Step 내부 레이아웃

```
┌──────────────────────────────┐
│  ┃━━━━┃━━━━┃━━━━┃            │  ← Step 1,2 done, Step 3 active
├──────────────────────────────┤
│  경험을 쌓으면,               │  ← StepLayout 타이틀
│  맛잘알들의 세계가 열려요.     │
│  레벨이 오를수록 더 많은 버블에 │  ← StepLayout 서브텍스트
│  들어가 모르는 맛잘알들과도     │
│  맛집을 나눌 수 있어요.        │
├──────────────────────────────┤
│ ┌─ bg-card ─────────────────┐│
│ │                            ││
│ │  인기 버블을 둘러보세요      ││  ← Step 헤더 (20px, bold)
│ │  다양한 버블에서 맛집...     ││  ← 14px, text-sub
│ │                            ││
│ │ ┌ explore-card ───────────┐││
│ │ │ [🗺] 서울 맛집 탐험대     │││  ← 탐색 카드
│ │ │      서울 전역의 숨은...  │││
│ │ │      👥 128명            │││
│ │ └─────────────────────────┘││
│ │ ┌ explore-card ───────────┐││
│ │ │ [🍷] 와인 입문자 가이드    │││
│ │ │      와인을 처음 시작...  │││
│ │ │      👥 85명             │││
│ │ └─────────────────────────┘││
│ │ ┌ explore-card ───────────┐││
│ │ │ [✨] 파인다이닝 클럽      │││  ← opacity:0.5 (Lv.3 잠금)
│ │ │      특별한 날을 위한...  │││
│ │ │      👥 42명  Lv.3 이상  │││
│ │ └─────────────────────────┘││
│ │ ┌ explore-card ───────────┐││
│ │ │ [💎] 동네 보석 찾기       │││  ← 잠금 해제 (Lv.1 = userLevel)
│ │ │      내 동네 숨은 맛집... │││
│ │ │      👥 67명  Lv.1 이상  │││
│ │ └─────────────────────────┘││
│ │                            ││
│ │  내가 만든 버블은 가입 조건을 ││  ← sticky 하단 안내
│ │  직접 설정해서, 원하는 사람들 ││
│ │  과만 맛집을 공유할 수 있어요.││
│ └────────────────────────────┘│
│ ┌ 시작하기                →  ┐ │  ← 고정 CTA 버튼
│ └────────────────────────────┘│
│ (◁)                     (▷)  │  ← ▷ = 홈 진입
└──────────────────────────────┘
```

### 6-1. 컴포넌트

`BubbleExploreStep` (Props):

| Prop | 타입 | 설명 |
|------|------|------|
| `seedBubbles` | `OnboardingSeedBubble[]` | 공개 버블 목록 |
| `userLevel` | `number` | 사용자 레벨 (현재 하드코딩: 1) |
| `isLoading` | `boolean` | 로딩 상태 |
| `onBubblePress` | `(bubble) => void` | 카드 클릭 콜백 |
| `onComplete` | `() => void` | 완료 콜백 |

### 6-2. 탐색 카드 (explore-card)

| 항목 | 스타일 |
|------|--------|
| 카드 | `rounded-2xl`, `padding:16px`, `background:var(--bg-card)`, `border:1px solid var(--border)`, `active:scale-[0.98]`, `transition-colors` |
| 레이아웃 | `display:flex`, `align-items:center`, `gap:12px` |
| 카드 목록 | `flex-col`, `gap:12px` |
| **잠금** (minLevel > userLevel) | `opacity:0.5` |

**아이콘 영역**:

| 항목 | 스타일 |
|------|--------|
| 크기 | `48×48px`, `rounded-xl`, `flex-shrink:0` |
| 배경 | 각 버블의 `iconBgColor` |
| 아이콘 | 텍스트/이모지, `font-size:20px` |

**정보 영역**:

| 항목 | 스타일 |
|------|--------|
| 이름 행 | `display:flex`, `align-items:center`, `gap:8px` |
| 이름 | `font-size:14px`, `font-weight:700`, `color:var(--text)` |
| 잠금 아이콘 | lucide `Lock` (`12px`, `color:var(--text-hint)`) — 잠긴 경우만 |
| 설명 | `font-size:12px`, `color:var(--text-sub)`, `line-clamp-1`, `margin-top:2px` |
| 메타 행 | `margin-top:4px`, `display:flex`, `align-items:center`, `gap:12px` |
| 멤버 수 | lucide `Users` (`11px`) + "N명" (`10px`, `color:var(--text-hint)`) |
| 레벨 | "Lv.N 이상" (`10px`, `color:var(--text-hint)`) — minLevel > 0인 경우만 |

**로딩 상태**: 4개 스켈레톤 (`h-20`, `animate-pulse`, `rounded-xl`)

**빈 상태**: "아직 공개 버블이 없어요" (`13px`, `color:var(--text-hint)`)

### 6-3. 시드 버블 데이터

`src/shared/constants/onboarding-seeds.ts`의 `SEED_BUBBLES`:

| 이름 | 아이콘 (텍스트) | 아이콘 배경 | 멤버 | 최소레벨 | 가입정책 | 설명 |
|------|---------------|-----------|------|---------|---------|------|
| 서울 맛집 탐험대 | `map` | `#FF6038` | 128 | 0 | `open` | 서울 전역의 숨은 맛집을 발굴하는 큐레이션 리스트 |
| 와인 입문자 가이드 | `wine` | `#8B7396` | 85 | 0 | `open` | 와인을 처음 시작하는 사람들을 위한 와인 리스트 |
| 파인다이닝 클럽 | `sparkles` | `#C9A96E` | 42 | 3 | `auto_approve` | 특별한 날을 위한 파인다이닝 리뷰 |
| 동네 보석 찾기 | `gem` | `#7EAE8B` | 67 | 1 | `open` | 내 동네 숨은 맛집 큐레이션 |

> 사용자 레벨이 1로 하드코딩되어 있으므로:
> - 서울 맛집 탐험대 (Lv.0) → 잠금 해제
> - 와인 입문자 가이드 (Lv.0) → 잠금 해제
> - 파인다이닝 클럽 (Lv.3) → 잠금 (opacity:0.5)
> - 동네 보석 찾기 (Lv.1) → 잠금 해제

### 6-4. 바텀시트 팝업

`BubbleExplorePopup` 컴포넌트가 정의되어 있으나 **현재 온보딩 플로우에서 연결되지 않음**.
컨테이너에서 `onBubblePress={() => {}}` (빈 함수)로 전달.

**컴포넌트 스펙** (향후 연결 시):

| 항목 | 스타일 |
|------|--------|
| 오버레이 | `.bottom-sheet-overlay`, `z-index:50` |
| 시트 | `.bottom-sheet`, `max-width:480px`, `padding-bottom:32px` |
| 헤더 | "버블 상세" (`15px`, `bold`), lucide `X` (`20px`) 닫기 버튼 |
| 아이콘 | `64×64px`, `rounded-2xl`, `font-size:28px`, 배경색 적용 |
| 이름 | `18px`, `bold`, `margin-top:12px` |
| 설명 | `13px`, `text-sub`, `text-align:center`, `line-height:1.6` |
| 메타 | lucide `Users` + 멤버 수, lucide `Lock` + 레벨 요구 |

**상태별 액션**:

| 상태 | UI |
|------|-----|
| 잠금 (레벨 부족) | "레벨이 부족합니다 (현재 Lv.N)" (`accent-wine` 색), "닫기" 버튼 |
| 가입 가능 (open/auto_approve) | "가입하기" 버튼 (`accent-social` 배경) |
| 승인 필요 | "승인 대기 필요" 버튼 (비활성) |

### 6-5. 인터랙션 규칙

| 항목 | 규칙 |
|------|------|
| 카드 탭 | 현재 동작 없음 (빈 함수) |
| 바텀시트 | 미연결 |
| CTA "시작하기" | `onComplete` → `awardBonus(userId, 'onboard')` → `router.push('/')` |
| fab-forward | `goForward` → `router.push('/')` (**awardBonus 미호출** — CTA와 다름) |
| 가입 액션 | 온보딩에서는 가입 불가 |

> ⚠️ CTA 버튼과 fab-forward의 완료 동작이 다름:
> CTA는 `onComplete` 핸들러를 사용하여 XP 보너스를 지급한 뒤 홈으로 이동하지만,
> fab-forward는 `goForward`를 사용하여 XP 보너스 없이 바로 홈으로 이동함.

### 6-6. 하단 고정 CTA

- 항상 "시작하기" + `→` 아이콘 표시
- 탭 → `onComplete` → `awardBonus(userId, 'onboard')` → `router.push('/')`

---

## 7. 온보딩 데이터 저장 요약

### 7-1. 현재 구현 상태

컨테이너는 **로컬 상태만 관리**하며, 아래 두 가지만 서버와 통신:

| 동작 | 구현 |
|------|------|
| 온보딩 완료 XP | `useBonusXp().awardBonus(userId, 'onboard')` — Step 3 완료 시 호출 |
| 홈 리다이렉트 | `router.push('/')` |

식당 등록, 버블 생성은 현재 DB에 저장되지 않음 (UI 상태만).

### 7-2. 준비된 인프라 (향후 DB 연동용)

**도메인 레이어**:
- `OnboardingRepository` 인터페이스 (`domain/repositories/onboarding-repository.ts`)
- `onboarding-xp.ts` 서비스 (XP 계산 함수)

**인프라 레이어**:
- `SupabaseOnboardingRepository` (`infrastructure/repositories/supabase-onboarding-repository.ts`)

**식당 등록** (준비됨):

```sql
-- lists 테이블에 upsert (Supabase .upsert() 사용)
INSERT INTO lists (user_id, target_id, target_type, status, source)
VALUES (:user_id, :restaurant_id, 'restaurant', 'visited', 'onboarding')
ON CONFLICT (user_id, target_id, target_type)
DO UPDATE SET status = 'visited', source = 'onboarding';
```

**식당 등록 해제** (준비됨):

```sql
DELETE FROM lists
WHERE user_id = :user_id AND target_id = :restaurant_id AND target_type = 'restaurant';
```

**버블 생성** (준비됨):
- `bubbleRepo.create()` 호출 (name, description, icon, iconBgColor, joinPolicy, focusType, createdBy)

**시드 버블 조회** (준비됨):

```sql
SELECT id, name, description, icon, icon_bg_color, member_count, min_level, join_policy
FROM bubbles
WHERE visibility = 'public' AND is_searchable = true
ORDER BY member_count DESC
LIMIT 10;
```

**온보딩 완료** (준비됨):

```sql
UPDATE users SET updated_at = NOW() WHERE id = :user_id;
```

> 현재는 `onboarding_completed` 컬럼이 아닌 `updated_at`만 갱신.

### 7-3. 온보딩 XP 정리

**도메인 서비스** (`onboarding-xp.ts`):

| 함수 | 반환값 | 비고 |
|------|--------|------|
| `ONBOARDING_COMPLETION_XP` | 10 | 상수 |
| `calculateOnboardingBubbleXp(isFirstBubble)` | 첫 버블: 10, 이후: 5 | 미사용 |
| `calculateOnboardingRegisterXp()` | 3 | 미사용 |

**실제 구현된 XP**:

| 시점 | XP | 구현 |
|------|-----|------|
| 온보딩 완료 (Step 3 → 홈) | `awardBonus(userId, 'onboard')` | `useBonusXp` 훅 |

> `calculateOnboardingBubbleXp`, `calculateOnboardingRegisterXp`는 정의되어 있지만
> 현재 온보딩 플로우에서 호출되지 않음.

### 7-4. Application Hooks (미사용, 준비됨)

| 훅 | 용도 | 상태 |
|-----|------|------|
| `useOnboarding` | 온보딩 전체 상태 관리 (5-screen: intro→restaurant_register→bubble_create→bubble_explore→complete) | 미사용 |
| `useOnboardingRestaurants` | 식당 조회/등록/해제 (DB 연동, 기본 지역: '강남') | 미사용 |
| `useOnboardingBubbles` | 버블 조회/생성 (DB 연동) | 미사용 |

---

## 8. 온보딩에서 하는 것 / 안 하는 것

### 하는 것

| 항목 | 방식 | 목적 |
|------|------|------|
| 앱 소개 | 인트로 헤드라인 1줄 + 서브텍스트 | 앱 정체성 전달 |
| 맛집 등록 | 지역 필 선택 → 카드 리스트 → 토글 등록 / 검색 | 콜드스타트 해소 |
| 버블 생성 | 템플릿 카드 → 탭하여 생성 | 소셜 기능 첫 경험 |
| 버블 미리보기 | 공개 버블 카드 리스트 (레벨 잠금 표시) | 레벨업 동기 부여 |
| XP/레벨 소개 | Step 1 StepLayout 멘트 "경험치가 쌓여요" | 핵심 메커니즘 인지 |
| 완료 XP | `awardBonus(userId, 'onboard')` | 초기 부스트 |

### 안 하는 것

| 항목 | 이유 |
|------|------|
| 맛집/와인 타입 선택 토글 | 진입 장벽 제거. 앱에서 자연스럽게 탐색 |
| 지도 기반 가져오기 (네이버/구글) | 미구현 |
| 만족도 게이지 / 사분면 평가 | 온보딩은 등록만. 평가는 RECORD_FLOW에서 |
| 가봤음 / 가보고싶음 구분 | 단순 "등록"으로 통일 |
| 와인 온보딩 (사진 인식) | 스코프 외. 앱 진입 후 별도 플로우 |
| 위시리스트 생성 | 온보딩 복잡도 축소 |
| 프로필/닉네임 설정 | 소셜 로그인에서 자동 설정. Settings에서 변경 |
| 취향 카드 (2지선다) | 기록 데이터에서 자연스럽게 파악 |
| 초대하기 버튼 | 미구현 (향후 추가 가능) |
| 바텀시트 버블 상세 | 컴포넌트 존재하나 미연결 |
| 개별 XP 팝업 | 컴포넌트 존재하나 미연결 |

---

## 9. 넛지 시스템 (온보딩 이후 Week 1~2)

> 아래는 설계 스펙. 현재 미구현.

### 넛지 유형 & 우선순위

| 순위 | 유형 | 트리거 | 빈도 | 침습도 |
|------|------|--------|------|--------|
| 1 | 미완성 기록 보충 | 앱 진입 시 `status='checked'` 기록 존재 | 매 진입 | 낮음 (앱 내) |
| 2 | 사진 감지 | 앱 진입 시 갤러리 음식 사진 | 매 진입 | 낮음 (앱 내) |
| 3 | 식사 후 넛지 | 위치+시간 (식사 후 1~2시간) | 1일 1회 | 중간 (푸시) |
| 4 | 버블 초대 리마인드 | 버블 생성했지만 `member_count=1` (본인만) | 1일 1회 | 낮음 (앱 내) |
| 5 | 주간 리마인드 | 미사용 7일+ | 주 1회 | 중간 (푸시) |

### 넛지 피로 방지
- 하루 최대 푸시 1개
- 앱 내 카드 동시 1개만
- "건너뛰기" 3회 → 해당 넛지 2주 중단
- 23:00~08:00 푸시 없음

### 피로도 점수

```
푸시 전송: +3 | 앱 내 카드: +1 | 무시: +2 | "아니요": +1
기록 완료: -5 (리셋)
피로도 > 10 → 48시간 중단 | > 20 → 1주 중단 | 매일 -1 자연 감소
```

---

## 10. 기능 해금 (기록 수 기반)

> 아래는 설계 스펙. 현재 미구현.
> 여기서 "기록"은 `status='rated'` (사분면 보충 완료)인 records만 카운트.

| 기록 수 | 해금 | 사용자 경험 |
|---------|------|-----------|
| 0~2 | 기본 홈 + 미완성(checked) 기록 목록 | "금방 채워질 거야" |
| 3~5 | 사분면에 점 보이기 시작 | "내 취향이 보이네" |
| 5~10 | 재방문 추천 작동 | "다시 가볼까?" |
| 10~20 | 상황별 추천 작동 (상황 2종 이상, 각 3개+) | "오늘 데이트인데..." |
| 20+ | 사분면 패턴 명확 | "나는 이런 타입이구나" |
| 50+ | 정교한 추천 + 프로필 정체성 | "을지로 Lv.5" |

---

## 11. 성공 지표

> 아래는 설계 스펙. 현재 미구현.

| 지표 | 목표 |
|------|------|
| 온보딩 완료율 (가입 → Step 3 완료) | > 80% |
| D1 리텐션 | > 40% |
| D7 리텐션 | > 25% |
| 첫 기록 보충 전환 (7일 내 checked → rated) | > 60% |
| D30 기록 수 (rated) | >= 10 |
| 넛지→기록 전환 | > 15% |
| 버블 생성율 (온보딩 중 1개+) | > 70% |
| 버블 초대 전환율 (초대 링크 생성) | > 30% |

---

## 12. 파일 구조 요약

```
src/
├── app/
│   ├── auth/
│   │   ├── login/page.tsx                          # 로그인 페이지 → LoginContainer
│   │   └── callback/route.ts                       # OAuth 콜백 (프로필 생성 + 홈 리다이렉트)
│   └── onboarding/page.tsx                         # 온보딩 페이지 → OnboardingContainer
├── domain/
│   ├── entities/onboarding.ts                      # 타입: OnboardingScreen, OnboardingState, OnboardingSeedRestaurant, OnboardingBubbleTemplate, OnboardingSeedBubble, OnboardingArea
│   ├── repositories/onboarding-repository.ts       # 인터페이스: OnboardingRepository
│   └── services/onboarding-xp.ts                   # XP 계산: ONBOARDING_COMPLETION_XP, calculateOnboardingBubbleXp, calculateOnboardingRegisterXp
├── infrastructure/
│   └── repositories/supabase-onboarding-repository.ts  # Supabase 구현체 (lists, bubbles, users 테이블)
├── application/
│   └── hooks/
│       ├── use-onboarding.ts                       # 전체 상태 관리 (미사용)
│       ├── use-onboarding-restaurants.ts            # 식당 DB 연동 (미사용)
│       └── use-onboarding-bubbles.ts               # 버블 DB 연동 (미사용)
├── presentation/
│   ├── containers/
│   │   ├── onboarding-container.tsx                 # 메인 오케스트레이터 (로컬 상태 관리)
│   │   └── login-container.tsx                     # 로그인 페이지
│   └── components/
│       ├── onboarding/
│       │   ├── onboarding-intro.tsx                 # 인트로 화면
│       │   ├── restaurant-register-step.tsx          # Step 1: 맛집 등록
│       │   ├── bubble-create-step.tsx               # Step 2: 버블 생성
│       │   ├── bubble-explore-step.tsx              # Step 3: 버블 탐색
│       │   ├── area-select.tsx                      # 지역 필 선택
│       │   ├── onboarding-search.tsx                # 검색 인풋
│       │   ├── onboarding-progress.tsx              # 진행 바
│       │   ├── xp-popup.tsx                        # XP 팝업 (미사용)
│       │   └── bubble-explore-popup.tsx             # 버블 상세 바텀시트 (미사용)
│       ├── auth/
│       │   └── login-buttons.tsx                   # 소셜 로그인 버튼 (4종)
│       └── layout/
│           ├── fab-back.tsx                        # 뒤로 FAB
│           └── fab-forward.tsx                     # 앞으로 FAB
└── shared/
    └── constants/
        └── onboarding-seeds.ts                     # 시드 데이터: BUBBLE_TEMPLATES, SEED_BUBBLES, SEED_RESTAURANTS
```
