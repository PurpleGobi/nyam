'use client'

import { useRef, useCallback } from 'react'
import { cn } from '@/shared/utils/cn'

interface RatingScale {
  key: string
  label: string
}

const SCALES: RatingScale[] = [
  { key: 'taste', label: '맛' },
  { key: 'value', label: '가성비' },
  { key: 'service', label: '서비스' },
  { key: 'atmosphere', label: '분위기' },
  { key: 'cleanliness', label: '청결' },
  { key: 'portion', label: '양' },
]

interface RatingScalesProps {
  values: Record<string, number>
  onChange: (key: string, value: number) => void
}

function SliderBar({ label, scaleKey, value, onChange }: {
  label: string
  scaleKey: string
  value: number
  onChange: (key: string, value: number) => void
}) {
  const trackRef = useRef<HTMLDivElement>(null)
  const dragging = useRef(false)

  const calcValue = useCallback((clientX: number) => {
    const track = trackRef.current
    if (!track) return value
    const rect = track.getBoundingClientRect()
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
    return Math.round(ratio * 100)
  }, [value])

  const handleStart = useCallback((clientX: number) => {
    dragging.current = true
    onChange(scaleKey, calcValue(clientX))
  }, [scaleKey, calcValue, onChange])

  const handleMove = useCallback((clientX: number) => {
    if (!dragging.current) return
    onChange(scaleKey, calcValue(clientX))
  }, [scaleKey, calcValue, onChange])

  const handleEnd = useCallback(() => {
    dragging.current = false
  }, [])

  return (
    <div className="flex items-center gap-3">
      <span className="w-12 text-sm font-medium text-neutral-600 shrink-0">
        {label}
      </span>

      <div
        ref={trackRef}
        className="flex-1 relative h-10 flex items-center cursor-pointer touch-none"
        onMouseDown={(e) => { e.preventDefault(); handleStart(e.clientX) }}
        onMouseMove={(e) => handleMove(e.clientX)}
        onMouseUp={handleEnd}
        onMouseLeave={handleEnd}
        onTouchStart={(e) => { handleStart(e.touches[0].clientX) }}
        onTouchMove={(e) => { handleMove(e.touches[0].clientX) }}
        onTouchEnd={handleEnd}
      >
        {/* Track background */}
        <div className="absolute inset-x-0 h-3 rounded-full bg-neutral-100" />

        {/* Filled portion */}
        <div
          className={cn(
            'absolute left-0 h-3 rounded-full transition-[width] duration-75',
            value > 0 ? 'bg-[#FF6038]' : '',
          )}
          style={{ width: `${value}%` }}
        />

        {/* Thumb */}
        <div
          className={cn(
            'absolute w-6 h-6 rounded-full shadow-md border-2 transition-[left] duration-75',
            '-translate-x-1/2',
            value > 0
              ? 'bg-white border-[#FF6038]'
              : 'bg-white border-neutral-300',
          )}
          style={{ left: `${value}%` }}
        />
      </div>

      <span className={cn(
        'w-8 text-right text-sm font-semibold tabular-nums',
        value > 0 ? 'text-[#FF6038]' : 'text-neutral-300',
      )}>
        {value > 0 ? value : '-'}
      </span>
    </div>
  )
}

export function RatingScales({ values, onChange }: RatingScalesProps) {
  return (
    <div className="flex flex-col gap-2">
      {SCALES.map(({ key, label }) => (
        <SliderBar
          key={key}
          label={label}
          scaleKey={key}
          value={values[key] ?? 0}
          onChange={onChange}
        />
      ))}
    </div>
  )
}

export { SCALES }
