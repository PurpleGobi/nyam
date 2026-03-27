# 1.6: 클린 아키텍처 폴더 구조 + 기본 레이아웃

> CLAUDE.md의 클린 아키텍처 규칙에 따라 전체 폴더 구조를 생성하고, 모바일 퍼스트 기본 레이아웃을 구현한다.

## SSOT 출처

| 문서 | 참조 섹션 |
|------|----------|
| `CLAUDE.md` | Clean Architecture 섹션, src/ 폴더 구조, DI 패턴 |
| `systems/DESIGN_SYSTEM.md` | §0 Brand (nyam 로고), §1 컬러 토큰, §2 타이포그래피, §7 Fixed Header |
| `implementation/shared/CLEAN_ARCH_PATTERN.md` | 레이어별 규칙, DI 패턴, 파일 네이밍 |
| `implementation/shared/CONVENTIONS.md` | 네이밍 규칙, Import 규칙, 디자인 토큰 사용 |

## 선행 조건

- [ ] 1.1 프로젝트 초기화 완료 (Next.js + TypeScript + Tailwind + shadcn/ui)
- [ ] 1.5 디자인 토큰 설정 완료 (globals.css에 CSS 변수 정의됨)

---

## 구현 범위

### 생성할 파일/폴더 목록

| 파일 경로 | 역할 | 레이어 |
|----------|------|--------|
| `src/domain/entities/.gitkeep` | 엔티티 타입/인터페이스 폴더 | domain |
| `src/domain/repositories/.gitkeep` | 리포지토리 인터페이스 폴더 | domain |
| `src/domain/services/.gitkeep` | 순수 비즈니스 로직 폴더 | domain |
| `src/infrastructure/repositories/.gitkeep` | Supabase 구현체 폴더 | infrastructure |
| `src/infrastructure/api/.gitkeep` | 외부 API 클라이언트 폴더 (카카오맵, 네이버, 구글 Places, Gemini) | infrastructure |
| `src/infrastructure/supabase/client.ts` | Supabase 브라우저 클라이언트 (1.4에서 이미 생성) | infrastructure |
| `src/infrastructure/supabase/server.ts` | Supabase 서버 클라이언트 (1.4에서 이미 생성) | infrastructure |
| `src/infrastructure/supabase/types.ts` | Supabase 자동생성 타입 (1.4에서 이미 생성) | infrastructure |
| `src/application/hooks/.gitkeep` | 비즈니스 로직 hooks 폴더 | application |
| `src/presentation/components/.gitkeep` | 순수 UI 컴포넌트 폴더 (props만) | presentation |
| `src/presentation/containers/.gitkeep` | hook + component 조합 폴더 (스타일 금지) | presentation |
| `src/presentation/hooks/.gitkeep` | UI 상태 전용 hooks 폴더 | presentation |
| `src/presentation/providers/.gitkeep` | React Context providers 폴더 | presentation |
| `src/shared/di/container.ts` | DI 조합 루트 (composition root) | shared |
| `src/shared/utils/cn.ts` | clsx + tailwind-merge 유틸 | shared |
| `src/shared/constants/.gitkeep` | 상수 폴더 | shared |
| `src/app/(main)/layout.tsx` | 메인 레이아웃 (Pretendard + Comfortaa + 모바일 퍼스트) | app |
| `src/app/(main)/page.tsx` | 홈 임시 페이지 (S5에서 완성) | app |

### 생성하지 않는 것

- 개별 페이지 컴포넌트 (S2~S9에서 각 스프린트에 맞춰 생성)
- 앱 셸 완성판 (헤더/FAB 포함 — S5에서 완성)
- 하단 네비게이션 (이 앱은 헤더 기반 네비게이션)
- `src/app/auth/` 페이지 (1.4에서 이미 생성)
- `src/app/onboarding/` (S9에서 구현)

---

## 상세 구현 지침

### 1단계: 폴더 생성

터미널에서 아래 명령을 실행하여 모든 폴더를 한 번에 생성한다.

