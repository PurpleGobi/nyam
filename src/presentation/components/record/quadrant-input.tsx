'use client'

import { useRef, useState, useCallback } from 'react'
import { Info } from 'lucide-react'
import { getGaugeColor } from '@/shared/utils/gauge-color'
import { QuadrantRefDot } from '@/presentation/components/record/quadrant-ref-dot'

interface QuadrantInputProps {
  /** 'restaurant': X=음식 퀄리티, Y=경험 만족도 / 'wine': X=구조·완성도, Y=경험 만족도 */
  type: 'restaurant' | 'wine'
  value: { x: number; y: number; satisfaction?: number }
  onChange: (value: { x: number; y: number; satisfaction?: number }) => void
  referencePoints?: Array<{
    x: number
    y: number
    satisfaction: number
    name: string
    score: number
    targetId?: string
    targetType?: 'restaurant' | 'wine'
    isMicroDot?: boolean
  }>
  showHint?: boolean
  /** true면 현재 dot 숨김 (터치 전 상태) */
  hideDot?: boolean
  /** true면 모든 인터랙션 비활성 (상세페이지 읽기 전용) */
  readOnly?: boolean
  /** 참조 dot 롱프레스 시 상세페이지로 이동 콜백 */
  onRefNavigate?: (targetId: string, targetType: 'restaurant' | 'wine') => void
  /** 참조 dot 롱프레스 시 인덱스 기반 콜백 (onRefNavigate보다 우선) */
  onRefLongPress?: (refIndex: number) => void
  /** 사분면 방문기록/비교 모드 */
  quadrantMode?: 'visits' | 'compare'
  onQuadrantModeChange?: (mode: 'visits' | 'compare') => void
}

const DOT_SIZE = 20

const AXIS_LABELS = {
  restaurant: {
    xLabel: '맛,음식\n완성도',
    yLabel: '경험\n만족도',
    xAxis: '맛,음식 완성도 →',
    yAxis: '경험 만족도 →',
  },
  wine: {
    xLabel: '구조\n완성도',
    yLabel: '경험\n만족도',
    xAxis: '구조 · 완성도 →',
    yAxis: '경험 만족도 →',
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
    topRight: '잘 만들어졌고\n마시면서도 좋은',
    topLeft: '완성도는 아쉽지만\n마시면서 좋았던',
    bottomRight: '잘 만들어졌지만\n감흥이 적은',
    bottomLeft: '전반적으로\n아쉬운',
  },
} as const

