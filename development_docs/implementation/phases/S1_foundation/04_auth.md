# 1.4: 소셜 인증 (구글/카카오/네이버/애플)

> AUTH.md의 소셜 로그인 4종을 Supabase Auth로 구현한다.

## SSOT 출처

| 문서 | 참조 섹션 |
|------|----------|
| `systems/AUTH.md` | §1 인증 |
| `systems/DATA_MODEL.md` | users 테이블 (`auth_provider`, `auth_provider_id`, `nickname`) |
| `systems/DESIGN_SYSTEM.md` | §7 소셜 로그인 버튼 스타일 |

## 선행 조건

- [ ] 1.1 프로젝트 초기화 완료 (Next.js + TypeScript + Tailwind + shadcn/ui)
- [ ] 1.2 DB 스키마 마이그레이션 완료 (users 테이블 존재)
- [ ] Supabase 대시보드에서 Google OAuth 클라이언트 ID/Secret 등록
- [ ] Supabase 대시보드에서 Kakao REST API 키 등록
- [ ] Supabase 대시보드에서 Naver 클라이언트 ID/Secret 등록
- [ ] Supabase 대시보드에서 Apple 서비스 ID/키 파일 등록

## 구현 범위

### 생성할 파일 목록

| 파일 경로 | 역할 | 레이어 |
|----------|------|--------|
| `src/infrastructure/supabase/client.ts` | 브라우저 Supabase 클라이언트 | infrastructure |
| `src/infrastructure/supabase/server.ts` | 서버 Supabase 클라이언트 (쿠키 기반) | infrastructure |
| `src/domain/entities/user.ts` | User 엔티티 타입 정의 | domain |
| `src/domain/entities/auth.ts` | AuthProvider, AuthUser, AuthSession 타입 정의 | domain |
| `src/infrastructure/supabase/auth-mapper.ts` | Supabase → domain 타입 매퍼 | infrastructure |
| `src/shared/di/auth-mappers.ts` | auth-mapper re-export (조합 루트) | shared/di |
| `src/application/hooks/use-auth-actions.ts` | signInWithOAuth, signOut 비즈니스 로직 | application |
| `src/app/auth/login/page.tsx` | 로그인 페이지 (Suspense + LoginContainer, R5) | app |
| `src/app/auth/callback/route.ts` | OAuth 콜백 핸들러 (code → session 교환 + 프로필 자동 생성) | app |
| `src/middleware.ts` | 세션 리프레시 + 보호 라우트 리다이렉트 | app |
| `src/presentation/containers/login-container.tsx` | 로그인 페이지 컨테이너 (use-auth 훅 + LoginButtons + redirect 처리) | presentation |
| `src/presentation/providers/auth-provider.tsx` | 인증 상태 React Context (shared/di 경유) | presentation |
| `src/presentation/guards/auth-guard.tsx` | 인증 가드 (미인증 시 로그인 리다이렉트) | presentation |
| `src/presentation/components/ui/toast.tsx` | Toast 알림 프로바이더 | presentation |
| `supabase/migrations/013_auth_trigger.sql` | auth.users → public.users 자동 INSERT 트리거 | DB |

### 생성하지 않는 것

- 약관 동의 화면 → S9 온보딩에서 구현
- 프로필 수정 → S6에서 구현
- 회원 탈퇴 → S6 설정에서 구현
- 온보딩 플로우 → S9에서 구현

---

## 상세 구현 지침

### 1. Supabase Auth 대시보드 설정

각 OAuth Provider별 Supabase 대시보드 설정 (Authentication → Providers).

#### Google

| 항목 | 값 |
|------|-----|
| Enabled | true |
| Client ID | Google Cloud Console에서 발급 |
| Client Secret | Google Cloud Console에서 발급 |
| Redirect URL | `https://<project-ref>.supabase.co/auth/v1/callback` |
| Authorized redirect URIs (Google 측) | Supabase Redirect URL 등록 |

#### Kakao

| 항목 | 값 |
|------|-----|
| Enabled | true |
| Client ID | 카카오 디벨로퍼스 REST API 키 |
| Client Secret | 카카오 디벨로퍼스 Client Secret |
| Redirect URL | `https://<project-ref>.supabase.co/auth/v1/callback` |
| 카카오 측 설정 | 플랫폼 → 웹 → 사이트 도메인 등록 + Redirect URI 등록 |

#### Naver

| 항목 | 값 |
|------|-----|
| Enabled | true |
| Client ID | 네이버 디벨로퍼스 Client ID |
| Client Secret | 네이버 디벨로퍼스 Client Secret |
| Redirect URL | `https://<project-ref>.supabase.co/auth/v1/callback` |
| 네이버 측 설정 | 애플리케이션 → API 설정 → Callback URL 등록 |

#### Apple

