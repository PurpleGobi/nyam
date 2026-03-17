'use client'

import { cn } from '@/shared/utils/cn'

interface StatsSummaryProps {
  stats: {
    totalRecords?: number
    recordsThisMonth?: number
    currentStreakDays?: number
    avgCompleteness?: number
  }
  className?: string
}

interface StatItem {
  key: string
  label: string
  format: (v: number | undefined) => string
}

const STAT_ITEMS: StatItem[] = [
  {
    key: 'totalRecords',
    label: '총 기록',
    format: (v) => (typeof v === 'number' ? String(v) : '--'),
  },
  {
    key: 'recordsThisMonth',
    label: '이번 달',
    format: (v) => (typeof v === 'number' ? String(v) : '--'),
  },
  {
    key: 'currentStreakDays',
    label: '연속 기록',
    format: (v) => (typeof v === 'number' ? `${v}일` : '--'),
  },
  {
    key: 'avgCompleteness',
    label: '완성도',
    format: (v) =>
      typeof v === 'number' ? `${Math.round(v * 100)}%` : '--',
  },
]

export function StatsSummary({ stats, className }: StatsSummaryProps) {
  return (
    <div className={cn('grid grid-cols-4 gap-2', className)}>
      {STAT_ITEMS.map((item) => {
        const value = stats[item.key as keyof typeof stats]
        return (
          <div
            key={item.key}
            className="flex flex-col items-center rounded-lg bg-neutral-50 p-3"
          >
            <span className="text-xl font-bold text-[#334E68]">
              {item.format(value)}
            </span>
            <span className="mt-0.5 text-xs text-neutral-500">
              {item.label}
            </span>
          </div>
        )
      })}
    </div>
  )
}
