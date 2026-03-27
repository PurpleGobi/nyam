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
    <div className="flex min-h-dvh flex-col items-center justify-center bg-background px-6">
      <h1 className="logo-gradient mb-2 text-[42px] tracking-[-1px]">
        nyam
      </h1>

      <p className="mb-12 text-sub text-text-sub">
        나만의 맛 기록을 시작하세요
      </p>

      <LoginButtons onLogin={handleLogin} />
    </div>
  )
}