| 항목 | 값 |
|------|-----|
| Enabled | true |
| Client ID | Apple 서비스 ID (com.xxx.nyam) |
| Secret Key | Apple 개발자 콘솔에서 생성한 .p8 키 파일 내용 |
| Key ID | Apple 키 ID |
| Team ID | Apple 팀 ID |
| Redirect URL | `https://<project-ref>.supabase.co/auth/v1/callback` |

### 2. 환경 변수

`.env.local` 파일 (클라이언트 노출 가능한 값만 `NEXT_PUBLIC_` 접두사):

```env
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
```

서버 전용 (절대 클라이언트 노출 금지):

```env
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
```

### 3. `src/domain/entities/user.ts`

```typescript
// AuthProvider는 domain/entities/auth.ts에서 정의 (canonical source)
import type { AuthProvider } from './auth'

export type PrivacyProfile = 'public' | 'bubble_only' | 'private'
export type PrivacyRecords = 'all' | 'shared_only'

export interface User {
  id: string
  email: string | null
  nickname: string
  handle: string | null
  avatar_url: string | null
  avatar_color: string | null
  bio: string | null
  taste_summary: string | null
  taste_tags: string[] | null
  taste_updated_at: string | null
  preferred_areas: string[] | null
  privacy_profile: PrivacyProfile
  privacy_records: PrivacyRecords
  visibility_public: VisibilityConfig
  visibility_bubble: VisibilityConfig
  notify_push: boolean
  notify_level_up: boolean
  notify_bubble_join: boolean
  notify_follow: boolean
  dnd_start: string | null
  dnd_end: string | null
  pref_landing: 'last' | 'home' | 'bubbles' | 'profile'
  pref_home_tab: 'last' | 'restaurant' | 'wine'
  pref_restaurant_sub: 'last' | 'visited' | 'wishlist' | 'following'
  pref_wine_sub: 'last' | 'tasted' | 'wishlist' | 'cellar'
  pref_bubble_tab: 'last' | 'bubble' | 'bubbler'
  pref_view_mode: 'last' | 'card' | 'list' | 'calendar'
  pref_default_sort: 'latest' | 'score_high' | 'score_low' | 'name' | 'visit_count'
  pref_record_input: 'camera' | 'search'
  pref_bubble_share: 'ask' | 'auto' | 'never'
  pref_temp_unit: 'C' | 'F'
  deleted_at: string | null
  delete_mode: 'anonymize' | 'hard_delete' | null
  delete_scheduled_at: string | null
  record_count: number
  follower_count: number
  following_count: number
  current_streak: number
  total_xp: number
  active_xp: number
  active_verified: number
  auth_provider: AuthProvider
  auth_provider_id: string
  created_at: string
  updated_at: string
}

export interface VisibilityConfig {
  score: boolean
  comment: boolean
  photos: boolean
  level: boolean
  quadrant: boolean
  bubbles: boolean
  price: boolean
}
```

### 3-1. `src/domain/entities/auth.ts`

Domain 레이어에 인증 관련 타입을 정의한다. Supabase 타입을 직접 사용하지 않기 위한 추상화.

```typescript
export type AuthProvider = 'google' | 'kakao' | 'naver' | 'apple'

export interface AuthUser {
  id: string
  email: string | null
  nickname: string
  avatarUrl: string | null
  authProvider: AuthProvider
}

export interface AuthSession {
  user: AuthUser
  accessToken: string
  expiresAt: number | null
}
```

> **R1 준수**: domain 레이어에 외부 의존 없음. `@supabase/supabase-js` import 금지.

### 3-2. `src/infrastructure/supabase/auth-mapper.ts`

Supabase 타입을 domain 타입으로 변환하는 매퍼. infrastructure 레이어에서만 Supabase 타입을 사용한다.

```typescript
import type { User as SupabaseUser, Session as SupabaseSession } from '@supabase/supabase-js'
import type { AuthUser, AuthSession, AuthProvider } from '@/domain/entities/auth'

export function mapSupabaseUser(user: SupabaseUser): AuthUser {
  return {
    id: user.id,
    email: user.email ?? null,
    nickname: user.user_metadata?.full_name ?? user.email?.split('@')[0] ?? '사용자',
    avatarUrl: user.user_metadata?.avatar_url ?? null,
    authProvider: (user.app_metadata?.provider ?? 'google') as AuthProvider,
  }
}

export function mapSupabaseSession(session: SupabaseSession): AuthSession {
  return {
    user: mapSupabaseUser(session.user),
    accessToken: session.access_token,
    expiresAt: session.expires_at ?? null,
  }
}
```

### 4. `src/infrastructure/supabase/client.ts`

```typescript
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables')
  }

  return createBrowserClient(supabaseUrl, supabaseAnonKey)
}
```

> **lazy init**: 환경변수를 함수 내부에서 읽어 모듈 로드 시점의 에러를 방지한다.

