'use client'

import { Globe } from 'lucide-react'
import type { WineRegionMapData } from '@/domain/entities/profile'

interface WineRegionMapSimpleProps {
  data: WineRegionMapData[]
}

const WINE_TYPE_COLORS: Record<string, string> = {
  red: '#722F37',
  white: '#D4C98A',
  rose: '#E8A0B0',
  sparkling: '#C8D8A0',
}

/**
 * 와인 산지 간이 지도 (S10에서 3단계 드릴다운으로 고도화 예정).
 * 현재: 국가별 바 리스트 + 타입 도트.
 */
export function WineRegionMapSimple({ data }: WineRegionMapSimpleProps) {
  if (data.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center rounded-xl py-8"
        style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}
      >
        <Globe size={28} style={{ color: 'var(--text-hint)' }} />
        <p className="mt-2" style={{ fontSize: '13px', color: 'var(--text-hint)' }}>
          아직 와인 기록이 없어요
        </p>
      </div>
    )
  }

  const sorted = [...data].sort((a, b) => b.totalWines - a.totalWines)
  const maxCount = sorted[0]?.totalWines ?? 1

  return (
    <div className="flex flex-col gap-3">
      {/* 헤더 */}
      <div className="flex items-center gap-1.5">
        <Globe size={14} style={{ color: 'var(--accent-wine)' }} />
        <span style={{ fontSize: '12px', color: 'var(--text-sub)' }}>
          {data.length}개 국가
        </span>
      </div>

      {/* 국가별 리스트 */}
      <div
        className="flex flex-col overflow-hidden rounded-xl"
        style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}
      >
        {sorted.map((country, idx) => (
          <div
            key={country.countryCode}
            className="flex items-center gap-3 px-3.5 py-2.5"
            style={{ borderBottom: idx < sorted.length - 1 ? '1px solid var(--border)' : undefined }}
          >
            {/* 국가명 */}
            <span className="w-16 shrink-0 truncate" style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>
              {country.country}
            </span>

            {/* 바 */}
            <div className="flex-1">
              <div
                className="h-2 rounded-full"
                style={{
                  width: `${Math.max(8, (country.totalWines / maxCount) * 100)}%`,
                  backgroundColor: 'var(--accent-wine)',
                  opacity: 0.3 + (country.totalWines / maxCount) * 0.7,
                }}
              />
            </div>

            {/* 타입 도트 */}
            <div className="flex shrink-0 items-center gap-1">
              {Object.entries(country.typeBreakdown).map(([type, count]) => {
                if (count === 0) return null
                return (
                  <div
                    key={type}
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: WINE_TYPE_COLORS[type] ?? 'var(--text-hint)' }}
                    title={`${type}: ${count}`}
                  />
                )
              })}
            </div>

            {/* 수량 */}
            <span className="w-6 shrink-0 text-right" style={{ fontSize: '12px', fontWeight: 700, color: 'var(--accent-wine)' }}>
              {country.totalWines}
            </span>
          </div>
        ))}
      </div>

      {/* 범례 */}
      <div className="flex items-center justify-center gap-3">
        {Object.entries(WINE_TYPE_COLORS).map(([type, color]) => (
          <div key={type} className="flex items-center gap-1">
            <div className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
            <span style={{ fontSize: '10px', color: 'var(--text-hint)' }}>
              {TYPE_LABELS[type] ?? type}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

const TYPE_LABELS: Record<string, string> = {
  red: '레드',
  white: '화이트',
  rose: '로제',
  sparkling: '스파클링',
}
