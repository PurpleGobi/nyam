'use client'

import { FileText, Star, TrendingUp, MapPin } from 'lucide-react'

interface BubbleQuickStatsProps {
  recordCount: number
  avgSatisfaction: number | null
  weeklyRecordCount: number
  uniqueTargetCount: number
}

export function BubbleQuickStats({
  recordCount,
  avgSatisfaction,
  weeklyRecordCount,
  uniqueTargetCount,
}: BubbleQuickStatsProps) {
  const stats = [
    { icon: FileText, label: '총 기록', value: String(recordCount), color: 'var(--text-sub)' },
    { icon: Star, label: '평균 점수', value: avgSatisfaction?.toFixed(1) ?? '-', color: 'var(--text-sub)' },
    { icon: TrendingUp, label: '이번 주', value: String(weeklyRecordCount), color: 'var(--positive)' },
    { icon: MapPin, label: '고유 장소', value: String(uniqueTargetCount), color: 'var(--text-sub)' },
  ]

  return (
    <div className="flex gap-2 overflow-x-auto px-4 scrollbar-hide">
      {stats.map(({ icon: Icon, label, value, color }) => (
        <div
          key={label}
          className="card flex shrink-0 items-center gap-2 rounded-xl px-3 py-2.5"
        >
          <Icon size={15} style={{ color }} />
          <div>
            <p className="text-[14px] font-bold" style={{ color: color === 'var(--positive)' ? color : 'var(--text)' }}>{value}</p>
            <p className="text-[10px]" style={{ color: 'var(--text-hint)' }}>{label}</p>
          </div>
        </div>
      ))}
    </div>
  )
}