### 5. `src/infrastructure/supabase/server.ts`

```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables')
  }

  const cookieStore = await cookies()

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          )
        } catch {
          // Server Component에서 호출 시 쿠키 설정 불가 — 무시
        }
      },
    },
  })
}
```

> **lazy init**: 환경변수를 함수 내부에서 읽어 모듈 로드 시점의 에러를 방지한다.

### 6. `src/middleware.ts`

```typescript
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const PUBLIC_ROUTES = ['/auth/login', '/auth/callback', '/onboarding', '/design-system', '/bubbles/invite']

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables')
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          )
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          )
        },
      },
    },
  )

  // 세션 리프레시 (만료된 토큰 갱신)
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname
  const isPublicRoute = PUBLIC_ROUTES.some((route) => pathname.startsWith(route))

  // 미인증 + 보호 라우트 → 로그인 페이지로 리다이렉트
  if (!user && !isPublicRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/auth/login'
    return NextResponse.redirect(url)
  }

  // 인증 완료 + 로그인 페이지 접근 → 홈으로 리다이렉트
  if (user && pathname === '/auth/login') {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * 다음 경로 제외:
     * - _next/static (정적 파일)
     * - _next/image (이미지 최적화)
     * - favicon.ico
     * - public 폴더 내 정적 에셋
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
```

### 7. `src/app/auth/callback/route.ts`

```typescript
import { createClient } from '@/infrastructure/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = '/'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      // 프로필 존재 확인 → 없으면 생성 (첫 가입)
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: existingProfile } = await supabase
          .from('users')
          .select('id')
          .eq('id', user.id)
          .single()

        if (!existingProfile) {
          const meta = user.user_metadata
          await supabase.from('users').insert({
            id: user.id,
            email: user.email,
            nickname: (meta?.name ?? meta?.full_name ?? meta?.preferred_username ?? '냠유저').slice(0, 20),
            avatar_url: meta?.avatar_url ?? null,
            auth_provider: user.app_metadata?.provider ?? 'google',
            auth_provider_id: user.app_metadata?.provider_id ?? user.id,
            privacy_profile: 'bubble_only',
            privacy_records: 'shared_only',
          })
        }
      }

      const forwardedHost = request.headers.get('x-forwarded-host')
      const isLocalEnv = process.env.NODE_ENV === 'development'

      if (isLocalEnv) {
        return NextResponse.redirect(`${origin}${next}`)
      } else if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${next}`)
      } else {
        return NextResponse.redirect(`${origin}${next}`)
      }
    }
  }

  return NextResponse.redirect(`${origin}/auth/login?error=callback_failed`)
}
```

> **프로필 자동 생성**: 13_auth_trigger.sql의 트리거와 별도로, 콜백에서도 프로필 존재 여부를 확인하고 없으면 생성한다. 트리거 실패 시 안전망 역할을 한다.

### 8. `src/app/auth/login/page.tsx`

```typescript
import { Suspense } from 'react'
import { LoginContainer } from '@/presentation/containers/login-container'

export default function LoginPage() {
  return (
    <Suspense>
      <LoginContainer />
    </Suspense>
  )
}
```

> **R5 준수**: page.tsx는 Container 렌더링만 수행한다. `Suspense`로 감싸는 이유는 LoginContainer 내부에서 `useSearchParams()`를 사용하기 때문이다 (Next.js App Router 요구사항). 서버 사이드 인증 체크는 `middleware.ts`에서 처리한다.

### 8-1. `src/presentation/containers/login-container.tsx`

```typescript
'use client'

import { useSearchParams } from 'next/navigation'
import { LoginButtons } from '@/presentation/components/auth/login-buttons'
import { useAuthActions } from '@/application/hooks/use-auth-actions'
import type { AuthProvider } from '@/domain/entities/auth'