```bash
# domain 레이어
mkdir -p src/domain/entities
mkdir -p src/domain/repositories
mkdir -p src/domain/services

# infrastructure 레이어
mkdir -p src/infrastructure/repositories
mkdir -p src/infrastructure/api
mkdir -p src/infrastructure/supabase

# application 레이어
mkdir -p src/application/hooks

# presentation 레이어
mkdir -p src/presentation/components
mkdir -p src/presentation/containers
mkdir -p src/presentation/hooks
mkdir -p src/presentation/providers

# shared 레이어
mkdir -p src/shared/di
mkdir -p src/shared/utils
mkdir -p src/shared/constants

# app 레이어
mkdir -p src/app/\(main\)
mkdir -p src/app/api
mkdir -p src/app/onboarding
```

### 2단계: .gitkeep 파일 생성

빈 폴더가 Git에서 추적되도록 `.gitkeep` 파일을 추가한다.

```bash
touch src/domain/entities/.gitkeep
touch src/domain/repositories/.gitkeep
touch src/domain/services/.gitkeep
touch src/infrastructure/repositories/.gitkeep
touch src/infrastructure/api/.gitkeep
touch src/application/hooks/.gitkeep
touch src/presentation/components/.gitkeep
touch src/presentation/containers/.gitkeep
touch src/presentation/hooks/.gitkeep
touch src/presentation/providers/.gitkeep
touch src/shared/constants/.gitkeep
```

---

### 3단계: `src/shared/utils/cn.ts`

```typescript
import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

**의존성**: `clsx`와 `tailwind-merge`는 1.1 프로젝트 초기화에서 shadcn/ui 설치 시 함께 설치됨. 설치 여부 확인:

```bash
pnpm list clsx tailwind-merge
```

미설치 시:

```bash
pnpm add clsx tailwind-merge
```

---

### 4단계: `src/shared/di/container.ts`

```typescript
// shared/di/container.ts — 조합 루트
// 1.4(인증)에서 supabaseClient를 여기에 등록한다.
// 이후 스프린트에서 repository 구현체를 추가 등록한다.
// 이 파일은 유일하게 infrastructure를 import하는 곳이다.

// 1.4 인증 완료 후:
// import { createClient } from '@/infrastructure/supabase/client'
// export const supabaseClient = createClient()

export {}  // 1.1 시점에서는 빈 상태, 1.4에서 채워짐
```

---

### 5단계: `src/app/layout.tsx` (루트 레이아웃)

> **주의**: `app/layout.tsx`는 1.4(auth)에서 AuthProvider 래핑을 포함하여 정의되므로, 이 태스크에서는 `app/(main)/layout.tsx`만 정의한다. `app/layout.tsx`는 1.4의 정의를 따른다. 아래는 1.4에서 정의되지 않은 폰트/viewport 설정이 포함되어야 할 참조용 내용이며, 최종 형태는 1.4의 AuthProvider 래핑과 병합하여 사용한다.

```typescript
import type { Metadata, Viewport } from 'next'
import '@/app/globals.css'

