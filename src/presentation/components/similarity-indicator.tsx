'use client'

// R4: props만 받음.

interface SimilarityIndicatorProps {
  similarity: number // 0~1
  confidence: number // 0~1
  /** 컴팩트 모드: % 텍스트만 표시 (팔로우 목록용). 기본: 프로그레스 바 + 텍스트 */
  compact?: boolean
}

export function SimilarityIndicator({
  similarity,
  confidence,
  compact = false,
}: SimilarityIndicatorProps) {
  const pct = Math.round(similarity * 100)

  // 신뢰도 낮으면 (겹침 부족) 흐릿하게
  const opacity = confidence < 0.3 ? 0.5 : 1.0

  if (compact) {
    return (
      <span
        style={{
          fontSize: '11px',
          fontWeight: 600,
          color: 'var(--accent-social)',
          opacity,
        }}
      >
        적합도 {pct}%
      </span>
    )
  }

  return (
    <div className="flex items-center gap-1.5" style={{ opacity }}>
      <span style={{ fontSize: '10px', color: 'var(--text-hint)' }}>적합도</span>
      {/* 프로그레스 바 */}
      <div
        className="h-1 flex-1 overflow-hidden rounded-full"
        style={{ backgroundColor: 'var(--border)', minWidth: '40px', maxWidth: '60px' }}
      >
        <div
          className="h-full rounded-full"
          style={{
            width: `${pct}%`,
            backgroundColor: 'var(--accent-social)',
            transition: 'width 0.3s ease',
          }}
        />
      </div>
      <span
        style={{
          fontSize: '11px',
          fontWeight: 600,
          color: 'var(--accent-social)',
          minWidth: '32px',
        }}
      >
        {pct}%
      </span>
    </div>
  )
}
