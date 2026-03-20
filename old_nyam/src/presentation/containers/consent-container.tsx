"use client"

import { useCallback, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { TermsAgreement } from "@/presentation/components/auth/terms-agreement"

export function ConsentContainer() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const next = searchParams.get("next") ?? "/"
  const [termsAgreed, setTermsAgreed] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleAgree = useCallback(async () => {
    if (!termsAgreed || isSubmitting) return

    setIsSubmitting(true)
    try {
      const res = await fetch("/api/auth/agree-terms", { method: "POST" })
      if (res.ok) {
        router.push(next)
      }
    } catch (err) {
      console.error("Failed to agree terms:", err)
    } finally {
      setIsSubmitting(false)
    }
  }, [termsAgreed, isSubmitting, next, router])

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <h1 className="font-[family-name:var(--font-logo)] text-4xl text-primary-500">
            nyam
          </h1>
          <p className="mt-2 text-sm text-neutral-500">
            서비스 이용을 위해 약관에 동의해주세요
          </p>
        </div>

        <TermsAgreement onAllAgreed={setTermsAgreed} />

        <button
          type="button"
          disabled={!termsAgreed || isSubmitting}
          onClick={handleAgree}
          className="h-12 w-full rounded-xl bg-primary-500 text-sm font-semibold text-white hover:bg-primary-600 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none transition-all"
        >
          {isSubmitting ? "처리 중..." : "동의하고 시작하기"}
        </button>
      </div>
    </div>
  )
}
