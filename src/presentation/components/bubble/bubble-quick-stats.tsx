'use client'

import { Users, BookOpen, Star, TrendingUp } from 'lucide-react'

interface BubbleQuickStatsProps {
  memberCount: number
  recordCount: number
  avgSatisfaction: number | null
  weeklyShareCount: number
}

export function BubbleQuickStats({ memberCount, recordCount, avgSatisfaction, weeklyShareCount }: BubbleQuickStatsProps) {
  const stats = [
    { icon: Users, label: '멤버', value: String(memberCount), color: 'var(--accent-social)' },
    { icon: BookOpen, label: '기록', value: String(recordCount), color: 'var(--accent-food)' },
    { icon: Star, label: '평균 만족도', value: avgSatisfaction?.toFixed(1) ?? '-', color: 'var(--accent-wine)' },
    { icon: TrendingUp, label: '주간 공유', value: String(weeklyShareCount), color: 'var(--positive)' },
  ]

  return (
    <div className="grid grid-cols-2 gap-2 px-4">
      {stats.map(({ icon: Icon, label, value, color }) => (
        <div
          key={label}
          className="flex items-center gap-2.5 rounded-xl p-3"
          style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}
        >
          <div
            className="flex h-8 w-8 items-center justify-center rounded-lg"
            style={{ backgroundColor: `${color}15` }}
          >
            <Icon size={16} style={{ color }} />
          </div>
          <div>
            <p className="text-[15px] font-bold text-[var(--text)]">{value}</p>
            <p className="text-[10px] text-[var(--text-hint)]">{label}</p>
          </div>
        </div>
      ))}
    </div>
  )
}
