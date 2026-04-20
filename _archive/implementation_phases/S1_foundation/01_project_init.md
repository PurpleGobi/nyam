# 1.1: 프로젝트 초기화

> Next.js App Router + TypeScript strict + Tailwind v4 + shadcn/ui + Supabase 프로젝트 생성

---

## SSOT 출처

| 문서 | 참조 섹션 |
|------|----------|
| `00_PRD.md` | 7 기술 스택 |
| `systems/DESIGN_SYSTEM.md` | 0 Brand & 로고, 1 컬러 토큰, 2 타이포그래피 |
| `CLAUDE.md` | 기술 스택, Clean Architecture |

## 선행 조건

- [ ] Node.js 20+ 설치 확인 (`node -v`)
- [ ] pnpm 설치 확인 (`pnpm -v`)
- [ ] Supabase 프로젝트 생성 완료 (대시보드에서 Project URL + anon key + service_role key 확보)
- [ ] Supabase CLI 설치 (`brew install supabase/tap/supabase` 또는 `npm i -g supabase`)

## 구현 범위

### 생성할 파일 목록

| 파일 경로 | 역할 |
|----------|------|
| `package.json` | 의존성 + 스크립트 정의 |
| `tsconfig.json` | TypeScript strict 설정 |
| `next.config.ts` | Next.js App Router 설정 (port 7911) |
| `postcss.config.mjs` | PostCSS (Tailwind v4) |
| `.env.local` | Supabase 환경변수 (gitignore 대상) |
| `.gitignore` | Git 무시 파일 |
| `src/app/layout.tsx` | 루트 레이아웃 (Pretendard Variable + Comfortaa 폰트) |
| `src/app/globals.css` | Tailwind directives + 폰트 import + CSS 변수 초기화 |
| ~~`src/app/page.tsx`~~ | ~~루트 페이지 (임시)~~ — 현재 존재하지 않음. `(main)/page.tsx`가 홈 담당 |
| `src/shared/utils/cn.ts` | clsx + tailwind-merge 유틸 |
| `components.json` | shadcn/ui 설정 |

### 생성하지 않는 것

- DB 스키마 (1.2에서)
- RLS 정책 (1.3에서)
- Supabase Auth 설정 (1.4에서)
- 디자인 토큰 CSS 변수 전체 (1.5에서)
- Clean Architecture 폴더 구조 (1.6에서)

---

## 상세 구현 지침

### 1. 프로젝트 생성

```bash
pnpm create next-app@latest nyam --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-pnpm
cd nyam
```

### 2. package.json 핵심 의존성

```json
{
  "name": "nyam",
  "version": "0.2.0",
  "private": true,
  "scripts": {
    "dev": "next dev --port 7911",
    "build": "next build --webpack",
    "start": "next start -p 7911",
    "lint": "eslint"
  },
  "dependencies": {
    "@base-ui/react": "^1.3.0",
    "@ducanh2912/next-pwa": "^10.2.9",
    "@supabase/ssr": "^0.9.0",
    "@supabase/supabase-js": "^2.99.1",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "html-to-image": "^1.11.13",
    "lucide-react": "^0.577.0",
    "next": "16.1.6",
    "radix-ui": "^1.4.3",
    "react": "19.2.3",
    "react-dom": "19.2.3",
    "server-only": "^0.0.1",
    "shadcn": "^4.0.7",
    "sonner": "^2.0.7",
    "swr": "^2.4.1",
    "tailwind-merge": "^3.5.0",
    "tw-animate-css": "^1.4.0"
  },
  "devDependencies": {
    "@eslint/eslintrc": "^3.3.5",
    "@playwright/test": "^1.58.2",
    "@tailwindcss/postcss": "^4",
    "@types/node": "^20",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "@typescript-eslint/eslint-plugin": "^8.57.2",
    "@typescript-eslint/parser": "^8.57.2",
    "eslint": "^9",
    "eslint-config-next": "16.1.6",
    "supabase": "^2",
    "tailwindcss": "^4",
    "typescript": "^5"
  }
}
```

실행:
```bash
pnpm install
```

### 3. tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "react-jsx",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts", ".next/dev/types/**/*.ts"],
  "exclude": ["node_modules", "supabase/functions"]
}
```

규칙:
- `strict: true` 필수
- `any` 타입 사용 금지 (컨벤션)
- `@/*` 절대 경로 사용

### 4. next.config.ts

```typescript
import type { NextConfig } from 'next'

const isDev = process.env.NODE_ENV === 'development'

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
    ],
    unoptimized: isDev,
  },
}

export default nextConfig
```

### 5. postcss.config.mjs

```javascript
/** @type {import('postcss-load-config').Config} */
const config = {
  plugins: {
    '@tailwindcss/postcss': {},
  },
}

