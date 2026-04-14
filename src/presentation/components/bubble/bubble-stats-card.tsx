'use client'

import { Users, BookOpen, Star, TrendingUp } from 'lucide-react'

const DAY_LABELS = ['월', '화', '수', '목', '금', '토', '일']

interface BubbleStatsCardProps {
  recordCount: number
  memberCount: number
  weeklyRecordCount: number
  prevWeeklyRecordCount: number
  avgSatisfaction: number | null
  weeklyChartData: number[]  // 7일치 기록 수 [월,화,수,목,금,토,일]
}

export function BubbleStatsCard({
  recordCount,
  memberCount,
  weeklyRecordCount,
  prevWeeklyRecordCount,
  avgSatisfaction,
  weeklyChartData,
}: BubbleStatsCardProps) {
  // 주간 활성도 증감률 계산
  const delta = weeklyRecordCount - prevWeeklyRecordCount
  const pct = prevWeeklyRecordCount > 0
    ? Math.round((delta / prevWeeklyRecordCount) * 100)
    : weeklyRecordCount > 0 ? 100 : 0

  const pctColor = pct > 0 ? 'var(--positive)' : pct < 0 ? 'var(--negative)' : 'var(--text-hint)'
  const pctText = pct > 0 ? `+${pct}%` : `${pct}%`

  const stats = [
    { icon: BookOpen, label: '총 기록', value: String(recordCount), color: 'var(--accent-food)' },
    { icon: Users, label: '멤버 수', value: String(memberCount), color: 'var(--accent-social)' },
    { icon: TrendingUp, label: '주간 활성도', value: pctText, color: pctColor },
    { icon: Star, label: '평균 만족도', value: avgSatisfaction !== null ? String(avgSatisfaction) : '-', color: 'var(--accent-wine)' },
  ]

  const maxCount = Math.max(...weeklyChartData, 1)
  const todayIndex = (new Date().getDay() + 6) % 7 // 월=0, 일=6

  return (
    <div className="flex flex-col gap-4">
      {/* 2×2 그리드 */}
      <div className="grid grid-cols-2 gap-3">
        {stats.map(({ icon: Icon, label, value, color }) => (
          <div
            key={label}
            className="flex items-center gap-2.5 rounded-xl p-3"
            style={{ backgroundColor: 'var(--bg)', border: '1px solid var(--border)' }}
          >
            <Icon size={16} style={{ color }} />
            <div>
              <p className="text-[15px] font-bold text-[var(--text)]" style={label === '주간 활성도' ? { color } : undefined}>
                {value}
              </p>
              <p className="text-[10px] text-[var(--text-hint)]">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* 주간 기록 추이 바 차트 */}
      {weeklyChartData.length > 0 && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <p className="text-[12px] font-semibold text-[var(--text-sub)]">주간 기록 추이</p>
            <p className="text-[11px] font-semibold" style={{ color: 'var(--accent-social)' }}>
              총 {weeklyChartData.reduce((a, b) => a + b, 0)}건
            </p>
          </div>
          <div className="flex items-end gap-1" style={{ height: '80px' }}>
            {weeklyChartData.map((count, i) => {
              const isToday = i === todayIndex
              return (
                <div key={DAY_LABELS[i]} className="flex flex-1 flex-col items-center gap-0.5">
                  <span
                    className="text-[9px] font-semibold"
                    style={{ color: isToday ? 'var(--accent-social)' : 'var(--text-hint)', opacity: count > 0 ? 1 : 0.4 }}
                  >
                    {count}
                  </span>
                  <div
                    className="w-full rounded-t"
                    style={{
                      height: `${Math.max(4, (count / maxCount) * 48)}px`,
                      backgroundColor: isToday ? 'var(--accent-social)' : 'var(--primary)',
                      opacity: isToday ? 1 : 0.3,
                    }}
                  />
                  <span
                    className="text-[9px]"
                    style={{ color: isToday ? 'var(--accent-social)' : 'var(--text-hint)', fontWeight: isToday ? 600 : 400 }}
                  >
                    {DAY_LABELS[i]}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
