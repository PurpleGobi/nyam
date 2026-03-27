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
          className="flex h-[48px] w-full items-center justify-center gap-2 transition-opacity active:opacity-70"
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