export function QuadrantInput({ type, value, onChange, referencePoints = [], showHint = false, hideDot = false, readOnly = false, onRefNavigate, onRefLongPress, quadrantMode, onQuadrantModeChange }: QuadrantInputProps) {
  const quadrantRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [selectedRefIdx, setSelectedRefIdx] = useState<number | null>(null)
  const [showLabels, setShowLabels] = useState(false)
  const [prevMode, setPrevMode] = useState(quadrantMode)
  if (prevMode !== quadrantMode) {
    setPrevMode(quadrantMode)
    if (selectedRefIdx !== null) setSelectedRefIdx(null)
  }

  // 겹친 점 순환: 같은 위치의 점들을 찾아 다음 점으로 이동
  const OVERLAP_THRESHOLD = 5 // %단위, 이 범위 내면 겹친 것으로 판단
  const handleRefSelect = useCallback((tappedIdx: number) => {
    const tapped = referencePoints[tappedIdx]
    if (!tapped) return

    // 같은 위치에 겹친 점들의 인덱스 목록
    const overlapping = referencePoints
      .map((p, i) => i)
      .filter((i) => {
        const p = referencePoints[i]
        return Math.abs(p.x - tapped.x) < OVERLAP_THRESHOLD && Math.abs(p.y - tapped.y) < OVERLAP_THRESHOLD
      })

    if (overlapping.length <= 1) {
      // 겹침 없음 — 토글
      setSelectedRefIdx(selectedRefIdx === tappedIdx ? null : tappedIdx)
    } else {
      // 겹침 있음 — 순환
      const currentPosInGroup = selectedRefIdx !== null ? overlapping.indexOf(selectedRefIdx) : -1
      const nextPosInGroup = (currentPosInGroup + 1) % overlapping.length
      const nextIdx = overlapping[nextPosInGroup]
      // 한 바퀴 돌아서 다시 처음이고 이미 선택 중이면 해제
      if (nextIdx === selectedRefIdx) {
        setSelectedRefIdx(null)
      } else {
        setSelectedRefIdx(nextIdx)
      }
    }
  }, [referencePoints, selectedRefIdx])

  const labels = AXIS_LABELS[type]
  const qLabels = QUADRANT_LABELS[type]
  const totalScore = Math.round((value.x + value.y) / 2)
  const foodColor = getGaugeColor(value.x, 'food')
  const expColor = getGaugeColor(value.y, 'experience')
  const dotChannel = type === 'wine' ? 'wine-total' as const : 'total' as const
  const totalColor = getGaugeColor(totalScore, dotChannel)

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
        <div className="relative flex flex-col items-center gap-3" style={{ width: '96px', zIndex: 5 }}>
          <div className="flex w-full flex-1 gap-1.5">
            <VerticalGauge
              label={labels.xLabel}
              value={value.x}
              color={foodColor}
              onChange={(v) => onChange({ x: v, y: value.y, satisfaction: value.satisfaction })}
              readOnly={readOnly}
            />
            <VerticalGauge
              label={labels.yLabel}
              value={value.y}
              color={expColor}
              onChange={(v) => onChange({ x: value.x, y: v, satisfaction: value.satisfaction })}
              readOnly={readOnly}
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
                  {type === 'wine' ? '구조 · 완성도' : '맛,음식 완성도'}<br />바를 터치
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
              accentColor={type === 'wine' ? 'var(--accent-wine)' : 'var(--accent-food)'}
              bgColor={type === 'wine' ? 'var(--accent-wine-light)' : 'var(--accent-food-light)'}
            >
              사분면을 터치하여<br />만족도를 표시해주세요
            </HintBubble>
          )}
          {/* 사분면 우측 상단 버튼들 */}
          <div
            style={{
              position: 'absolute',
              top: '-28px',
              right: '0px',
              zIndex: 25,
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <button
              type="button"
              onClick={() => setShowLabels((v) => !v)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '3px',
                padding: '3px 8px',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: showLabels ? (type === 'wine' ? 'var(--accent-wine)' : 'var(--accent-food)') : 'var(--bg-elevated)',
                cursor: 'pointer',
                transition: 'all 0.15s',
                opacity: showLabels ? 1 : 0.7,
              }}
            >
              <Info size={11} style={{ color: showLabels ? '#fff' : 'var(--text-sub)' }} />
              <span style={{ fontSize: '10px', fontWeight: 600, color: showLabels ? '#fff' : 'var(--text-sub)' }}>
                가이드
              </span>
            </button>
            {quadrantMode && onQuadrantModeChange && (
              <button
                type="button"
                onClick={() => onQuadrantModeChange(quadrantMode === 'compare' ? 'visits' : 'compare')}
                style={{
                  display: 'flex',
                  borderRadius: '6px',
                  overflow: 'hidden',
                  backgroundColor: 'var(--bg-elevated)',
                  border: 'none',
                  padding: 0,
                  cursor: 'pointer',
                }}
              >
                <span
                  style={{
                    padding: '3px 8px',
                    fontSize: '10px',
                    fontWeight: 600,
                    transition: 'all 0.15s',
                    backgroundColor: quadrantMode === 'compare' ? (type === 'wine' ? 'var(--accent-wine)' : 'var(--accent-food)') : 'transparent',
                    color: quadrantMode === 'compare' ? '#fff' : 'var(--text-hint)',
                    borderRadius: quadrantMode === 'compare' ? '6px' : 0,
                  }}
                >
                  비교
                </span>
                <span
                  style={{
                    padding: '3px 8px',
                    fontSize: '10px',
                    fontWeight: 600,
                    transition: 'all 0.15s',
                    backgroundColor: quadrantMode === 'visits' ? (type === 'wine' ? 'var(--accent-wine)' : 'var(--accent-food)') : 'transparent',
                    color: quadrantMode === 'visits' ? '#fff' : 'var(--text-hint)',
                    borderRadius: quadrantMode === 'visits' ? '6px' : 0,
                  }}
                >
                  방문기록
                </span>
              </button>
            )}
          </div>
          {/* 사분면 박스 */}
          <div
            ref={quadrantRef}
            className="relative w-full"
            style={{
              aspectRatio: '1 / 1',
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--r-lg)',
              touchAction: readOnly ? 'auto' : 'none',
              cursor: readOnly ? 'default' : 'crosshair',
              overflow: 'hidden',
              userSelect: 'none',
              WebkitUserSelect: 'none',
            }}
            onPointerDown={readOnly ? undefined : handlePointerDown}
            onPointerMove={readOnly ? undefined : handlePointerMove}
            onPointerUp={readOnly ? undefined : handlePointerUp}
          >
            {/* 사분면 영역 라벨 — i 버튼으로 토글 */}
            {showLabels && (
              <>
                <QuadrantLabel quadrant="top-left" text={qLabels.topLeft} />
                <QuadrantLabel quadrant="top-right" text={qLabels.topRight} />
                <QuadrantLabel quadrant="bottom-left" text={qLabels.bottomLeft} />
                <QuadrantLabel quadrant="bottom-right" text={qLabels.bottomRight} />
              </>
            )}

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
              style={{ bottom: '4px', left: '50%', transform: 'translateX(-50%)', fontSize: '12px', fontWeight: 700, color: 'var(--text-sub)', zIndex: 2 }}
            >
              {labels.xAxis}
            </span>
            <span
              className="absolute"
              style={{ left: '14px', top: '50%', transform: 'translate(-50%, -50%) rotate(-90deg)', fontSize: '12px', fontWeight: 700, color: 'var(--text-sub)', zIndex: 2 }}
            >
              {labels.yAxis}
            </span>

            {/* 참조 점 — 메인 dot과 동일 채널 색상 */}
            {referencePoints.slice(0, referencePoints.some((p) => p.isMicroDot) ? 20 : 12).map((point, i) => (
              <QuadrantRefDot
                key={i}
                x={point.x}
                y={point.y}
                satisfaction={point.satisfaction}
                name={point.name}
                score={point.score}
                channel={type === 'wine' ? 'wine-total' : 'total'}
                isActive={selectedRefIdx === i}
                isMicroDot={point.isMicroDot}
                onSelect={() => handleRefSelect(i)}
                onLongPress={
                  onRefLongPress
                    ? () => onRefLongPress(i)
                    : onRefNavigate && point.targetId && point.targetType
                      ? () => onRefNavigate(point.targetId ?? '', point.targetType ?? 'restaurant')
                      : undefined
                }
              />
            ))}

            {/* 현재 점 — 고정 크기, solid, hideDot이면 숨김 */}
            {!hideDot && <div
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
                cursor: readOnly ? 'default' : 'grab',
                touchAction: 'none',
                zIndex: 10,
              }}
            />}
          </div>
        </div>
      </div>

    </div>
  )
}