export function LoginContainer() {
  const searchParams = useSearchParams()
  const redirectPath = searchParams.get('redirect')
  const { signInWithOAuth } = useAuthActions()

  const handleLogin = (provider: AuthProvider) => {
    signInWithOAuth(provider, redirectPath ?? undefined)
  }

  return (
    <div className="content-auth flex min-h-dvh flex-col items-center justify-center bg-background" style={{ padding: '60px 32px 40px' }}>
      <div style={{ height: '44px' }} />

      <h1
        className="logo-gradient"
        style={{ fontSize: '42px', fontWeight: 700, letterSpacing: '-1px', marginBottom: '10px' }}
      >
        nyam
      </h1>

      <p
        style={{
          fontSize: '14px',
          color: 'var(--text-sub)',
          textAlign: 'center',
          lineHeight: 1.6,
          marginBottom: '48px',
          minHeight: '2.4em',
        }}
      >
        낯선 별점 천 개보다, 믿을만한 한 명의 기록.
      </p>

      <div style={{ width: '100%', marginBottom: '32px' }}>
        <LoginButtons onLogin={handleLogin} />
      </div>

      <p style={{ fontSize: '11px', color: 'var(--text-hint)', textAlign: 'center', lineHeight: 1.6 }}>
        가입 시{' '}
        <a href="#" style={{ color: 'var(--text-sub)', textDecoration: 'underline', textUnderlineOffset: '2px' }}>
          이용약관
        </a>
        {' '}및{' '}
        <a href="#" style={{ color: 'var(--text-sub)', textDecoration: 'underline', textUnderlineOffset: '2px' }}>
          개인정보처리방침
        </a>
        에 동의합니다
      </p>
    </div>
  )
}
```

> **redirect 처리**: `useSearchParams()`로 `?redirect=` 쿼리를 읽어 로그인 후 원래 페이지로 돌아갈 수 있다. `Suspense` 래핑 필요 (page.tsx에서 처리).

### 8-2. `src/infrastructure/supabase/auth-service.ts`

OAuth 호출을 infrastructure 레이어에 캡슐화한다. `as never`로 타입 캐스트하여 `as any` 사용을 회피한다.

```typescript
import { createClient } from './client'
import type { AuthProvider } from '@/domain/entities/auth'

export async function signInWithProvider(provider: AuthProvider, redirectTo: string) {
  const client = createClient()
  const options: Record<string, unknown> = { redirectTo }

  if (provider === 'google') {
    options.queryParams = {
      access_type: 'offline',
      prompt: 'consent',
    }
  }

  return client.auth.signInWithOAuth({
    provider: provider as never, // infrastructure 레이어에서만 허용 — Supabase SDK에 'naver'/'kakao' 타입 없음
    options,
  })
}

export async function signOutUser() {
  const client = createClient()
  return client.auth.signOut()
}
```

> **타입 캐스트**: `as never`를 사용한다 (`as any` 금지). Supabase SDK 타입에 `'naver'`가 없으므로 이 지점에서만 타입 캐스트를 사용한다. 클라이언트는 함수 호출 시 생성하여 모듈 수준 싱글턴을 피한다 (lazy init).

### 8-3. `src/shared/di/container.ts`에 등록

```typescript
// shared/di/container.ts — 조합 루트
import { createClient } from '@/infrastructure/supabase/client'

export function getSupabaseClient() {
  return createClient()
}
export { signInWithProvider, signOutUser } from '@/infrastructure/supabase/auth-service'
```

> **lazy init**: `const supabaseClient = createClient()` 대신 `getSupabaseClient()` 함수를 export한다. 모듈 수준 싱글턴은 SSR 환경에서 요청 간 상태가 공유될 수 있으므로, 함수 호출 시 생성하는 방식이 더 안전하다.

### 8-4. `src/application/hooks/use-auth-actions.ts`

```typescript
import { signInWithProvider, signOutUser } from '@/shared/di/container'
import type { AuthProvider } from '@/domain/entities/auth'

export function useAuthActions() {
  const signInWithOAuth = async (provider: AuthProvider, nextPath?: string) => {
    const next = nextPath ?? '/'
    sessionStorage.setItem('auth_redirect_next', next)
    const redirectTo = `${window.location.origin}/auth/callback`
    const { error } = await signInWithProvider(provider, redirectTo)
    if (error) throw error
  }

  const signOut = async () => {
    await signOutUser()
  }

  return { signInWithOAuth, signOut }
}
```

> **R3 준수**: application 레이어는 shared/di/container를 통해 infrastructure 기능을 받으며, infrastructure를 직접 import하지 않는다.
> **redirect 지원**: `nextPath`를 `sessionStorage`에 저장하여 OAuth 콜백 후 원래 페이지로 돌아갈 수 있다.
> **네이밍**: `useAuthActions`는 인증 액션(signIn, signOut)을 담당하고, `useAuth`는 presentation의 AuthProvider에서 현재 사용자 상태를 반환한다.

### 9. `src/presentation/components/auth/login-buttons.tsx`

```typescript
'use client'

import type { AuthProvider } from '@/domain/entities/auth'

interface LoginButtonsProps {
  onLogin: (provider: AuthProvider) => void
}

interface SocialButtonConfig {
  provider: AuthProvider
  label: string
  bgColor: string
  textColor: string
  borderColor: string | null
  iconSvg: string
}

