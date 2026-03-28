'use client'

import { Info } from 'lucide-react'
import type { QuadrantRefDot } from '@/domain/repositories/restaurant-repository'

interface QuadrantDisplayProps {
  currentName: string
  currentDot: { axisX: number; axisY: number; satisfaction: number } | null
  refDots: QuadrantRefDot[]
  accentColor: string         // '--accent-food' | '--accent-wine'
  xAxisLabels: [string, string]
  yAxisLabels: [string, string]
  isVisible: boolean
  sectionTitle: string
  sectionMeta: string
}

/** 와인/식당별 분기 스타일 */
function getThemeStyles(accentColor: string) {
  const isWine = accentColor === '--accent-wine'
  return {
    crosshairColor: isWine ? 'var(--accent-wine-dim)' : 'var(--border)',
    axisLabelColor: isWine ? 'var(--accent-wine)' : 'var(--text-sub)',
    chartBg: isWine ? 'var(--accent-wine-light)' : 'var(--bg-elevated)',
    chartBorder: isWine ? 'var(--accent-wine-dim)' : 'var(--border)',
    dotShadow: isWine ? 'rgba(139,115,150,0.4)' : 'rgba(193,123,94,0.4)',
    caption: isWine
      ? '내가 리뷰한 와인과의 상대적 위치'
      : '내가 리뷰한 비슷한 가격대·지역 식당과의 상대적 위치',
  }
}

export function QuadrantDisplay({
  currentName,
  currentDot,
  refDots,
  accentColor,
  xAxisLabels,
  yAxisLabels,
  isVisible,
  sectionTitle,
  sectionMeta,
}: QuadrantDisplayProps) {
  if (!isVisible) return null

  const theme = getThemeStyles(accentColor)

  return (
    <section style={{ padding: '16px 20px' }}>
      {/* 섹션 헤더 */}
      <div className="mb-3.5 flex items-center justify-between">
        <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text)' }}>
          {sectionTitle}
        </span>
        <span style={{ fontSize: '12px', color: 'var(--text-sub)' }}>
          {sectionMeta}
        </span>
      </div>

      {/* 차트 컨테이너 */}
      <div
        className="rounded-xl p-4"
        style={{ backgroundColor: theme.chartBg, border: `1px solid ${theme.chartBorder}` }}
      >
        {/* 상단 Y축 라벨 */}
        <div className="mb-1 text-center">
          <span style={{ fontSize: '9px', fontWeight: 500, color: theme.axisLabelColor }}>
            {yAxisLabels[1]}
          </span>
        </div>

        <div className="flex items-center gap-1">
          {/* 좌측 X축 라벨 */}
          <span
            className="w-10 shrink-0 text-right"
            style={{ fontSize: '9px', fontWeight: 500, color: theme.axisLabelColor }}
          >
            {xAxisLabels[0]}
          </span>

          {/* 차트 영역 (4:5 비율) */}
          <div
            className="relative w-full overflow-hidden rounded-lg"
            style={{
              paddingBottom: '80%',
              backgroundColor: theme.chartBg,
              border: `1px solid ${theme.chartBorder}`,
            }}
          >
            {/* 십자선 */}
            <div
              className="absolute left-0 right-0"
              style={{ top: '50%', height: '1px', borderTop: `1px solid ${theme.crosshairColor}` }}
            />
            <div
              className="absolute bottom-0 top-0"
              style={{ left: '50%', width: '1px', borderLeft: `1px solid ${theme.crosshairColor}` }}
            />

            {/* 참조 dot */}
            {refDots.slice(0, 12).map((dot) => (
              <div
                key={dot.targetId}
                className="group absolute flex flex-col items-center"
                style={{
                  left: `${dot.avgAxisX}%`,
                  bottom: `${dot.avgAxisY}%`,
                  transform: 'translate(-50%, 50%)',
                  zIndex: 5,
                }}
              >
                <div
                  className="flex items-center justify-center rounded-full transition-all group-hover:scale-[1.15] group-hover:opacity-70"
                  style={{
                    width: '28px',
                    height: '28px',
                    backgroundColor: 'var(--border-bold)',
                    border: '2px solid var(--border)',
                    opacity: 0.35,
                  }}
                >
                  <span style={{ fontSize: '8px', fontWeight: 600, color: 'var(--text)' }}>
                    {dot.avgSatisfaction}
                  </span>
                </div>
                <span
                  className="mt-0.5 whitespace-nowrap"
                  style={{ fontSize: '9px', color: 'var(--text-hint)' }}
                >
                  {dot.targetName}
                </span>
              </div>
            ))}

            {/* 현재 dot */}
            {currentDot && (
              <div
                className="absolute flex flex-col items-center"
                style={{
                  left: `${currentDot.axisX}%`,
                  bottom: `${currentDot.axisY}%`,
                  transform: 'translate(-50%, 50%)',
                  zIndex: 10,
                }}
              >
                <div
                  className="flex items-center justify-center rounded-full"
                  style={{
                    width: '38px',
                    height: '38px',
                    backgroundColor: `var(${accentColor})`,
                    border: `3px solid var(${accentColor}-light)`,
                    boxShadow: `0 2px 10px ${theme.dotShadow}`,
                  }}
                >
                  <span style={{ fontSize: '11px', fontWeight: 800, color: '#FFFFFF' }}>
                    {currentDot.satisfaction}
                  </span>
                </div>
                <span
                  className="mt-0.5 whitespace-nowrap"
                  style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-sub)' }}
                >
                  {currentName}
                </span>
              </div>
            )}
          </div>

          {/* 우측 X축 라벨 */}
          <span
            className="w-10 shrink-0"
            style={{ fontSize: '9px', fontWeight: 500, color: theme.axisLabelColor }}
          >
            {xAxisLabels[1]}
          </span>
        </div>

        {/* 하단 Y축 라벨 */}
        <div className="mt-1 text-center">
          <span style={{ fontSize: '9px', fontWeight: 500, color: theme.axisLabelColor }}>
            {yAxisLabels[0]}
          </span>
        </div>
      </div>

      {/* 캡션 */}
      <div className="mt-2 flex items-center gap-1">
        <Info size={12} style={{ color: 'var(--text-hint)', flexShrink: 0 }} />
        <span style={{ fontSize: '11px', color: 'var(--text-hint)' }}>
          {theme.caption}
        </span>
      </div>
    </section>
  )
}
