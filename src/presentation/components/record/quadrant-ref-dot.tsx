'use client'

import { useState, useCallback } from 'react'
import type { GaugeChannel } from '@/shared/utils/gauge-color'

interface QuadrantRefDotProps {
  x: number
  y: number
  satisfaction: number
  name: string
  score: number
  channel?: GaugeChannel
}

const DOT_SIZE = 20

export function QuadrantRefDot({ x, y, satisfaction, name }: QuadrantRefDotProps) {
  const [active, setActive] = useState(false)
  const totalScore = satisfaction
  const baseOpacity = 0.15 + (totalScore / 100) * 0.45

  const handleTap = useCallback((e: React.PointerEvent) => {
    e.stopPropagation()
    setActive((prev) => !prev)
  }, [])

  return (
    <div
      style={{
        position: 'absolute',
        left: `${x}%`,
        bottom: `${y}%`,
        transform: 'translate(-50%, 50%)',
        pointerEvents: 'auto',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        zIndex: active ? 20 : 1,
        cursor: 'pointer',
      }}
      onPointerDown={handleTap}
    >
      {/* 참조 dot — 그레이스케일, 탭 시 진해짐 */}
      <div
        style={{
          width: `${DOT_SIZE}px`,
          height: `${DOT_SIZE}px`,
          borderRadius: '50%',
          backgroundColor: `rgba(120, 113, 108, ${active ? 0.85 : baseOpacity})`,
          boxShadow: active
            ? '0 0 8px 3px rgba(120, 113, 108, 0.4)'
            : `0 0 6px 2px rgba(120, 113, 108, ${0.05 + (totalScore / 100) * 0.15})`,
          transition: 'background-color 0.15s, box-shadow 0.15s',
        }}
      />
      <span
        style={{
          fontSize: active ? '10px' : '8px',
          fontWeight: active ? 700 : 400,
          color: active ? 'var(--text)' : 'var(--text-hint)',
          marginTop: '2px',
          whiteSpace: 'nowrap',
          maxWidth: active ? '120px' : '48px',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          opacity: active ? 1 : 0.5,
          transition: 'all 0.15s',
        }}
      >
        {name}
      </span>
    </div>
  )
}
