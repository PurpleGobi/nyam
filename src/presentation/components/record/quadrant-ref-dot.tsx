'use client'

import { useCallback } from 'react'
import type { GaugeChannel } from '@/shared/utils/gauge-color'

interface QuadrantRefDotProps {
  x: number
  y: number
  satisfaction: number
  name: string
  score: number
  channel?: GaugeChannel
  isActive?: boolean
  onSelect?: () => void
}

const DOT_SIZE = 20

export function QuadrantRefDot({ x, y, satisfaction, name, isActive, onSelect }: QuadrantRefDotProps) {
  const active = isActive ?? false
  const totalScore = satisfaction
  const baseOpacity = 0.15 + (totalScore / 100) * 0.45

  const handleTap = useCallback((e: React.PointerEvent) => {
    e.stopPropagation()
    onSelect?.()
  }, [onSelect])

  return (
    <div
      style={{
        position: 'absolute',
        left: `${x}%`,
        bottom: `${y}%`,
        transform: 'translate(-50%, 50%)',
        pointerEvents: 'none',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        zIndex: active ? 20 : 1,
      }}
    >
      {/* 참조 dot — 클릭 영역을 dot에만 한정 */}
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
          pointerEvents: 'auto',
          cursor: 'pointer',
        }}
        onPointerDown={handleTap}
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
          pointerEvents: 'none',
        }}
      >
        {name}
      </span>
    </div>
  )
}
