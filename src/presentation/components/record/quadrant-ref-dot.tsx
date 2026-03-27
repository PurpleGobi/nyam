'use client'

import { getRefDotSize } from '@/domain/entities/quadrant'
import { getGaugeColor } from '@/shared/utils/gauge-color'

interface QuadrantRefDotProps {
  x: number
  y: number
  satisfaction: number
  name: string
  score: number
}

export function QuadrantRefDot({ x, y, satisfaction, name, score }: QuadrantRefDotProps) {
  const size = getRefDotSize(satisfaction)
  const color = getGaugeColor(satisfaction)

  return (
    <div
      style={{
        position: 'absolute',
        left: `${x}%`,
        bottom: `${y}%`,
        transform: 'translate(-50%, 50%)',
        opacity: 0.3,
        pointerEvents: 'none',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        zIndex: 1,
      }}
    >
      <div
        style={{
          width: `${size}px`,
          height: `${size}px`,
          borderRadius: '50%',
          backgroundColor: color,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <span
          style={{
            fontSize: '9px',
            fontWeight: 700,
            color: '#FFFFFF',
            lineHeight: 1,
          }}
        >
          {score}
        </span>
      </div>
      <span
        style={{
          fontSize: '9px',
          color: 'var(--text-hint)',
          marginTop: '2px',
          whiteSpace: 'nowrap',
          maxWidth: '48px',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {name}
      </span>
    </div>
  )
}
