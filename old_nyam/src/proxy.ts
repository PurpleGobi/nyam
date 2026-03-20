import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"

const PUBLIC_ROUTES = [
  "/auth/login",
  "/auth/callback",
  "/auth/naver/callback",
  "/auth/consent",
  "/terms/service",
  "/terms/privacy",
  "/offline",
]

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Skip public routes
  if (PUBLIC_ROUTES.some((route) => pathname.startsWith(route))) {
    return NextResponse.next()
  }

  // Skip API routes and static assets
  if (pathname.startsWith("/api") || pathname.startsWith("/_next") || pathname.startsWith("/sw.js")) {
    return NextResponse.next()
  }

  let response = NextResponse.next({
    request: { headers: request.headers },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value)
          }
          response = NextResponse.next({
            request: { headers: request.headers },
          })
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options)
          }
        },
      },
    },
  )

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    const loginUrl = new URL("/auth/login", request.url)
    loginUrl.searchParams.set("next", pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Check deactivated account and terms agreement
  const { data: profile } = await supabase
    .from("users")
    .select("is_deactivated, terms_agreed_at")
    .eq("id", user.id)
    .single()

  if (profile?.is_deactivated && pathname !== "/auth/login") {
    const loginUrl = new URL("/auth/login", request.url)
    loginUrl.searchParams.set("error", "account_deactivated")
    return NextResponse.redirect(loginUrl)
  }

  // 약관 미동의 사용자는 동의 페이지로
  if (!profile?.terms_agreed_at && pathname !== "/auth/consent") {
    const consentUrl = new URL("/auth/consent", request.url)
    consentUrl.searchParams.set("next", pathname)
    return NextResponse.redirect(consentUrl)
  }

  return response
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.json|icons|sw.js|workbox-*).*)",
  ],
}
