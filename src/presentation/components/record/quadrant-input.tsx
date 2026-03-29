'use client'

import { useRef, useState, useCallback } from 'react'
import { getGaugeColor } from '@/shared/utils/gauge-color'
import { QuadrantRefDot } from '@/presentation/components/record/quadrant-ref-dot'

interface QuadrantInputProps {
  /** 'restaurant': X=음식퀄리티, Y=경험가치 / 'wine': X=산미, Y=바디 */
  type: 'restaurant' | 'wine'
  value: { x: number; y: number; satisfaction?: number }
  onChange: (value: { x: number; y: number; satisfaction?: number }) => void
  referencePoints?: Array<{
    x: number
    y: number
    satisfaction: number
    name: string
    score: number
  }>
  showHint?: boolean
}

const DOT_SIZE = 20

const AXIS_LABELS = {
  restaurant: {
    xLabel: '음식\n퀄리티',
    yLabel: '경험\n가치',
  },
  wine: {
    xLabel: '산미',
    yLabel: '바디',
  },
} as const

const QUADRANT_LABELS = {
  restaurant: {
    topRight: '맛도 좋고\n경험도 좋은',
    topLeft: '맛은 아쉽지만\n경험이 좋은',
    bottomRight: '경험은 아쉽지만\n맛이 좋은',
    bottomLeft: '전반적으로\n아쉬운',
  },
  wine: {
    topRight: '산미↑\nFull Body',
    topLeft: '산미↓\nFull Body',
    bottomRight: '산미↑\nLight Body',
    bottomLeft: '산미↓\nLight Body',
  },
} as const

const PRICE_LEVELS = [
  { value: 1, label: '저가' },
  { value: 2, label: '중간' },
  { value: 3, label: '고가' },
] as const

