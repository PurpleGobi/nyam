'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import type { OnboardingArea } from '@/domain/entities/onboarding'
import type { OnboardingSeedBubble, OnboardingBubbleTemplate } from '@/domain/entities/onboarding'
import { ONBOARDING_AREAS } from '@/domain/entities/onboarding'
import { BUBBLE_TEMPLATES, SEED_BUBBLES } from '@/shared/constants/onboarding-seeds'
import { OnboardingIntro } from '@/presentation/components/onboarding/onboarding-intro'
import { OnboardingProgress } from '@/presentation/components/onboarding/onboarding-progress'
import { RestaurantRegisterStep } from '@/presentation/components/onboarding/restaurant-register-step'
import { BubbleCreateStep } from '@/presentation/components/onboarding/bubble-create-step'
import { BubbleExploreStep } from '@/presentation/components/onboarding/bubble-explore-step'
import { FabBack } from '@/presentation/components/layout/fab-back'
import { FabForward } from '@/presentation/components/layout/fab-forward'
import { useBonusXp } from '@/application/hooks/use-bonus-xp'
import { useAuth } from '@/presentation/providers/auth-provider'

type OnboardingStep = 'intro' | 'record' | 'bubble' | 'explore'

const STEP_INDEX: Record<OnboardingStep, number> = { intro: -1, record: 0, bubble: 1, explore: 2 }
const STEPS: OnboardingStep[] = ['record', 'bubble', 'explore']

// 시드 식당 데이터 (실제로는 DB에서 가져오지만, 온보딩에서는 하드코딩)
const SEED_RESTAURANTS: Record<string, Array<{ id: string; name: string; genre: string | null; area: string; address: string | null; photoUrl: string | null }>> = {
  을지로: [
    { id: 'seed-1', name: '을지면옥', genre: '한식', area: '을지로', address: null, photoUrl: null },
    { id: 'seed-2', name: '스시코우지', genre: '일식', area: '을지로', address: null, photoUrl: null },
    { id: 'seed-3', name: '을지다락', genre: '카페', area: '을지로', address: null, photoUrl: null },
    { id: 'seed-4', name: '을지OB맥주', genre: '바/주점', area: '을지로', address: null, photoUrl: null },
  ],
  광화문: [
    { id: 'seed-5', name: '토속촌삼계탕', genre: '한식', area: '광화문', address: null, photoUrl: null },
    { id: 'seed-6', name: '경복궁 쌈밥집', genre: '한식', area: '광화문', address: null, photoUrl: null },
  ],
  성수: [
    { id: 'seed-7', name: '성수동 카페거리', genre: '카페', area: '성수', address: null, photoUrl: null },
    { id: 'seed-8', name: '뚝섬 숯불갈비', genre: '한식', area: '성수', address: null, photoUrl: null },
  ],
  강남: [
    { id: 'seed-9', name: '봉피양', genre: '한식', area: '강남', address: null, photoUrl: null },
    { id: 'seed-10', name: '스시 쵸우', genre: '일식', area: '강남', address: null, photoUrl: null },
  ],
  홍대: [
    { id: 'seed-11', name: '연남토마', genre: '이탈리안', area: '홍대', address: null, photoUrl: null },
  ],
  이태원: [
    { id: 'seed-12', name: '하동관', genre: '한식', area: '이태원', address: null, photoUrl: null },
  ],
}

