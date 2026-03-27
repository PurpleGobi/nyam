'use client'

import { Utensils, Wine, MapPin, Grape, Star, Flame, CalendarDays } from 'lucide-react'
import type { WrappedData, WrappedCategory } from '@/domain/entities/profile'

interface WrappedCardProps {
  category: WrappedCategory
  data: WrappedData
}

export function WrappedCard({ category, data }: WrappedCardProps) {
  const accentColor = category === 'wine' ? 'var(--accent-wine)' : 'var(--accent-food)'

  return (
    <div
      className="mx-4 flex flex-col gap-3 rounded-2xl px-4 py-4"
      style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}
    >
      {/* Header */}
      <div className="flex items-center gap-2">
        <span style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text)' }}>
          나의 기록 요약
        </span>
        <span
          className="rounded-full px-2 py-0.5"
          style={{ fontSize: '11px', fontWeight: 600, backgroundColor: `${accentColor}15`, color: accentColor }}
        >
          {data.totalRecords}건
        </span>
      </div>

      {/* Stat rows */}
      <div className="flex flex-col gap-2">
        {(category === 'all' || category === 'restaurant') && data.topGenre && (
          <StatRow icon={<Utensils size={14} />} label="자주 찾는 장르" value={data.topGenre} color="var(--accent-food)" />
        )}
        {(category === 'all' || category === 'restaurant') && data.topCity && (
          <StatRow icon={<MapPin size={14} />} label="자주 찾는 지역" value={data.topCity} color="var(--accent-food)" />
        )}
        {(category === 'all' || category === 'wine') && data.topVarietal && (
          <StatRow icon={<Grape size={14} />} label="자주 마신 품종" value={data.topVarietal} color="var(--accent-wine)" />
        )}
        {(category === 'all' || category === 'wine') && data.topCountry && (
          <StatRow icon={<Wine size={14} />} label="자주 마신 국가" value={data.topCountry} color="var(--accent-wine)" />
        )}
        {data.avgSatisfaction > 0 && (
          <StatRow icon={<Star size={14} />} label="평균 만족도" value={`${data.avgSatisfaction}점`} color="#C9A96E" />
        )}
        {data.streakDays > 0 && (
          <StatRow icon={<Flame size={14} />} label="연속 기록" value={`${data.streakDays}일`} color="#E8637A" />
        )}
        {data.mostActiveMonth && (
          <StatRow icon={<CalendarDays size={14} />} label="가장 활발한 달" value={data.mostActiveMonth} color="var(--text-sub)" />
        )}
      </div>
    </div>
  )
}

function StatRow({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode
  label: string
  value: string
  color: string
}) {
  return (
    <div className="flex items-center gap-3">
      <div
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
        style={{ backgroundColor: `${color}15`, color }}
      >
        {icon}
      </div>
      <div className="flex flex-1 items-center justify-between">
        <span style={{ fontSize: '13px', color: 'var(--text-sub)' }}>{label}</span>
        <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)' }}>{value}</span>
      </div>
    </div>
  )
}
