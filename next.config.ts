import type { NextConfig } from 'next'

const isDev = process.env.NODE_ENV === 'development'

// CSP 출처 — Supabase, Kakao Maps, Google Maps, Gemini, Naver Maps
const supabaseHost = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').replace(/\/$/, '') || 'https://*.supabase.co'
const CONNECT_SRC = [
  "'self'",
  supabaseHost,
  'https://*.supabase.co',
  'wss://*.supabase.co',
  'https://dapi.kakao.com',
  'https://t1.daumcdn.net',
  'https://maps.googleapis.com',
  'https://places.googleapis.com',
  'https://generativelanguage.googleapis.com',
  'https://openapi.naver.com',
  'https://pages.map.naver.com',
  'https://map.naver.com',
  'https://naver.me',
  'https://lh3.googleusercontent.com',
  'https://cdn.jsdelivr.net', // Pretendard Variable CSS 로드 시 소스맵 fetch
].join(' ')

const SCRIPT_SRC = [
  "'self'",
  // Next.js inline scripts (hydration). 프로덕션에서도 unsafe-inline 필요.
  "'unsafe-inline'",
  "'unsafe-eval'",
  'https://dapi.kakao.com',
  'https://t1.daumcdn.net',
  'https://maps.googleapis.com',
  'https://*.googleusercontent.com',
].join(' ')

const STYLE_SRC = [
  "'self'",
  "'unsafe-inline'",
  'https://fonts.googleapis.com',
  'https://cdn.jsdelivr.net', // Pretendard Variable CSS (globals.css @import)
].join(' ')
const FONT_SRC = [
  "'self'",
  'data:',
  'https://fonts.gstatic.com',
  'https://cdn.jsdelivr.net', // Pretendard Variable 폰트 파일
].join(' ')
const IMG_SRC = ["'self'", 'data:', 'blob:', 'https:'].join(' ')
const FRAME_ANCESTORS = ["'none'"].join(' ')

const CSP = [
  `default-src 'self'`,
  `script-src ${SCRIPT_SRC}`,
  `style-src ${STYLE_SRC}`,
  `font-src ${FONT_SRC}`,
  `img-src ${IMG_SRC}`,
  `connect-src ${CONNECT_SRC}`,
  `frame-ancestors ${FRAME_ANCESTORS}`,
  `base-uri 'self'`,
  `form-action 'self'`,
  `object-src 'none'`,
].join('; ')

const SECURITY_HEADERS = [
  { key: 'Content-Security-Policy', value: CSP },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(self), microphone=(), geolocation=(self), payment=(), usb=(), interest-cohort=()',
  },
  // HSTS는 Vercel이 자동 주입하지만 명시.
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
]

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
  async headers() {
    return [
      {
        source: '/:path*',
        headers: SECURITY_HEADERS,
      },
    ]
  },
}

export default nextConfig
