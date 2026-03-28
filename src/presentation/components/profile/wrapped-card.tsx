'use client'

import { Award } from 'lucide-react'
import type { WrappedData, WrappedCategory } from '@/domain/entities/profile'

interface WrappedCardProps {
  category: WrappedCategory
  data: WrappedData
}

export function WrappedCard({ category, data }: WrappedCardProps) {
  const accentColor = category === 'wine' ? 'var(--accent-wine)' : 'var(--accent-food)'

  return (
    <div
      className="mx-4 flex flex-col gap-4 rounded-2xl px-4 py-4"
      style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}
    >
      {/* Header */}
      <div className="flex items-center gap-2">
        <span style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text)' }}>
          나의 기록 요약
        </span>
      </div>

      {/* Level */}
      <div className="flex items-center gap-3">
        <div
          className="flex h-10 w-10 items-center justify-center rounded-xl"
          style={{ backgroundColor: `${accentColor}15` }}
        >
          <Award size={18} style={{ color: accentColor }} />
        </div>
        <div>
          <p style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text)' }}>
            Lv.{data.level.level} {data.level.title}
          </p>
          {data.level.axisLabel && (
            <p style={{ fontSize: '12px', color: 'var(--text-hint)' }}>{data.level.axisLabel}</p>
          )}
        </div>
      </div>

      {/* Stats */}
      {data.stats.length > 0 && (
        <div className="flex flex-col gap-2">
          {data.stats.map((stat) => (
            <div key={stat.label} className="flex items-center justify-between">
              <span style={{ fontSize: '13px', color: 'var(--text-sub)' }}>{stat.label}</span>
              <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)' }}>{stat.value}</span>
            </div>
          ))}
        </div>
      )}

      {/* Tags */}
      {data.tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {data.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full px-3 py-1"
              style={{ fontSize: '12px', backgroundColor: `${accentColor}10`, color: accentColor }}
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Top Items */}
      {data.topItems.length > 0 && (
        <div className="flex flex-col gap-2">
          <p style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)' }}>Top Picks</p>
          {data.topItems.map((item) => (
            <div key={item.rank} className="flex items-center gap-2">
              <span
                className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full"
                style={{ fontSize: '10px', fontWeight: 700, backgroundColor: `${accentColor}15`, color: accentColor }}
              >
                {item.rank}
              </span>
              <div className="min-w-0 flex-1">
                <span className="truncate" style={{ fontSize: '13px', color: 'var(--text)' }}>{item.name}</span>
                <span className="ml-1" style={{ fontSize: '11px', color: 'var(--text-hint)' }}>{item.meta}</span>
              </div>
              {item.score > 0 && (
                <span style={{ fontSize: '12px', fontWeight: 700, color: accentColor }}>{item.score}</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