const SOCIAL_BUTTONS: SocialButtonConfig[] = [
  {
    provider: 'google',
    label: 'Google로 시작하기',
    bgColor: 'var(--bg-elevated)',
    textColor: 'var(--text)',
    borderColor: 'var(--border)',
    iconSvg: `<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M19.6 10.23c0-.68-.06-1.36-.17-2.01H10v3.8h5.38a4.6 4.6 0 0 1-2 3.02v2.5h3.24c1.89-1.74 2.98-4.3 2.98-7.31z" fill="#4285F4"/><path d="M10 20c2.7 0 4.96-.9 6.62-2.42l-3.24-2.5c-.9.6-2.04.95-3.38.95-2.6 0-4.8-1.76-5.59-4.12H1.07v2.58A9.99 9.99 0 0 0 10 20z" fill="#34A853"/><path d="M4.41 12.01A6.01 6.01 0 0 1 4.1 10c0-.7.12-1.37.31-2.01V5.41H1.07A9.99 9.99 0 0 0 0 10c0 1.61.39 3.14 1.07 4.49l3.34-2.48z" fill="#FBBC05"/><path d="M10 3.96c1.47 0 2.78.5 3.82 1.5l2.86-2.86C14.96.99 12.7 0 10 0A9.99 9.99 0 0 0 1.07 5.41l3.34 2.58C5.2 5.72 7.4 3.96 10 3.96z" fill="#EA4335"/></svg>`,
  },
  {
    provider: 'kakao',
    label: '카카오로 시작하기',
    bgColor: '#FEE500',
    textColor: '#3C1E1E',
    borderColor: null,
    iconSvg: `<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M10 3C5.58 3 2 5.79 2 9.21c0 2.17 1.45 4.07 3.63 5.17l-.93 3.39c-.08.28.25.51.49.35l4.05-2.68c.25.02.5.04.76.04 4.42 0 8-2.79 8-6.23S14.42 3 10 3z" fill="#3C1E1E"/></svg>`,
  },
  {
    provider: 'naver',
    label: '네이버로 시작하기',
    bgColor: '#03C75A',
    textColor: '#FFFFFF',
    borderColor: null,
    iconSvg: `<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M13.56 10.69 6.15 3H3v14h3.44V9.31L13.85 17H17V3h-3.44v7.69z" fill="#fff"/></svg>`,
  },
  {
    provider: 'apple',
    label: 'Apple로 시작하기',
    bgColor: '#1D1D1F',
    textColor: '#FFFFFF',
    borderColor: null,
    iconSvg: `<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M15.07 10.41c-.02-2.17 1.77-3.21 1.85-3.26-1.01-1.47-2.57-1.67-3.13-1.7-1.33-.14-2.6.79-3.27.79-.67 0-1.72-.77-2.82-.75-1.45.02-2.79.85-3.54 2.15-1.51 2.62-.39 6.52 1.09 8.65.72 1.04 1.58 2.21 2.71 2.17 1.09-.04 1.5-.7 2.81-.7 1.32 0 1.69.7 2.84.68 1.17-.02 1.91-1.06 2.62-2.11.83-1.21 1.17-2.38 1.19-2.44-.03-.01-2.28-.88-2.3-3.48h-.05zM12.95 3.82c.6-.73 1.01-1.73.9-2.74-.87.04-1.92.58-2.54 1.31-.56.65-1.05 1.68-.92 2.67.97.08 1.96-.49 2.56-1.24z" fill="#fff"/></svg>`,
  },
]

export function LoginButtons({ onLogin }: LoginButtonsProps) {
  return (
    <div className="flex w-full max-w-[320px] flex-col gap-3">
      {SOCIAL_BUTTONS.map((btn) => (
        <button
          key={btn.provider}
          onClick={() => onLogin(btn.provider)}
          className="flex h-[48px] w-full items-center justify-center gap-2 rounded-md text-body font-medium transition-opacity active:opacity-70"
          style={{
            backgroundColor: btn.bgColor,
            color: btn.textColor,
            border: btn.borderColor ? `1px solid ${btn.borderColor}` : 'none',
            borderRadius: '12px',
            fontSize: '15px',
            fontWeight: 500,
          }}
        >
          <span
            className="flex items-center justify-center"
            dangerouslySetInnerHTML={{ __html: btn.iconSvg }}
          />
          {btn.label}
        </button>
      ))}
    </div>
  )
}
```

**소셜 로그인 버튼 스타일 (DESIGN_SYSTEM.md §7 준수)**:

| Provider | 배경 | 텍스트 | 보더 | border-radius |
|----------|------|--------|------|---------------|
| 카카오 | `#FEE500` | `#3C1E1E` | 없음 | 12px (`--r-md`) |
| Google | `var(--bg-elevated)` = `#FFFFFF` | `var(--text)` = `#3D3833` | `var(--border)` = `#E8E4DF` | 12px (`--r-md`) |
| 네이버 | `#03C75A` | `#FFFFFF` | 없음 | 12px (`--r-md`) |
| Apple | `#1D1D1F` | `#FFFFFF` | 없음 | 12px (`--r-md`) |

### 10. `src/presentation/providers/auth-provider.tsx`

