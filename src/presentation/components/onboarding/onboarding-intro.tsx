'use client'

interface OnboardingIntroProps {
  onNext: () => void
}

export function OnboardingIntro({ onNext }: OnboardingIntroProps) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-8">
      <h1
        style={{
          fontFamily: 'var(--font-logo)',
          fontSize: '36px',
          fontWeight: 800,
          background: 'linear-gradient(135deg, #FF6038, #8B7396)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          letterSpacing: '-1px',
        }}
      >
        nyam
      </h1>
      <p className="mt-4 text-center" style={{ fontSize: '17px', fontWeight: 600, color: 'var(--text)' }}>
        나만의 맛집 기록을 시작하세요
      </p>
      <p className="mt-2 text-center" style={{ fontSize: '14px', color: 'var(--text-sub)', lineHeight: 1.6 }}>
        사진 한 장으로 AI가 자동 인식하고,{'\n'}
        사분면 평가로 3초 만에 기록합니다
      </p>
      <button
        type="button"
        onClick={onNext}
        className="mt-10 w-full max-w-[280px] rounded-xl py-3.5 text-[15px] font-semibold text-white"
        style={{ backgroundColor: 'var(--accent-food)' }}
      >
        시작하기
      </button>
    </div>
  )
}
