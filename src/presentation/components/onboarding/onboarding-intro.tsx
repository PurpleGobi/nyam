'use client'

interface OnboardingIntroProps {
  onNext: () => void
}

export function OnboardingIntro({ onNext }: OnboardingIntroProps) {
  return (
    <div className="flex min-h-dvh flex-col" style={{ backgroundColor: 'var(--bg)' }}>
      {/* 콘텐츠: 세로 중앙 정렬 */}
      <div className="flex flex-1 flex-col items-center justify-center" style={{ padding: '0 36px' }}>
        <div
          style={{
            fontSize: '26px',
            fontWeight: 700,
            lineHeight: 1.5,
            letterSpacing: '-0.4px',
            textAlign: 'center',
            color: 'var(--text)',
          }}
        >
          낯선 별점 천 개보다,
          <br />
          믿을만한 한 명의 기록.
        </div>

        <div
          style={{
            fontSize: '14px',
            color: 'var(--text-sub)',
            lineHeight: 1.8,
            textAlign: 'center',
            marginTop: '16px',
          }}
        >
          기록은 쌓이고, 취향은 선명해지고,
          <br />
          가까운 사람들과 나눌 수 있어요.
        </div>
      </div>

      {/* CTA: 텍스트 버튼 */}
      <div style={{ padding: '0 24px 56px', flexShrink: 0, textAlign: 'center' }}>
        <button
          type="button"
          onClick={onNext}
          className="transition-opacity active:opacity-50"
          style={{
            background: 'none',
            border: 'none',
            fontSize: '15px',
            fontWeight: 600,
            color: 'var(--accent-food)',
            padding: '12px 24px',
            letterSpacing: '-0.1px',
            cursor: 'pointer',
          }}
        >
          시작하기 →
        </button>
      </div>
    </div>
  )
}