export default config
```

### 6. .env.local

```
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY
```

주의사항:
- `SUPABASE_SERVICE_ROLE_KEY`는 서버 전용. 클라이언트 코드에서 절대 import 금지
- `NEXT_PUBLIC_` 접두사가 있는 키만 클라이언트에 노출
- `.env.local`은 `.gitignore`에 반드시 포함

### 7. .gitignore

```gitignore
# dependencies
/node_modules
/.pnp
.pnp.js
.yarn/install-state.gz

# testing
/coverage

# next.js
/.next/
/out/

# production
/build

# misc
.DS_Store
*.pem

# debug
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# env files
.env*.local

# vercel
.vercel

# typescript
*.tsbuildinfo
next-env.d.ts

# supabase
supabase/.temp/
```

### 8. 폰트 설정

> **참고**: 아래는 1.1 시점의 최소 구현이다. 전체 디자인 토큰은 1.5(05_design_tokens.md)에서 추가된다.

#### src/app/globals.css (1.1 최소 버전)

```css
/* Pretendard Variable — 본문 전체 */
@import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css');

/* Comfortaa — 로고 전용 */
@import url('https://fonts.googleapis.com/css2?family=Comfortaa:wght@700&display=swap');

@import "tailwindcss";

/* 폰트 CSS 변수 */
:root {
  --font: 'Pretendard Variable', -apple-system, BlinkMacSystemFont, 'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif;
  --font-logo: 'Comfortaa', cursive;
}

/* 기본 폰트 적용 */
html {
  font-family: var(--font);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
```

#### src/app/layout.tsx

> **참고**: 최종 형태는 1.4(인증)에서 `AuthProvider`와 `ToastProvider` 래핑이 추가된다. 아래는 1.1 시점의 최소 구현이며, 1.4 완료 후 최종 형태는 04_auth.md §11 참조.

```tsx
import type { Metadata, Viewport } from 'next'
import './globals.css'

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
    <html lang="ko" suppressHydrationWarning>
      <body className="font-sans bg-background text-foreground antialiased">
        {children}
      </body>
    </html>
  )
}
```

### 9. 루트 페이지

> **현재 상태**: `src/app/page.tsx`는 존재하지 않는다. 루트 `/` 경로는 `src/app/(main)/page.tsx`가 담당하며 (1.6에서 생성), middleware가 미인증 사용자를 `/auth/login`으로 리다이렉트한다.

### 10. cn 유틸리티

#### src/shared/utils/cn.ts

```typescript
import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

### 11. shadcn/ui 초기화

```bash
pnpm dlx shadcn@latest init
```

초기화 시 선택:
- Style: New York
- Base color: Neutral
- CSS variables: Yes
- `components.json` 자동 생성

생성 후 `components.json`의 `aliases.utils` 값을 확인하고, `@/shared/utils/cn`으로 변경:

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "new-york",
  "rsc": true,
  "tsx": true,
  "tailwind": {
    "config": "",
    "css": "src/app/globals.css",
    "baseColor": "neutral",
    "cssVariables": true
  },
  "aliases": {
    "components": "@/presentation/components/ui",
    "utils": "@/shared/utils/cn",
    "ui": "@/presentation/components/ui",
    "lib": "@/shared/utils",
    "hooks": "@/presentation/hooks"
  },
  "iconLibrary": "lucide"
}
```

### 12. Supabase 로컬 초기화

```bash
supabase init
```

이 명령은 `supabase/` 디렉토리와 `supabase/config.toml`을 생성한다.

### 13. ESLint 설정

`eslint.config.mjs`:

```javascript
import nextConfig from 'eslint-config-next'

const eslintConfig = [
  ...nextConfig.map((config) => {
    if (config.plugins?.['@typescript-eslint']) {
      return {
        ...config,
        rules: {
          ...config.rules,
          'no-console': 'error',
          '@typescript-eslint/no-explicit-any': 'error',
        },
      }
    }
    return config
  }),
]

export default eslintConfig
```

---

## 검증 체크리스트

- [ ] `pnpm install` 성공 (에러 없음)
- [ ] `pnpm dev` 실행 후 http://localhost:7911 접속 가능
- [ ] 브라우저에서 "nyam" 로고가 Comfortaa 폰트로 표시됨 (그라데이션 적용)
- [ ] 브라우저에서 "프로젝트 초기화 완료" 텍스트가 Pretendard 폰트로 표시됨
- [ ] `pnpm build` 에러 없음
- [ ] `pnpm lint` 경고 0개
- [ ] `tsconfig.json`에 `"strict": true` 확인
- [ ] `.env.local`이 `.gitignore`에 포함 확인
- [ ] `supabase/` 디렉토리 생성 확인
- [ ] `components.json` 생성 확인
- [ ] `src/shared/utils/cn.ts` 존재 확인
- [ ] `no-console` ESLint 규칙 error 레벨 확인
- [ ] `@typescript-eslint/no-explicit-any` ESLint 규칙 error 레벨 확인