```typescript
'use client'

import { createContext, useContext, useEffect, useState, useRef, type ReactNode } from 'react'
import { getSupabaseClient } from '@/shared/di/container'
import { mapSupabaseUser, mapSupabaseSession } from '@/shared/di/auth-mappers'
import type { AuthUser, AuthSession } from '@/domain/entities/auth'

interface AuthContextValue {
  user: AuthUser | null
  session: AuthSession | null
  isLoading: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  session: null,
  isLoading: true,
  signOut: async () => {},
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [session, setSession] = useState<AuthSession | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const clientRef = useRef(getSupabaseClient())

  useEffect(() => {
    const client = clientRef.current

    const getInitialSession = async () => {
      const { data: { user: verifiedUser } } = await client.auth.getUser()
      if (verifiedUser) {
        const { data: { session: currentSession } } = await client.auth.getSession()
        if (currentSession) {
          setSession(mapSupabaseSession(currentSession))
          setUser(mapSupabaseUser(verifiedUser))
        }
      }
      setIsLoading(false)
    }

    getInitialSession()

    const { data: { subscription } } = client.auth.onAuthStateChange(
      (_event, newSession) => {
        if (newSession) {
          setSession(mapSupabaseSession(newSession))
          setUser(mapSupabaseUser(newSession.user))
        } else {
          setSession(null)
          setUser(null)
        }
        setIsLoading(false)
      },
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const handleSignOut = async () => {
    await clientRef.current.auth.signOut()
    setUser(null)
    setSession(null)
  }

  return (
    <AuthContext.Provider value={{ user, session, isLoading, signOut: handleSignOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  return context
}
```

> **R4 준수**: presentation 레이어는 `@supabase/supabase-js` 타입을 직접 import하지 않는다.
> Supabase → domain 타입 변환은 `shared/di/auth-mappers.ts`를 통해 수행한다.
> `shared/di/auth-mappers.ts`는 infrastructure의 `auth-mapper.ts`를 re-export하는 조합 루트 파일이다:
>
> ```typescript
> // shared/di/auth-mappers.ts
> export { mapSupabaseUser, mapSupabaseSession } from '@/infrastructure/supabase/auth-mapper'
> ```
>
> **lazy init + useRef**: `getSupabaseClient()`를 `useRef`에 저장하여 컴포넌트 리렌더링 시 클라이언트 재생성을 방지하면서, 모듈 수준 싱글턴의 SSR 상태 공유 문제를 회피한다.

### 11. `src/app/layout.tsx`에 AuthProvider + ToastProvider 래핑

`AuthProvider`와 `ToastProvider`를 루트 레이아웃에 추가한다.

```typescript
import type { Metadata, Viewport } from 'next'
import { AuthProvider } from '@/presentation/providers/auth-provider'
import { ToastProvider } from '@/presentation/components/ui/toast'
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
        <AuthProvider>
          <ToastProvider>
            {children}
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
```

### 11-1. `src/presentation/guards/auth-guard.tsx`

인증되지 않은 사용자를 로그인 페이지로 리다이렉트하는 클라이언트 가드 컴포넌트. `(main)` 레이아웃에서 사용된다.

```typescript
'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/presentation/providers/auth-provider'

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace('/auth/login')
    }
  }, [user, isLoading, router])

  if (isLoading) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-[3px] border-[var(--accent-food)] border-t-transparent" />
      </div>
    )
  }

  if (!user) {
    return null
  }

  return <>{children}</>
}
```

> **이중 보호**: `middleware.ts`(서버)와 `AuthGuard`(클라이언트) 양쪽에서 인증을 체크한다. middleware는 초기 요청을 차단하고, AuthGuard는 클라이언트 사이드 네비게이션을 보호한다.

### 12. `supabase/migrations/013_auth_trigger.sql`

