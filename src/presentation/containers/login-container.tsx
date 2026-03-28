'use client'

import { LoginButtons } from '@/presentation/components/auth/login-buttons'
import { useAuthActions } from '@/application/hooks/use-auth-actions'
import type { AuthProvider } from '@/domain/entities/auth'

export function LoginContainer() {
  const { signInWithOAuth } = useAuthActions()

  const handleLogin = (provider: AuthProvider) => {
    signInWithOAuth(provider)
  }

  return (
    <div className="app-shell flex flex-col items-center justify-center" style={{ padding: '60px 32px 40px' }}>
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