export function QuadrantInput({ type, value, onChange, referencePoints = [], showHint = false }: QuadrantInputProps) {
  const quadrantRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)

  const labels = AXIS_LABELS[type]
  const qLabels = QUADRANT_LABELS[type]
  const totalScore = Math.round((value.x + value.y) / 2)
  const foodColor = getGaugeColor(value.x, 'food')
  const expColor = getGaugeColor(value.y, 'experience')
  const totalColor = getGaugeColor(totalScore, 'total')

  const updateFromPointer = useCallback(
    (e: React.PointerEvent | PointerEvent) => {
      const rect = quadrantRef.current?.getBoundingClientRect()
      if (!rect) return
      const relX = (e.clientX - rect.left) / rect.width
      const relY = 1 - (e.clientY - rect.top) / rect.height
      const newX = Math.max(0, Math.min(100, Math.round(relX * 100)))
      const newY = Math.max(0, Math.min(100, Math.round(relY * 100)))
      onChange({ x: newX, y: newY, satisfaction: value.satisfaction })
    },
    [onChange, value.satisfaction],
  )

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      setIsDragging(true)
      updateFromPointer(e)
      e.currentTarget.setPointerCapture(e.pointerId)
      navigator?.vibrate?.(10)
    },
    [updateFromPointer],
  )

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging) return
      updateFromPointer(e)
    },
    [isDragging, updateFromPointer],
  )

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      setIsDragging(false)
      e.currentTarget.releasePointerCapture(e.pointerId)
    },
    [],
  )

  return (
    <div className="flex w-full flex-col gap-4">
      {/* 바게이지(좌) + 사분면(우) */}
      <div className="flex w-full items-stretch gap-4">
        {/* 좌측: 바 게이지 2개 + 총점 */}
        <div className="relative flex flex-col items-center gap-3" style={{ width: '96px' }}>
          <div className="flex w-full flex-1 gap-1.5">
            <VerticalGauge
              label={labels.xLabel}
              value={value.x}
              color={foodColor}
              onChange={(v) => onChange({ x: v, y: value.y, satisfaction: value.satisfaction })}
            />
            <VerticalGauge
              label={labels.yLabel}
              value={value.y}
              color={expColor}
              onChange={(v) => onChange({ x: value.x, y: v, satisfaction: value.satisfaction })}
            />
          </div>

          {/* 총점 */}
          <div
            className="flex w-full flex-col items-center rounded-lg py-2"
            style={{ backgroundColor: `${totalColor}12`, border: `1px solid ${totalColor}30` }}
          >
            <span style={{ fontSize: '10px', fontWeight: 500, color: 'var(--text-hint)' }}>총점</span>
            <span style={{ fontSize: '26px', fontWeight: 800, color: totalColor, lineHeight: 1.1 }}>
              {totalScore}
            </span>
          </div>

          {/* 바 게이지 힌트 — 각 바 중간 높이, 사분면 위에 겹침 */}
          {showHint && (
            <>
              <div style={{ position: 'absolute', top: '30%', left: '44px', zIndex: 40 }}>
                <HintBubble tailSide="left" accentColor="var(--accent-food)" bgColor="var(--accent-food-light)">
                  맛 만족도<br />바를 터치
                </HintBubble>
              </div>
              <div style={{ position: 'absolute', top: '55%', left: '95px', zIndex: 40 }}>
                <HintBubble tailSide="left" accentColor="var(--accent-wine)" bgColor="var(--accent-wine-light)">
                  경험 만족도<br />바를 터치
                </HintBubble>
              </div>
            </>
          )}
        </div>

        {/* 우측: 사분면 */}
        <div className="relative flex flex-1 flex-col items-center">
          {/* 사분면 힌트 말풍선 */}
          {showHint && (
            <HintBubble
              style={{ position: 'absolute', top: '-8px', left: '50%', transform: 'translateX(-50%) translateY(-100%)', zIndex: 30 }}
              tailSide="bottom"
              accentColor="var(--accent-food)"
              bgColor="var(--accent-food-light)"
            >
              사분면을 터치하여<br />만족도를 표시해주세요
            </HintBubble>
          )}
          {/* 사분면 박스 */}
          <div
            ref={quadrantRef}
            className="relative w-full"
            style={{
              aspectRatio: '1 / 1',
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--r-lg)',
              touchAction: 'none',
              cursor: 'crosshair',
              overflow: 'hidden',
              userSelect: 'none',
              WebkitUserSelect: 'none',
            }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
          >
            {/* 사분면 영역 라벨 — 각 사분면 중앙 */}
            <QuadrantLabel quadrant="top-left" text={qLabels.topLeft} />
            <QuadrantLabel quadrant="top-right" text={qLabels.topRight} />
            <QuadrantLabel quadrant="bottom-left" text={qLabels.bottomLeft} />
            <QuadrantLabel quadrant="bottom-right" text={qLabels.bottomRight} />

            {/* 십자선 */}
            <div
              className="absolute left-0 right-0"
              style={{ top: '50%', height: '1px', borderTop: '1px dashed var(--border)' }}
            />
            <div
              className="absolute bottom-0 top-0"
              style={{ left: '50%', width: '1px', borderLeft: '1px dashed var(--border)' }}
            />

            {/* 축 라벨 */}
            <span
              className="absolute"
              style={{ bottom: '4px', left: '50%', transform: 'translateX(-50%)', fontSize: '12px', fontWeight: 700, color: 'var(--text-sub)' }}
            >
              음식 퀄리티 →
            </span>
            <span
              className="absolute"
              style={{ left: '4px', top: '50%', transform: 'translateY(-50%) rotate(-90deg)', fontSize: '12px', fontWeight: 700, color: 'var(--text-sub)', transformOrigin: 'center' }}
            >
              경험 가치 →
            </span>

            {/* 참조 점 */}
            {referencePoints.slice(0, 12).map((point, i) => (
              <QuadrantRefDot
                key={i}
                x={point.x}
                y={point.y}
                satisfaction={point.satisfaction}
                name={point.name}
                score={point.score}
              />
            ))}

            {/* 현재 점 — 고정 크기, solid */}
            <div
              style={{
                position: 'absolute',
                left: `clamp(${DOT_SIZE / 2}px, ${value.x}%, calc(100% - ${DOT_SIZE / 2}px))`,
                bottom: `clamp(${DOT_SIZE / 2}px, ${value.y}%, calc(100% - ${DOT_SIZE / 2}px))`,
                transform: 'translate(-50%, 50%)',
                width: `${DOT_SIZE}px`,
                height: `${DOT_SIZE}px`,
                borderRadius: '50%',
                backgroundColor: totalColor,
                boxShadow: `0 0 ${6 + totalScore * 0.2}px ${3 + totalScore * 0.1}px ${totalColor}${totalScore > 60 ? 'B0' : '60'}`,
                transition: 'left 0.08s ease-out, bottom 0.08s ease-out, background-color 0.15s ease-out, box-shadow 0.15s ease-out',
                cursor: 'grab',
                touchAction: 'none',
                zIndex: 10,
              }}
            />
          </div>
        </div>
      </div>

      {/* 가격대 3단계 — restaurant만 */}
      {type === 'restaurant' && (
        <PriceLevelSelector />
      )}
    </div>
  )
}