```sql
-- auth.users에 새 사용자 가입 시 public.users 테이블에 자동 INSERT
-- AUTH.md §1: "가입 시 users 테이블에 자동 row 생성 (trigger)"
-- AUTH.md §1: "닉네임: 소셜 계정 이름 자동 설정"

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER  -- SECURITY DEFINER 사용 금지 (AUTH.md §6)
SET search_path = public
AS $$
DECLARE
  _nickname TEXT;
  _email TEXT;
  _provider TEXT;
  _provider_id TEXT;
  _avatar_url TEXT;
BEGIN
  -- 소셜 계정에서 닉네임 추출
  -- Kakao: raw_user_meta_data->>'name' 또는 raw_user_meta_data->>'preferred_username'
  -- Google: raw_user_meta_data->>'name' 또는 raw_user_meta_data->>'full_name'
  -- Naver: raw_user_meta_data->>'name'
  -- Apple: raw_user_meta_data->>'name' 또는 raw_user_meta_data->>'full_name'
  _nickname := COALESCE(
    NEW.raw_user_meta_data->>'name',
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'preferred_username',
    '냠유저'
  );

  -- 20자 초과 시 잘라내기 (VARCHAR(20) 제한)
  _nickname := LEFT(_nickname, 20);

  _email := NEW.email;

  -- Provider 식별
  -- Supabase auth.users.raw_app_meta_data->>'provider' 값: 'google', 'kakao', 'apple', 'naver'
  _provider := COALESCE(NEW.raw_app_meta_data->>'provider', 'google');

  -- Provider별 고유 ID
  -- Supabase auth.users.raw_app_meta_data->>'provider_id' 사용
  _provider_id := COALESCE(
    NEW.raw_app_meta_data->>'provider_id',
    NEW.id::TEXT
  );

  -- 아바타 URL (소셜 제공 시)
  _avatar_url := NEW.raw_user_meta_data->>'avatar_url';

  INSERT INTO public.users (
    id,
    email,
    nickname,
    avatar_url,
    auth_provider,
    auth_provider_id,
    privacy_profile,
    privacy_records,
    created_at,
    updated_at
  ) VALUES (
    NEW.id,
    _email,
    _nickname,
    _avatar_url,
    _provider,
    _provider_id,
    'bubble_only',   -- DATA_MODEL.md: 기본값
    'shared_only',   -- DATA_MODEL.md: 기본값
    NOW(),
    NOW()
  );

  RETURN NEW;
END;
$$;

-- 트리거 생성 (이미 존재하면 재생성)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
```

> **SECURITY INVOKER 사용**: AUTH.md §6에 따라 SECURITY DEFINER 함수 사용 금지.
> 이 트리거는 `auth.users` INSERT 시 PostgreSQL 내부에서 실행되므로 SECURITY INVOKER로도 동작한다.
> Supabase Auth가 `auth.users`에 INSERT할 때 superuser 권한으로 실행되기 때문이다.

### 13. 로그아웃 플로우

`AuthProvider`의 `signOut` 함수를 호출한다. 호출 위치는 S6 설정 페이지에서 구현하지만, 기본 동작은 다음과 같다:

```typescript
// 사용 예시 (S6에서 구현할 설정 페이지 내)
import { useAuth } from '@/presentation/providers/auth-provider'
import { useRouter } from 'next/navigation'

function LogoutButton() {
  const { signOut } = useAuth()
  const router = useRouter()

  const handleLogout = async () => {
    await signOut()
    router.push('/auth/login')
  }

  return (
    <button onClick={handleLogout}>로그아웃</button>
  )
}
```

로그아웃 시 동작:
1. `supabase.auth.signOut()` 호출 → 세션 쿠키 삭제
2. `AuthProvider` 상태 초기화 (`user: null`, `session: null`)
3. `/auth/login`으로 리다이렉트
4. `middleware.ts`가 미인증 상태 감지 → 보호 라우트 접근 차단

### 14. 네이버 OAuth 특수 처리

Supabase는 네이버를 기본 OAuth provider로 지원하지 않는다. 두 가지 방법 중 택1:

**방법 A — Supabase Custom OIDC Provider (권장)**:
1. Supabase 대시보드 → Authentication → Providers → "Add custom provider"
2. Provider 이름: `naver`
3. OIDC Discovery URL 또는 수동 엔드포인트 입력:
   - Authorization: `https://nid.naver.com/oauth2.0/authorize`
   - Token: `https://nid.naver.com/oauth2.0/token`
   - Userinfo: `https://openapi.naver.com/v1/nid/me`
4. Client ID / Secret 등록

**방법 B — 수동 OAuth 플로우**:
Supabase Auth를 우회하여 직접 네이버 OAuth를 처리하는 별도 콜백 라우트. 이 경우 `src/app/auth/naver/callback/route.ts`를 추가로 생성한다. 방법 B는 복잡도가 높으므로 방법 A를 먼저 시도하고, Supabase Custom OIDC가 네이버와 호환되지 않을 경우 방법 B로 전환한다.

---

## 파일 의존성 관계

```
domain/entities/user.ts           ← 외부 의존 없음 (R1 준수)
domain/entities/auth.ts           ← 외부 의존 없음 (R1 준수)
infrastructure/supabase/client.ts ← @supabase/ssr
infrastructure/supabase/server.ts ← @supabase/ssr, next/headers
infrastructure/supabase/auth-mapper.ts ← @supabase/supabase-js, domain/entities/auth
shared/di/container.ts            ← infrastructure/supabase/client (유일한 infrastructure import 지점)
shared/di/auth-mappers.ts         ← infrastructure/supabase/auth-mapper (조합 루트 re-export)
middleware.ts                      ← @supabase/ssr, next/server
app/auth/callback/route.ts        ← infrastructure/supabase/server
app/auth/login/page.tsx            ← presentation/containers/login-container (R5 준수)
application/hooks/use-auth-actions.ts ← shared/di/container, domain/entities/auth (R3 준수)
presentation/containers/login-container.tsx ← application/hooks/use-auth-actions, presentation/components
presentation/components/auth/login-buttons.tsx ← props만 (R4 준수, infrastructure import 없음)
presentation/providers/auth-provider.tsx       ← shared/di/container, shared/di/auth-mappers, domain/entities/auth (R4 준수)
```

