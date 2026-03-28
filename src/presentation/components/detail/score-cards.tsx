'use client'

interface ScoreCardsProps {
  accentColor: string  // '--accent-food' | '--accent-wine'
  myScore: number | null
  mySubText: string           // '3회 방문' | '미방문'
  nyamScore: number | null
  nyamSubText: string         // '웹+명성' | 'Vivino+WS'
  bubbleScore: number | null
  bubbleSubText: string       // '평균 · 3개' | ''
  bubbleCount: number         // 우상단 카운트 뱃지 (0이면 비표시)
  onBubbleCardTap: () => void
  isBubbleExpanded: boolean
}

export function ScoreCards({
  accentColor,
  myScore,
  mySubText,
  nyamScore,
  nyamSubText,
  bubbleScore,
  bubbleSubText,
  bubbleCount,
  onBubbleCardTap,
  isBubbleExpanded,
}: ScoreCardsProps) {
  return (
    <div className="flex gap-2" style={{ padding: '0 20px 10px' }}>
      {/* 내 점수 카드 */}
      <ScoreCard
        label="내 점수"
        value={myScore}
        subText={mySubText}
        accentColor={accentColor}
      />

      {/* nyam 점수 카드 */}
      <ScoreCard
        label="nyam"
        value={nyamScore}
        subText={nyamSubText}
        accentColor={accentColor}
      />

      {/* 버블 점수 카드 */}
      <div className="relative flex-1">
        {bubbleCount > 0 && (
          <div
            className="absolute z-10 flex items-center justify-center rounded-full"
            style={{
              top: '-4px',
              right: '-4px',
              width: '16px',
              height: '16px',
              backgroundColor: 'var(--accent-social)',
              border: '1.5px solid var(--bg)',
            }}
          >
            <span style={{ fontSize: '9px', fontWeight: 700, color: '#FFFFFF' }}>
              {bubbleCount}
            </span>
          </div>
        )}
        <button
          type="button"
          onClick={onBubbleCardTap}
          className="flex w-full flex-col items-center rounded-[10px] transition-colors"
          style={{
            backgroundColor: 'var(--bg-card)',
            border: `1px solid ${isBubbleExpanded ? 'var(--accent-social)' : 'var(--border)'}`,
            padding: '8px 10px',
            minHeight: '56px',
            textAlign: 'center',
          }}
        >
          <span style={{ fontSize: '9px', fontWeight: 600, color: 'var(--text-hint)', letterSpacing: '0.02em' }}>
            버블
          </span>
          {bubbleScore !== null ? (
            <span style={{ fontSize: '24px', fontWeight: 800, color: `var(${accentColor})` }}>
              {bubbleScore}
            </span>
          ) : (
            <span style={{ fontSize: '18px', color: 'var(--border-bold)' }}>—</span>
          )}
          {bubbleSubText && (
            <span style={{ fontSize: '9px', color: 'var(--text-hint)' }}>{bubbleSubText}</span>
          )}
        </button>
      </div>
    </div>
  )
}

function ScoreCard({
  label,
  value,
  subText,
  accentColor,
}: {
  label: string
  value: number | null
  subText: string
  accentColor: string
}) {
  return (
    <div
      className="flex flex-1 flex-col items-center rounded-[10px]"
      style={{
        backgroundColor: 'var(--bg-card)',
        border: '1px solid var(--border)',
        padding: '8px 10px',
        minHeight: '56px',
        textAlign: 'center',
      }}
    >
      <span style={{ fontSize: '9px', fontWeight: 600, color: 'var(--text-hint)', letterSpacing: '0.02em' }}>
        {label}
      </span>
      {value !== null ? (
        <span style={{ fontSize: '24px', fontWeight: 800, color: `var(${accentColor})` }}>
          {value}
        </span>
      ) : (
        <span style={{ fontSize: '18px', color: 'var(--border-bold)' }}>—</span>
      )}
      {subText && (
        <span style={{ fontSize: '9px', color: 'var(--text-hint)' }}>{subText}</span>
      )}
    </div>
  )
}