/* ── 사분면 영역 라벨 ── */

function QuadrantLabel({ quadrant, text }: { quadrant: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'; text: string }) {
  const base: React.CSSProperties = {
    position: 'absolute',
    width: '50%',
    height: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '13px',
    fontWeight: 600,
    lineHeight: 1.4,
    color: 'var(--text-hint)',
    opacity: 0.4,
    whiteSpace: 'pre-line',
    textAlign: 'center',
    pointerEvents: 'none',
    zIndex: 1,
    padding: '8px',
  }

  if (quadrant === 'top-left') { base.top = 0; base.left = 0 }
  if (quadrant === 'top-right') { base.top = 0; base.right = 0 }
  if (quadrant === 'bottom-left') { base.bottom = 0; base.left = 0 }
  if (quadrant === 'bottom-right') { base.bottom = 0; base.right = 0 }

  return <span style={base}>{text}</span>
}

/* ── 세로 바 게이지 ── */

interface VerticalGaugeProps {
  label: string
  value: number
  color: string
  onChange: (value: number) => void
}

function VerticalGauge({ label, value, color, onChange }: VerticalGaugeProps) {
  const barRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)

  const updateValue = useCallback(
    (e: React.PointerEvent | PointerEvent) => {
      const rect = barRef.current?.getBoundingClientRect()
      if (!rect) return
      const relY = 1 - (e.clientY - rect.top) / rect.height
      const newVal = Math.max(0, Math.min(100, Math.round(relY * 100)))
      onChange(newVal)
    },
    [onChange],
  )

  return (
    <div className="flex flex-1 flex-col items-center gap-1.5" style={{ minHeight: 0 }}>
      {/* 라벨 — 줄바꿈 지원 */}
      <span
        className="shrink-0"
        style={{
          fontSize: '11px',
          fontWeight: 700,
          color: 'var(--text)',
          textAlign: 'center',
          lineHeight: 1.2,
          whiteSpace: 'pre-line',
        }}
      >
        {label}
      </span>

      {/* 바 */}
      <div
        ref={barRef}
        className="flex-1"
        style={{
          width: '32px',
          minHeight: '120px',
          backgroundColor: 'var(--bg)',
          border: '1px solid var(--border)',
          borderRadius: '16px',
          position: 'relative',
          touchAction: 'none',
          cursor: 'pointer',
          overflow: 'hidden',
        }}
        onPointerDown={(e) => {
          setIsDragging(true)
          updateValue(e)
          e.currentTarget.setPointerCapture(e.pointerId)
        }}
        onPointerMove={(e) => {
          if (isDragging) updateValue(e)
        }}
        onPointerUp={(e) => {
          setIsDragging(false)
          e.currentTarget.releasePointerCapture(e.pointerId)
        }}
      >
        {/* 채워진 영역 */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: `${value}%`,
            backgroundColor: color,
            borderRadius: '15px',
            transition: isDragging ? 'none' : 'height 0.1s ease-out',
          }}
        />
        {/* 바 안 숫자 */}
        <span
          style={{
            position: 'absolute',
            bottom: '6px',
            left: '50%',
            transform: 'translateX(-50%)',
            fontSize: '11px',
            fontWeight: 800,
            color: value > 20 ? '#FFFFFF' : color,
            zIndex: 2,
          }}
        >
          {value}
        </span>
      </div>
    </div>
  )
}

