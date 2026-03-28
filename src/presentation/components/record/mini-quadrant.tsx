'use client'

import { Edit2 } from 'lucide-react'
import { getGaugeColor } from '@/shared/utils/gauge-color'

interface QuadrantDot {
  axisX: number
  axisY: number
  satisfaction: number
}

interface MiniQuadrantProps {
  /** 이 기록의 좌표 */
  currentDot: QuadrantDot | null
  /** 같은 대상의 다른 기록 좌표 */
  refDots: QuadrantDot[]
  targetType: 'restaurant' | 'wine'
  /** 탭 → 대상 상세 페이지 */
  onTap: () => void
  /** 빈 상태 → 수정 모드 */
  onEdit?: () => void
}

const LABELS = {
  restaurant: { xL: '저렴', xR: '고가', yT: '포멀', yB: '캐주얼' },
  wine: { xL: '산미↓', xR: '산미↑', yT: 'Full', yB: 'Light' },
}

/** 설계 스펙: 만족도 → 점 지름 이산 5단계 매핑 */
function getDotSize(satisfaction: number): number {
  if (satisfaction <= 20) return 14
  if (satisfaction <= 40) return 20
  if (satisfaction <= 60) return 26
  if (satisfaction <= 80) return 36
  return 48
}

export function MiniQuadrant({ currentDot, refDots, targetType, onTap, onEdit }: MiniQuadrantProps) {
  const labels = LABELS[targetType]

  // 빈 상태: axisX/axisY 없음
  if (!currentDot) {
    return (
      <div
        className="flex flex-col items-center justify-center rounded-xl"
        style={{ height: '192px', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}
      >
        <p style={{ fontSize: '14px', color: 'var(--text-sub)' }}>사분면 평가를 추가해보세요</p>
        {onEdit && (
          <button
            type="button"
            onClick={onEdit}
            className="mt-3 inline-flex items-center gap-1.5 rounded-full px-4 py-2"
            style={{
              fontSize: '13px',
              fontWeight: 600,
              color: 'var(--text)',
              border: '1px solid var(--border)',
            }}
          >
            <Edit2 size={14} />
            평가하기
          </button>
        )}
      </div>
    )
  }

  return (
    <div
      className="relative mx-auto w-full max-w-[240px] cursor-pointer"
      style={{ height: '192px' }}
      onClick={onTap}
    >
      {/* 축 라벨 */}
      <span className="absolute left-0 top-1/2 -translate-y-1/2 text-[9px] text-[var(--text-hint)]">{labels.xL}</span>
      <span className="absolute right-0 top-1/2 -translate-y-1/2 text-[9px] text-[var(--text-hint)]">{labels.xR}</span>
      <span className="absolute left-1/2 top-0 -translate-x-1/2 text-[9px] text-[var(--text-hint)]">{labels.yT}</span>
      <span className="absolute bottom-0 left-1/2 -translate-x-1/2 text-[9px] text-[var(--text-hint)]">{labels.yB}</span>

      {/* 사분면 영역 */}
      <div
        className="absolute inset-4 overflow-hidden rounded-lg"
        style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}
      >
        <div className="absolute left-0 right-0" style={{ top: '50%', height: '1px', borderTop: '1px dashed var(--border)' }} />
        <div className="absolute bottom-0 top-0" style={{ left: '50%', width: '1px', borderLeft: '1px dashed var(--border)' }} />

        {/* 참조 점 (다른 기록, 반투명 30%) */}
        {refDots.map((dot, i) => {
          const size = getDotSize(dot.satisfaction)
          return (
            <div
              key={`ref-${i}`}
              className="absolute rounded-full"
              style={{
                left: `${dot.axisX}%`,
                bottom: `${dot.axisY}%`,
                transform: 'translate(-50%, 50%)',
                width: `${size}px`,
                height: `${size}px`,
                backgroundColor: getGaugeColor(dot.satisfaction),
                opacity: 0.3,
              }}
            />
          )
        })}

        {/* 현재 기록 점 (불투명) */}
        {(() => {
          const size = getDotSize(currentDot.satisfaction)
          return (
            <div
              className="absolute rounded-full"
              style={{
                left: `${currentDot.axisX}%`,
                bottom: `${currentDot.axisY}%`,
                transform: 'translate(-50%, 50%)',
                width: `${size}px`,
                height: `${size}px`,
                backgroundColor: getGaugeColor(currentDot.satisfaction),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <span style={{ fontSize: '9px', fontWeight: 800, color: '#FFFFFF' }}>
                {currentDot.satisfaction}
              </span>
            </div>
          )
        })()}
      </div>
    </div>
  )
}
