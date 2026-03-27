'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { OnboardingIntro } from '@/presentation/components/onboarding/onboarding-intro'

type OnboardingStep = 'intro' | 'record' | 'bubble' | 'explore' | 'complete'

export function OnboardingContainer() {
  const router = useRouter()
  const [step, setStep] = useState<OnboardingStep>('intro')

  const handleComplete = useCallback(() => {
    router.push('/')
  }, [router])

  if (step === 'intro') {
    return <OnboardingIntro onNext={() => setStep('record')} />
  }

  if (step === 'record') {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center px-8">
        <span style={{ fontSize: '48px' }}>🍴</span>
        <p className="mt-4 text-[17px] font-semibold text-[var(--text)]">자주 가는 맛집을 등록해볼까요?</p>
        <p className="mt-2 text-[14px] text-[var(--text-sub)]">나중에 해도 괜찮아요</p>
        <div className="mt-8 flex w-full max-w-[280px] flex-col gap-3">
          <button
            type="button"
            onClick={() => setStep('bubble')}
            className="w-full rounded-xl py-3.5 text-[15px] font-semibold text-white"
            style={{ backgroundColor: 'var(--accent-food)' }}
          >
            맛집 등록하기
          </button>
          <button
            type="button"
            onClick={() => setStep('bubble')}
            className="w-full rounded-xl py-3.5 text-[15px] font-medium text-[var(--text-sub)]"
          >
            건너뛰기
          </button>
        </div>
      </div>
    )
  }

  if (step === 'bubble') {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center px-8">
        <span style={{ fontSize: '48px' }}>🫧</span>
        <p className="mt-4 text-[17px] font-semibold text-[var(--text)]">버블을 만들어볼까요?</p>
        <p className="mt-2 text-center text-[14px] text-[var(--text-sub)]">친구들과 맛집을 공유하는 비밀 그룹이에요</p>
        <div className="mt-8 flex w-full max-w-[280px] flex-col gap-3">
          <button
            type="button"
            onClick={() => setStep('explore')}
            className="w-full rounded-xl py-3.5 text-[15px] font-semibold text-white"
            style={{ backgroundColor: 'var(--accent-social)' }}
          >
            버블 만들기
          </button>
          <button
            type="button"
            onClick={() => setStep('explore')}
            className="w-full rounded-xl py-3.5 text-[15px] font-medium text-[var(--text-sub)]"
          >
            건너뛰기
          </button>
        </div>
      </div>
    )
  }

  if (step === 'explore') {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center px-8">
        <span style={{ fontSize: '48px' }}>🔍</span>
        <p className="mt-4 text-[17px] font-semibold text-[var(--text)]">다른 버블을 탐색해보세요</p>
        <p className="mt-2 text-center text-[14px] text-[var(--text-sub)]">공개 버블에 참여하면 더 많은 맛집 정보를 얻을 수 있어요</p>
        <div className="mt-8 flex w-full max-w-[280px] flex-col gap-3">
          <button
            type="button"
            onClick={handleComplete}
            className="w-full rounded-xl py-3.5 text-[15px] font-semibold text-white"
            style={{ backgroundColor: 'var(--brand)' }}
          >
            홈으로 가기
          </button>
        </div>
      </div>
    )
  }

  return null
}