export const metadata: Metadata = {
  title: 'nyam',
  description: '나만의 맛 기록',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko">
      <body className="bg-background text-foreground antialiased">
        {children}
      </body>
    </html>
  )
}
```

**폰트 로드 방식**: CDN import (1.1 프로젝트 초기화에서 정의된 정규 방식)

Pretendard Variable과 Comfortaa는 `globals.css`의 `@import url(...)` 구문으로 CDN에서 로드한다 (1.5 디자인 토큰에서 설정). `next/font/local`이나 `next/font/google`은 사용하지 않는다. `globals.css`의 `--font` CSS 변수에 이미 Pretendard Variable이 포함되어 있으므로 추가 설정이 불필요하다.

Tailwind v4에서는 `tailwind.config.ts`를 사용하지 않으므로, 폰트 관련 Tailwind 설정도 별도로 필요하지 않다.

---

### 6단계: `src/app/(main)/layout.tsx` (메인 레이아웃)

```typescript
export default function MainLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      {/* 임시 헤더 — S5에서 앱 셸로 교체 */}
      <header className="sticky top-0 z-40 flex h-[52px] items-center justify-center border-b border-border bg-background/95 backdrop-blur-sm">
        <h1 className="logo-gradient font-comfortaa text-[22px] font-bold leading-none tracking-[-0.5px]">
          nyam
        </h1>
      </header>

      {/* 메인 콘텐츠 영역 */}
      <main className="mx-auto w-full max-w-[430px] flex-1 px-4 pb-6 pt-4">
        {children}
      </main>
    </div>
  )
}
```

**설계 근거**:

| 항목 | 값 | 출처 |
|------|-----|------|
| 배경색 | `bg-background` → CSS 변수 `--bg` (#F8F6F3) | DESIGN_SYSTEM.md §1 Surface |
| 로고 폰트 | `font-comfortaa`, 22px, 700, letter-spacing -0.5px | DESIGN_SYSTEM.md §0 앱 헤더 크기 |
| 로고 그라데이션 (라이트) | `linear-gradient(135deg, #FF6038, #8B7396)` | DESIGN_SYSTEM.md §0 |
| 헤더 높이 | 52px | DESIGN_SYSTEM.md §7 Fixed Header 기준 |
| 헤더 보더 | `border-border` → CSS 변수 `--border` (#E8E4DF) | DESIGN_SYSTEM.md §1 Border |
| 최대 너비 | 430px (iPhone 14 Pro Max 기준) | 모바일 퍼스트 원칙 |
| 좌우 패딩 | 16px (`px-4`) | 모바일 퍼스트 기본 패딩 |
| 높이 | `min-h-dvh` (dynamic viewport height — 모바일 브라우저 주소창 대응) | 모바일 퍼스트 |

**다크모드 로고 그라데이션**: CSS 변수 `--brand`와 `--accent-wine`은 그라데이션의 양 끝 색상이 아니라 단일 accent 용도이므로, 로고 그라데이션에는 `.logo-gradient` CSS 클래스를 사용하고 다크모드에서 별도 보정한다.

```css
/* globals.css 또는 로고 전용 스타일 */
/* Light mode */
.logo-gradient {
  background: linear-gradient(135deg, #FF6038, #8B7396);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
/* Dark mode */
[data-theme="dark"] .logo-gradient {
  background: linear-gradient(135deg, #FF8060, #B8A0C8);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
```

---

### 7단계: `src/app/(main)/page.tsx` (홈 임시 페이지)

```typescript
export default function HomePage() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-20">
      <p className="text-lg font-semibold text-foreground">
        홈 페이지
      </p>
      <p className="text-sm text-muted-foreground">
        S5에서 구현 예정
      </p>
    </div>
  )
}
```

---

### 8. 루트 페이지 (`src/app/page.tsx`)

`src/app/page.tsx`는 1.1(프로젝트 초기화)에서 생성된 임시 페이지를 유지한다. S5(홈)에서 교체된다.

---

## 최종 폴더 구조 검증

```
src/
├── app/
│   ├── (main)/
│   │   ├── layout.tsx        ← 메인 레이아웃 (이 태스크)
│   │   └── page.tsx          ← 홈 임시 (이 태스크)
│   ├── auth/
│   │   ├── login/
│   │   │   └── page.tsx      ← (1.4에서 생성)
│   │   └── callback/
│   │       └── route.ts      ← (1.4에서 생성)
│   ├── onboarding/           ← (S9에서 구현, 폴더만)
│   ├── api/                  ← (API Routes, 필요 시 생성)
│   ├── layout.tsx            ← 루트 레이아웃 (1.1 또는 1.5에서 생성, 이 태스크에서 보강)
│   └── globals.css           ← (1.5에서 생성)
├── presentation/
│   ├── components/.gitkeep
│   ├── containers/.gitkeep
│   ├── hooks/.gitkeep
│   └── providers/.gitkeep
├── application/
│   └── hooks/.gitkeep
├── domain/
│   ├── entities/.gitkeep
│   ├── repositories/.gitkeep
│   └── services/.gitkeep
├── infrastructure/
│   ├── repositories/.gitkeep
│   ├── api/.gitkeep
│   └── supabase/
│       ├── client.ts         ← (1.4에서 생성)
│       ├── server.ts         ← (1.4에서 생성)
│       └── types.ts          ← (1.4에서 생성)
├── shared/
│   ├── di/
│   │   └── container.ts      ← DI 조합 루트 (이 태스크)
│   ├── utils/
│   │   └── cn.ts             ← clsx+twMerge (이 태스크)
│   └── constants/.gitkeep
```

---

## 레이어 의존성 규칙 (R1~R5) 재확인

| 규칙 | 설명 | 위반 예시 | 검증 명령어 |
|------|------|----------|-----------|
| **R1** | domain은 외부 의존 0. React, Supabase, Next.js import 금지 | `import { useEffect } from 'react'` in domain/ | `grep -r "from 'react\|from '@supabase\|from 'next" src/domain/` |
| **R2** | infrastructure/repositories/는 domain 인터페이스를 `implements`로 구현 | `class Repo { ... }` (implements 없이) | `grep -rL "implements" src/infrastructure/repositories/` (`.gitkeep`만 나오면 통과) |
| **R3** | application은 domain 인터페이스에만 의존. infrastructure 구현체 직접 import 금지 | `import { SupabaseRepo } from '@/infrastructure/...'` | `grep -r "from '.*infrastructure" src/application/` |
| **R4** | presentation에서 Supabase/infrastructure 직접 import 금지. shared/di에서 받음 | `import { supabase } from '@/infrastructure/supabase/client'` | `grep -r "from '@supabase\|from '.*infrastructure" src/presentation/` |
| **R5** | app/ page.tsx는 Container 렌더링만. 비즈니스 로직 금지 | `const data = await supabase.from(...)` in page.tsx | 수동 확인 |

---

## 모바일 퍼스트 레이아웃 규칙

### viewport 메타

`src/app/layout.tsx`의 `export const viewport`에서 설정:

```typescript
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,        // 핀치 줌 방지 (앱 느낌)
  userScalable: false,     // 사용자 확대 비활성
}
```

### 터치 타겟 규칙

모든 인터랙티브 요소(버튼, 링크, 아이콘 버튼)의 최소 크기: **44x44px**

```css
/* globals.css에 추가 (1.5에서 이미 설정되어 있을 수 있음) */
button, a, [role="button"] {
  min-height: 44px;
  min-width: 44px;
}
```

> Tailwind 유틸리티로 개별 적용: `min-h-[44px] min-w-[44px]`

### 기본 패딩

- 좌우 패딩: 16px (`px-4`)
- 메인 레이아웃의 `max-w-[430px]`으로 데스크톱에서도 모바일 비율 유지

### 360px 깨짐 방지 규칙

- `width: 100%` 대신 `w-full` 사용
- 고정 너비 (`w-[300px]`) 지양, `max-w-full` 병행
- 긴 텍스트: `truncate` 또는 `line-clamp-2` 사용
- 이미지: `object-cover`와 `aspect-ratio` 조합
- flex: `flex-wrap` 또는 `flex-shrink-0`으로 오버플로우 방지

---

## 검증 체크리스트

- [ ] 모든 폴더 존재 확인: `ls -R src/` 실행하여 위 구조와 일치
- [ ] `pnpm build` 에러 없음
- [ ] `pnpm lint` 경고 0개
- [ ] `localhost:7911` 접속 시 "nyam" 로고가 헤더에 표시됨
- [ ] 로고가 Comfortaa 폰트이며 `#FF6038` → `#8B7396` 그라데이션 적용됨
- [ ] 본문이 Pretendard Variable 폰트로 렌더링됨
- [ ] 배경색이 `#F8F6F3` (크림)으로 적용됨
- [ ] 360px 뷰포트에서 레이아웃 깨짐 없음 (Chrome DevTools → 360x640)
- [ ] `grep -r "from 'react" src/domain/` → 결과 없음 (R1)
- [ ] `grep -r "from '.*infrastructure" src/application/` → 결과 없음 (R3)
- [ ] `grep -r "from '@supabase" src/presentation/` → 결과 없음 (R4)
- [ ] `shared/di/container.ts` 파일 존재하며 빈 export (`export {}`)
- [ ] `shared/utils/cn.ts` 파일 존재하며 `cn()` 함수 export
- [ ] `any`, `as any`, `@ts-ignore` 사용 0건: `grep -r "as any\|@ts-ignore\|: any" src/`
- [ ] `console.log` 사용 0건: `grep -r "console.log" src/`
- [ ] 하드코딩 컬러 사용 0건: `grep -r "bg-white\|bg-black\|text-white\|text-black" src/app/ src/presentation/`
