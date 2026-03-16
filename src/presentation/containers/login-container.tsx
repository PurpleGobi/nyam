'use client'

import { useAuth } from '@/application/hooks/use-auth'
import { LoginButtons } from '@/presentation/components/auth/login-buttons'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export function LoginContainer() {
  const { user, isLoading, signIn } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (user && !isLoading) {
      router.replace('/')
    }
  }, [user, isLoading, router])

  if (isLoading) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#FF6038] border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-8 px-6">
      <div className="flex flex-col items-center gap-2">
        <h1 className="text-4xl font-bold text-[#FF6038]" style={{ fontFamily: 'var(--font-logo)' }}>nyam</h1>
        <p className="text-sm text-[var(--color-neutral-500)]">
          맛의 Second Brain
        </p>
      </div>
      <LoginButtons onSignIn={signIn} />
    </div>
  )
}