/* ── 사분면 영역 라벨 ── */

const QUADRANT_STYLES: Record<string, { color: string; bg: string }> = {
  'top-right':    { color: '#3A7D5C', bg: 'rgba(58, 125, 92, 0.08)' },   // 녹색 — 최고
  'top-left':     { color: '#7A6C3A', bg: 'rgba(122, 108, 58, 0.08)' },  // 황갈 — 경험↑ 맛↓
  'bottom-right': { color: '#4A6FA5', bg: 'rgba(74, 111, 165, 0.08)' },  // 청색 — 맛↑ 경험↓
  'bottom-left':  { color: '#9E6B6B', bg: 'rgba(158, 107, 107, 0.08)' }, // 적갈 — 아쉬움
}

function QuadrantLabel({ quadrant, text }: { quadrant: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'; text: string }) {
  const style = QUADRANT_STYLES[quadrant]
  const base: React.CSSProperties = {
    position: 'absolute',
    width: '50%',
    height: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '13px',
    fontWeight: 700,
    lineHeight: 1.4,
    color: style.color,
    backgroundColor: style.bg,
    whiteSpace: 'pre-line',
    textAlign: 'center',
    pointerEvents: 'none',
    zIndex: 1,
    padding: '8px',
    transition: 'opacity 0.2s',
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
  readOnly?: boolean
}

function VerticalGauge({ label, value, color, onChange, readOnly = false }: VerticalGaugeProps) {
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
          touchAction: readOnly ? 'auto' : 'none',
          cursor: readOnly ? 'default' : 'pointer',
          overflow: 'hidden',
        }}
        onPointerDown={readOnly ? undefined : (e) => {
          setIsDragging(true)
          updateValue(e)
          e.currentTarget.setPointerCapture(e.pointerId)
        }}
        onPointerMove={readOnly ? undefined : (e) => {
          if (isDragging) updateValue(e)
        }}
        onPointerUp={readOnly ? undefined : (e) => {
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