### Clean Architecture 준수 방안

인증도 예외 없이 Clean Architecture를 따른다:

1. **Domain 타입**: `src/domain/entities/auth.ts` — AuthProvider, AuthUser, AuthSession (외부 의존 0)
2. **Supabase 클라이언트 생성**: `src/infrastructure/supabase/client.ts`, `server.ts` (infrastructure)
3. **타입 매퍼**: `src/infrastructure/supabase/auth-mapper.ts` — Supabase 타입 → domain 타입 변환 (infrastructure)
4. **인증 액션 훅**: `src/application/hooks/use-auth-actions.ts` (application) — signInWithOAuth, signOut 로직, domain 타입만 사용
5. **로그인 버튼 컴포넌트**: `src/presentation/components/auth/login-buttons.tsx` (presentation) — props로 onLogin 콜백 수신, infrastructure 직접 import 금지
6. **로그인 컨테이너**: `src/presentation/containers/login-container.tsx` — useAuthActions 훅 호출 + LoginButtons 렌더링
7. **로그인 페이지**: `src/app/auth/login/page.tsx` — LoginContainer만 렌더링 (R5)
8. **AuthProvider**: `src/presentation/providers/auth-provider.tsx` — shared/di 경유, domain 타입(AuthUser, AuthSession)만 사용

**DI 경유 패턴:**
```typescript
// shared/di/container.ts
import { createClient } from '@/infrastructure/supabase/client'
export const supabaseClient = createClient()

// shared/di/auth-mappers.ts (조합 루트 — infrastructure를 re-export)
export { mapSupabaseUser, mapSupabaseSession } from '@/infrastructure/supabase/auth-mapper'

// presentation/providers/auth-provider.tsx
import { supabaseClient } from '@/shared/di/container'              // R4 준수
import { mapSupabaseUser, mapSupabaseSession } from '@/shared/di/auth-mappers'  // R4 준수
import type { AuthUser, AuthSession } from '@/domain/entities/auth'  // domain 타입만 사용
```

**Naver 처리:** Supabase Custom OIDC Provider로 등록한다. SDK 타입에 'naver'가 없으므로 infrastructure 레벨에서 타입 변환을 처리한다.

---

## 필요 패키지

```bash
pnpm add @supabase/supabase-js @supabase/ssr
```

---

## 검증 체크리스트

- [ ] Google 로그인 → 세션 생성 → `/` 리다이렉트
- [ ] Kakao 로그인 → 세션 생성 → `/` 리다이렉트
- [ ] Naver 로그인 → 세션 생성 → `/` 리다이렉트
- [ ] Apple 로그인 → 세션 생성 → `/` 리다이렉트
- [ ] 로그아웃 → 세션 삭제 → `/auth/login` 리다이렉트
- [ ] 미인증 상태로 `/` 접근 → `/auth/login` 리다이렉트
- [ ] 인증 상태로 `/auth/login` 접근 → `/` 리다이렉트
- [ ] 신규 가입 시 `public.users` 테이블에 행 자동 생성 확인
- [ ] `users.auth_provider`에 올바른 값 저장 확인 (`'google'` / `'kakao'` / `'naver'` / `'apple'`)
- [ ] `users.auth_provider_id`에 소셜 계정 고유 ID 저장 확인
- [ ] `users.nickname`에 소셜 계정 이름 자동 설정 확인 (20자 초과 시 잘림)
- [ ] `users.privacy_profile` 기본값 `'bubble_only'` 확인
- [ ] `users.privacy_records` 기본값 `'shared_only'` 확인
- [ ] `SUPABASE_SERVICE_ROLE_KEY`가 클라이언트 코드에 노출되지 않음 확인
- [ ] `grep -r "from 'react" src/domain/` → 결과 없음 (R1)
- [ ] `grep -r "from '@supabase" src/domain/` → 결과 없음 (R1)
- [ ] `grep -r "from '@supabase" src/application/` → 결과 없음 (R3 준수, domain 타입만 사용)
- [ ] `grep -r "from '@supabase" src/presentation/` → 결과 없음 (R4 준수, domain 타입만 사용)
- [ ] `pnpm build` 에러 없음
- [ ] `pnpm lint` 경고 0개
- [ ] OAuth 콜백 실패 시 `/auth/login?error=callback_failed`로 리다이렉트 확인
- [ ] 동일 소셜 계정 재로그인 시 기존 사용자 세션 생성 (중복 가입 안 됨) 확인