export function OnboardingContainer() {
  const router = useRouter()
  const { user } = useAuth()
  const { awardBonus } = useBonusXp()
  const [step, setStep] = useState<OnboardingStep>('intro')
  const [history, setHistory] = useState<OnboardingStep[]>([])

  // Step 1: 맛집 등록 상태
  const [area, setArea] = useState<OnboardingArea>(ONBOARDING_AREAS[0])
  const [searchQuery, setSearchQuery] = useState('')
  const [registeredIds, setRegisteredIds] = useState<Set<string>>(new Set())

  // Step 2: 버블 생성 상태
  const [createdBubbleIds, setCreatedBubbleIds] = useState<string[]>([])

  const restaurants = SEED_RESTAURANTS[area] ?? []

  const pushStep = useCallback((next: OnboardingStep) => {
    setHistory((prev) => [...prev, step])
    setStep(next)
  }, [step])

  const goBack = useCallback(() => {
    if (history.length === 0) return
    const prev = history[history.length - 1]
    setHistory((h) => h.slice(0, -1))
    setStep(prev)
  }, [history])

  const goForward = useCallback(() => {
    const idx = STEPS.indexOf(step)
    if (idx < STEPS.length - 1) {
      pushStep(STEPS[idx + 1])
    } else {
      router.push('/')
    }
  }, [step, pushStep, router])

  // 인트로
  if (step === 'intro') {
    return <OnboardingIntro onNext={() => pushStep('record')} />
  }

  const stepIdx = STEP_INDEX[step]

  return (
    <div className="content-auth relative flex min-h-dvh flex-col" style={{ backgroundColor: 'var(--bg)' }}>
      <div style={{ padding: '54px 28px 0', flexShrink: 0 }}>
        <OnboardingProgress currentStep={stepIdx} totalSteps={3} />
      </div>

      {step === 'record' && (
        <StepLayout
          title={<>기록할 때마다,<br />당신의 미식 경험치가 쌓여요.</>}
          subtitle={<>경험치를 통해 레벨이 올라가고,<br />레벨은 사용자의 전문분야(지역, 장르)를 보여줍니다.</>}
          hint="지금은 등록만 하고, 나중에 식당평가 기록을 완성해 주세요."
        >
          <RestaurantRegisterStep
            area={area}
            onAreaChange={setArea}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            restaurants={restaurants}
            registeredIds={registeredIds}
            isLoading={false}
            onRegister={(id) => setRegisteredIds((prev) => new Set(prev).add(id))}
            onUnregister={(id) => setRegisteredIds((prev) => { const next = new Set(prev); next.delete(id); return next })}
            onNext={goForward}
          />
        </StepLayout>
      )}

      {step === 'bubble' && (
        <StepLayout
          title={<>내가 인정하는 미식가들끼리<br />숨겨진 맛집을 공유해요.</>}
          subtitle="가족, 친구, 동료 — 나만의 버블을 만들어보세요."
          hint="세부 사항은 나중에 언제든 변경할 수 있어요."
        >
          <BubbleCreateStep
            templates={BUBBLE_TEMPLATES}
            createdBubbleIds={createdBubbleIds}
            isLoading={false}
            onCreateBubble={(t: OnboardingBubbleTemplate) => setCreatedBubbleIds((prev) => [...prev, t.name])}
            onNext={goForward}
          />
        </StepLayout>
      )}

      {step === 'explore' && (
        <StepLayout
          title={<>경험을 쌓으면,<br />맛잘알들의 세계가 열려요.</>}
          subtitle={<>레벨이 오를수록 더 많은 버블에 들어가<br />모르는 맛잘알들과도 맛집을 나눌 수 있어요.</>}
          hint="내가 만든 버블은 가입 조건을 직접 설정해서, 원하는 사람들과만 맛집을 공유할 수 있어요."
        >
          <BubbleExploreStep
            seedBubbles={SEED_BUBBLES as OnboardingSeedBubble[]}
            userLevel={1}
            isLoading={false}
            onBubblePress={() => {}}
            onComplete={async () => {
              if (user?.id) await awardBonus(user.id, 'onboard')
              router.push('/')
            }}
          />
        </StepLayout>
      )}

      <FabBack onClick={goBack} />
      <FabForward onClick={goForward} />
    </div>
  )
}

function StepLayout({ title, subtitle, hint, children }: {
  title: React.ReactNode; subtitle: React.ReactNode; hint: string; children: React.ReactNode
}) {
  return (
    <>
      <div style={{ flex: '0 0 28%', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 28px' }}>
        <div style={{ fontSize: '24px', fontWeight: 700, lineHeight: 1.45, letterSpacing: '-0.4px', color: 'var(--text)' }}>
          {title}
        </div>
        <div style={{ fontSize: '13px', color: 'var(--text-sub)', marginTop: '10px', lineHeight: 1.7 }}>
          {subtitle}
        </div>
      </div>
      <div
        className="flex-1 overflow-y-auto"
        style={{ padding: '0 24px', backgroundColor: 'var(--bg-card)', borderRadius: '24px 24px 0 0', borderTop: '1px solid var(--border)', scrollbarWidth: 'none' }}
      >
        <div style={{ height: '20px' }} />
        {children}
        <div style={{ position: 'sticky', bottom: 0, padding: '14px 0 20px', backgroundColor: 'var(--bg-card)' }}>
          <p style={{ fontSize: '12px', fontStyle: 'italic', color: 'var(--text-hint)', textAlign: 'center', lineHeight: 1.5, margin: 0 }}>
            {hint}
          </p>
        </div>
      </div>
    </>
  )
}
