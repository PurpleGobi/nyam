'use client'

import { useCallback, useRef } from 'react'
import type { GaugeChannel } from '@/shared/utils/gauge-color'

interface QuadrantRefDotProps {
  x: number
  y: number
  satisfaction: number
  name: string
  score: number
  channel?: GaugeChannel
  isActive?: boolean
  isMicroDot?: boolean
  onSelect?: () => void
  onLongPress?: () => void
}

const DOT_SIZE = 20
const LONG_PRESS_MS = 500

export function QuadrantRefDot({ x, y, satisfaction, name, isActive, isMicroDot, onSelect, onLongPress }: QuadrantRefDotProps) {
  const micro = isMicroDot ?? false
  const active = micro ? false : (isActive ?? false)
  const totalScore = satisfaction
  const baseOpacity = micro ? 0.5 : 0.15 + (totalScore / 100) * 0.45
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const didLongPress = useRef(false)

  const clearTimer = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
  }, [])

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.stopPropagation()
    didLongPress.current = false
    if (onLongPress) {
      (e.target as Element).setPointerCapture(e.pointerId)
      longPressTimer.current = setTimeout(() => {
        didLongPress.current = true
        navigator?.vibrate?.(20)
        onLongPress()
      }, LONG_PRESS_MS)
    }
  }, [onLongPress])

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    e.stopPropagation()
    clearTimer()
    if ((e.target as Element).hasPointerCapture(e.pointerId)) {
      (e.target as Element).releasePointerCapture(e.pointerId)
    }
    if (!didLongPress.current) {
      onSelect?.()
    }
  }, [onSelect, clearTimer])

  const handlePointerCancel = useCallback(() => {
    clearTimer()
  }, [clearTimer])

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
        zIndex: active ? 20 : micro ? 10 : 1,
      }}
    >
      {/* 참조 dot — 클릭 영역을 dot에만 한정 */}
      <div
        style={{
          width: micro ? '4px' : `${DOT_SIZE}px`,
          height: micro ? '4px' : `${DOT_SIZE}px`,
          borderRadius: '50%',
          backgroundColor: `rgba(120, 113, 108, ${active ? 0.85 : baseOpacity})`,
          boxShadow: micro
            ? 'none'
            : active
              ? '0 0 8px 3px rgba(120, 113, 108, 0.4)'
              : `0 0 6px 2px rgba(120, 113, 108, ${0.05 + (totalScore / 100) * 0.15})`,
          transition: 'background-color 0.15s, box-shadow 0.15s',
          pointerEvents: micro ? 'none' : 'auto',
          cursor: micro ? 'default' : 'pointer',
        }}
        onPointerDown={micro ? undefined : handlePointerDown}
        onPointerUp={micro ? undefined : handlePointerUp}
        onPointerCancel={micro ? undefined : handlePointerCancel}
        onPointerLeave={micro ? undefined : handlePointerCancel}
      />
      {!micro && (
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
      )}
    </div>
  )
}