/* ── 가격대 3단계 ── */

/* ── 힌트 말풍선 ── */

interface HintBubbleProps {
  children: React.ReactNode
  style?: React.CSSProperties
  tailSide: 'top' | 'bottom' | 'left' | 'right'
  accentColor: string
  bgColor: string
}

function HintBubble({ children, style, tailSide, accentColor, bgColor }: HintBubbleProps) {
  const tailStyle: React.CSSProperties = {
    position: 'absolute',
    width: '10px',
    height: '10px',
    backgroundColor: bgColor,
    transform: 'rotate(45deg)',
  }

  if (tailSide === 'top') {
    tailStyle.top = '-5px'
    tailStyle.left = '50%'
    tailStyle.marginLeft = '-5px'
    tailStyle.borderLeft = `1.5px solid ${accentColor}`
    tailStyle.borderTop = `1.5px solid ${accentColor}`
  } else if (tailSide === 'bottom') {
    tailStyle.bottom = '-5px'
    tailStyle.left = '50%'
    tailStyle.marginLeft = '-5px'
    tailStyle.borderRight = `1.5px solid ${accentColor}`
    tailStyle.borderBottom = `1.5px solid ${accentColor}`
  } else if (tailSide === 'right') {
    tailStyle.right = '-5px'
    tailStyle.top = '50%'
    tailStyle.marginTop = '-5px'
    tailStyle.borderRight = `1.5px solid ${accentColor}`
    tailStyle.borderTop = `1.5px solid ${accentColor}`
  } else if (tailSide === 'left') {
    tailStyle.left = '-5px'
    tailStyle.top = '50%'
    tailStyle.marginTop = '-5px'
    tailStyle.borderLeft = `1.5px solid ${accentColor}`
    tailStyle.borderBottom = `1.5px solid ${accentColor}`
  }

  return (
    <div style={{ ...style, pointerEvents: 'none' }}>
      <div
        className="relative rounded-xl px-3.5 py-2.5 shadow-lg"
        style={{
          backgroundColor: bgColor,
          border: `1.5px solid ${accentColor}`,
          whiteSpace: 'nowrap',
        }}
      >
        <p style={{ fontSize: '12px', fontWeight: 600, color: accentColor, textAlign: 'center', lineHeight: 1.5 }}>
          {children}
        </p>
        <div style={tailStyle} />
      </div>
    </div>
  )
}

function PriceLevelSelector() {
  const [selected, setSelected] = useState<number | null>(null)

  return (
    <div className="flex w-full flex-col gap-1.5">
      <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>가격대</span>
      <div className="flex gap-2">
        {PRICE_LEVELS.map((level) => (
          <button
            key={level.value}
            type="button"
            onClick={() => setSelected(selected === level.value ? null : level.value)}
            className="flex flex-1 items-center justify-center rounded-lg py-2 transition-colors"
            style={{
              backgroundColor: selected === level.value ? 'var(--accent-food)' : 'var(--bg-card)',
              border: `1px solid ${selected === level.value ? 'var(--accent-food)' : 'var(--border)'}`,
              color: selected === level.value ? '#FFFFFF' : 'var(--text-sub)',
              fontSize: '13px',
              fontWeight: 600,
            }}
          >
            {level.label}
          </button>
        ))}
      </div>
    </div>
  )
}
