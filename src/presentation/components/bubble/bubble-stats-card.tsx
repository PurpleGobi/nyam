'use client'

import { Users, BookOpen, Star, TrendingUp } from 'lucide-react'

interface WeeklyData {
  label: string
  count: number
}

interface BubbleStatsCardProps {
  memberCount: number
  recordCount: number
  avgSatisfaction: number | null
  weeklyShareCount: number
  weeklyData?: WeeklyData[]
}

export function BubbleStatsCard({
  memberCount,
  recordCount,
  avgSatisfaction,
  weeklyShareCount,
  weeklyData,
}: BubbleStatsCardProps) {
  const stats = [
    { icon: Users, label: '멤버', value: memberCount, color: 'var(--accent-social)' },
    { icon: BookOpen, label: '기록', value: recordCount, color: 'var(--accent-food)' },
    { icon: Star, label: '평균', value: avgSatisfaction?.toFixed(1) ?? '-', color: 'var(--accent-wine)' },
    { icon: TrendingUp, label: '주간', value: weeklyShareCount, color: 'var(--positive)' },
  ]

  const maxCount = weeklyData ? Math.max(...weeklyData.map((d) => d.count), 1) : 1

  return (
    <div className="flex flex-col gap-4 rounded-xl p-4" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
      {/* 2x2 그리드 */}
      <div className="grid grid-cols-2 gap-3">
        {stats.map(({ icon: Icon, label, value, color }) => (
          <div key={label} className="flex items-center gap-2">
            <Icon size={16} style={{ color }} />
            <div>
              <p className="text-[14px] font-bold text-[var(--text)]">{value}</p>
              <p className="text-[10px] text-[var(--text-hint)]">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* 주간 바 차트 */}
      {weeklyData && weeklyData.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-[12px] font-semibold text-[var(--text-sub)]">주간 활동</p>
          <div className="flex items-end gap-1" style={{ height: '60px' }}>
            {weeklyData.map(({ label, count }) => (
              <div key={label} className="flex flex-1 flex-col items-center gap-1">
                <div
                  className="w-full rounded-t"
                  style={{
                    height: `${Math.max(4, (count / maxCount) * 48)}px`,
                    backgroundColor: 'var(--accent-social)',
                    opacity: count > 0 ? 1 : 0.2,
                  }}
                />
                <span className="text-[9px] text-[var(--text-hint)]">{label}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
