import { type NextRequest, NextResponse } from 'next/server'

const PUBLIC_PATHS = ['/auth', '/offline']

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some(path => pathname.startsWith(path))
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Supabase stores auth tokens in cookies prefixed with 'sb-'
  const hasSession = request.cookies
    .getAll()
    .some(c => c.name.startsWith('sb-') && c.name.endsWith('-auth-token'))

  // Redirect authenticated users away from login
  if (hasSession && pathname === '/auth/login') {
    return NextResponse.redirect(new URL('/', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
