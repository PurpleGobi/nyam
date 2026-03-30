'use client'

import { FileText, Star, TrendingUp, MapPin, Trophy, Zap } from 'lucide-react'

interface BubbleQuickStatsProps {
  recordCount: number
  avgSatisfaction: number | null
  weeklyRecordCount: number
  prevWeeklyRecordCount?: number
  uniqueTargetCount: number
}

export function BubbleQuickStats({
  recordCount,
  avgSatisfaction,
  weeklyRecordCount,
  prevWeeklyRecordCount = 0,
  uniqueTargetCount,
}: BubbleQuickStatsProps) {
  const weeklyGrowth = prevWeeklyRecordCount > 0
    ? Math.round(((weeklyRecordCount - prevWeeklyRecordCount) / prevWeeklyRecordCount) * 100)
    : null

  return (
    <div className="px-4 py-3">
      {/* 메인 스탯 그리드 (2x2) */}
      <div className="grid grid-cols-2 gap-2">
        {/* 총 기록 */}
        <StatCard
          icon={FileText}
          label="총 기록"
          value={String(recordCount)}
          color="var(--text)"
          iconColor="var(--accent-social)"
        />

        {/* 평균 점수 */}
        <StatCard
          icon={Star}
          label="평균 만족도"
          value={avgSatisfaction?.toFixed(1) ?? '-'}
          color={avgSatisfaction && avgSatisfaction >= 80 ? 'var(--positive)' : 'var(--text)'}
          iconColor="var(--caution)"
          suffix={avgSatisfaction && avgSatisfaction >= 80 ? (
            <Trophy size={11} style={{ color: 'var(--caution)' }} />
          ) : undefined}
        />

        {/* 이번 주 */}
        <StatCard
          icon={Zap}
          label="이번 주"
          value={String(weeklyRecordCount)}
          color="var(--positive)"
          iconColor="var(--positive)"
          badge={weeklyGrowth !== null && weeklyGrowth > 0 ? (
            <span
              className="flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[9px] font-bold"
              style={{ backgroundColor: 'var(--positive-light)', color: 'var(--positive)' }}
            >
              <TrendingUp size={8} />
              +{weeklyGrowth}%
            </span>
          ) : weeklyGrowth !== null && weeklyGrowth < 0 ? (
            <span
              className="rounded-full px-1.5 py-0.5 text-[9px] font-bold"
              style={{ backgroundColor: 'var(--bg-page)', color: 'var(--text-hint)' }}
            >
              {weeklyGrowth}%
            </span>
          ) : undefined}
        />

        {/* 고유 장소 */}
        <StatCard
          icon={MapPin}
          label="고유 장소"
          value={String(uniqueTargetCount)}
          color="var(--text)"
          iconColor="var(--accent-food)"
        />
      </div>
    </div>
  )
}

function StatCard({
  icon: Icon,
  label,
  value,
  color,
  iconColor,
  badge,
  suffix,
}: {
  icon: typeof FileText
  label: string
  value: string
  color: string
  iconColor: string
  badge?: React.ReactNode
  suffix?: React.ReactNode
}) {
  return (
    <div
      className="flex items-center gap-2.5 rounded-xl px-3 py-3"
      style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}
    >
      {/* 아이콘 서클 */}
      <div
        className="flex h-[32px] w-[32px] shrink-0 items-center justify-center rounded-lg"
        style={{ backgroundColor: `${iconColor}15` }}
      >
        <Icon size={16} style={{ color: iconColor }} />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1">
          <span className="text-[18px] font-black leading-none" style={{ color }}>{value}</span>
          {suffix}
        </div>
        <div className="mt-0.5 flex items-center gap-1">
          <span className="text-[10px]" style={{ color: 'var(--text-hint)' }}>{label}</span>
          {badge}
        </div>
      </div>
    </div>
  )
}
