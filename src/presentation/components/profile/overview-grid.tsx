'use client'

import { Utensils, Wine, Star, TrendingUp } from 'lucide-react'
import type { ActivitySummary } from '@/domain/entities/profile'

interface OverviewGridProps {
  summary: ActivitySummary
}

const GRID_ITEMS: {
  key: keyof ActivitySummary
  label: string
  icon: typeof Utensils
  color: string
  format: (v: number) => string
}[] = [
  { key: 'restaurantVisits', label: '식당 방문', icon: Utensils, color: 'var(--accent-food)', format: (v) => `${v}곳` },
  { key: 'wineTastings', label: '와인 시음', icon: Wine, color: 'var(--accent-wine)', format: (v) => `${v}병` },
  { key: 'avgSatisfaction', label: '평균 만족도', icon: Star, color: '#C9A96E', format: (v) => v > 0 ? `${v}점` : '-' },
  { key: 'monthlyXp', label: '이번 달 XP', icon: TrendingUp, color: '#E8637A', format: (v) => `+${v}` },
]

export function OverviewGrid({ summary }: OverviewGridProps) {
  return (
    <div className="mx-4 grid grid-cols-2 gap-3">
      {GRID_ITEMS.map((item) => (
        <div
          key={item.key}
          className="flex items-center gap-3 rounded-2xl px-4 py-3"
          style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}
        >
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
            style={{ backgroundColor: `${item.color}15` }}
          >
            <item.icon size={16} style={{ color: item.color }} />
          </div>
          <div className="min-w-0">
            <p style={{ fontSize: '11px', color: 'var(--text-hint)' }}>{item.label}</p>
            <p style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text)' }}>
              {item.format(summary[item.key])}
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}
