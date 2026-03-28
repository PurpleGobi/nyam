'use client'

import { useState, useRef, useCallback } from 'react'
import { getGaugeLevel } from '@/domain/entities/quadrant'
import { getGaugeColor } from '@/shared/utils/gauge-color'

interface CircleRatingProps {
  value: number
  onChange: (value: number) => void
  disabled?: boolean
}

export function CircleRating({ value, onChange, disabled = false }: CircleRatingProps) {
  const [isDragging, setIsDragging] = useState(false)
  const dragStartRef = useRef<{ y: number; value: number } | null>(null)
  const prevValueRef = useRef(value)

  const size = 28 + (value / 100) * 92
  const color = getGaugeColor(value)
  const fontSize = Math.max(12, size * 0.3)
  const glowSize = size * 0.3

  let boxShadow: string
  let filter: string

  if (isDragging && value >= 81) {
    boxShadow = `0 0 ${glowSize}px ${color}CC`
    filter = 'brightness(1.2)'
  } else if (isDragging) {
    boxShadow = `0 0 ${glowSize}px ${color}A6`
    filter = 'brightness(1.1)'
  } else {
    boxShadow = `0 0 ${glowSize}px ${color}80`
    filter = 'brightness(1.0)'
  }

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (disabled) return
      e.preventDefault()
      setIsDragging(true)
      dragStartRef.current = { y: e.clientY, value }
      navigator?.vibrate?.(10)
      ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
    },
    [disabled, value],
  )

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging || !dragStartRef.current) return
      const deltaY = dragStartRef.current.y - e.clientY
      const sensitivity = 0.5
      const newVal = Math.max(1, Math.min(100, Math.round(dragStartRef.current.value + deltaY * sensitivity)))

      if (Math.floor(prevValueRef.current / 10) !== Math.floor(newVal / 10)) {
        navigator?.vibrate?.(15)
      }
      const prevGauge = getGaugeLevel(prevValueRef.current)
      const nextGauge = getGaugeLevel(newVal)
      if (prevGauge !== nextGauge) {
        navigator?.vibrate?.(20)
      }

      prevValueRef.current = newVal
      onChange(newVal)
    },
    [isDragging, onChange],
  )

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      setIsDragging(false)
      dragStartRef.current = null
      e.currentTarget.releasePointerCapture(e.pointerId)
    },
    [],
  )

  return (
    <div
      style={{
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: '50%',
        backgroundColor: color,
        boxShadow,
        filter,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition:
          'width 0.08s ease-out, height 0.08s ease-out, background-color 0.15s ease-out, box-shadow 0.15s ease-out, filter 0.15s ease-out',
        cursor: disabled ? 'default' : 'grab',
        touchAction: 'none',
        userSelect: 'none',
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      <span
        style={{
          fontWeight: 800,
          color: '#FFFFFF',
          fontSize: `${fontSize}px`,
          lineHeight: 1,
        }}
      >
        {value}
      </span>
    </div>
  )
}
