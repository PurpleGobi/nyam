"use client"

import { useState } from "react"
import { useAuth } from "@/application/hooks/use-auth"
import { TermsAgreement } from "@/presentation/components/auth/terms-agreement"
import { LoginButtons } from "@/presentation/components/auth/login-buttons"

export function LoginContainer() {
  const { signInWithProvider, signInWithNaver } = useAuth()
  const [termsAgreed, setTermsAgreed] = useState(false)

  const handleLogin = async (provider: "google" | "kakao" | "apple" | "naver") => {
    if (provider === "naver") {
      await signInWithNaver()
    } else {
      await signInWithProvider(provider)
    }
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <h1 className="font-[family-name:var(--font-logo)] text-4xl text-primary-500">
            nyam
          </h1>
          <p className="mt-2 text-sm text-neutral-500">
            나만의 맛 기록을 시작하세요
          </p>
        </div>

        <TermsAgreement onAllAgreed={setTermsAgreed} />
        <LoginButtons disabled={!termsAgreed} onLogin={handleLogin} />
      </div>
    </div>
  )
}
