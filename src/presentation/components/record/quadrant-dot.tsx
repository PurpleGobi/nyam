'use client'

import { getGaugeColor } from '@/shared/utils/gauge-color'

interface QuadrantDotProps {
  x: number
  y: number
  satisfaction: number
  isDragging: boolean
}

export function QuadrantDot({ x, y, satisfaction, isDragging }: QuadrantDotProps) {
  const size = 28 + (satisfaction / 100) * 92
  const color = getGaugeColor(satisfaction)
  const fontSize = Math.max(12, size * 0.3)

  const glowSize = isDragging ? size * 0.5 : size * 0.3
  const glowOpacity = isDragging ? 'A6' : '80'
  const glowShadow = `0 0 ${glowSize}px ${color}${glowOpacity}`

  return (
    <div
      style={{
        position: 'absolute',
        left: `${x}%`,
        bottom: `${y}%`,
        transform: 'translate(-50%, 50%)',
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: '50%',
        backgroundColor: color,
        boxShadow: glowShadow,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition:
          'width 0.08s ease-out, height 0.08s ease-out, background-color 0.15s ease-out, box-shadow 0.15s ease-out',
        cursor: 'grab',
        touchAction: 'none',
        zIndex: 10,
      }}
    >
      <span
        style={{
          fontWeight: 800,
          color: '#FFFFFF',
          fontSize: `${fontSize}px`,
          lineHeight: 1,
          userSelect: 'none',
        }}
      >
        {satisfaction}
      </span>
    </div>
  )
}
