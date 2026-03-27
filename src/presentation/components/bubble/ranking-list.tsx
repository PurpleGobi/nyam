'use client'

import { ChevronUp, ChevronDown, Minus } from 'lucide-react'
import type { RankingEntry } from '@/application/hooks/use-bubble-ranking'

interface RankingListProps {
  entries: RankingEntry[]
}

export function RankingList({ entries }: RankingListProps) {
  if (entries.length === 0) {
    return <p className="py-6 text-center text-[14px] text-[var(--text-hint)]">랭킹 데이터가 없습니다</p>
  }

  return (
    <div className="flex flex-col gap-1.5">
      {entries.map((entry) => (
        <div
          key={entry.userId}
          className="flex items-center gap-3 rounded-xl px-3 py-2.5"
          style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}
        >
          {/* 순위 */}
          <span className="w-6 text-center text-[14px] font-bold text-[var(--text)]">{entry.rank}</span>

          {/* 델타 */}
          <div className="flex w-5 items-center justify-center">
            {entry.delta > 0 && <ChevronUp size={14} style={{ color: 'var(--positive)' }} />}
            {entry.delta < 0 && <ChevronDown size={14} style={{ color: 'var(--negative)' }} />}
            {entry.delta === 0 && <Minus size={12} style={{ color: 'var(--text-hint)' }} />}
          </div>

          {/* 아바타 */}
          <div
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold"
            style={{ backgroundColor: 'var(--accent-social-light)', color: 'var(--accent-social)' }}
          >
            {entry.userId.substring(0, 2).toUpperCase()}
          </div>

          {/* 정보 */}
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-semibold text-[var(--text)]">
              {entry.userId.substring(0, 8)}
            </p>
            {entry.badgeLabel && (
              <span className="text-[10px] text-[var(--text-hint)]">{entry.badgeLabel}</span>
            )}
          </div>

          {/* 통계 */}
          <div className="text-right">
            <p className="text-[13px] font-bold text-[var(--text)]">{entry.memberUniqueTargetCount}곳</p>
            <p className="text-[10px] text-[var(--text-hint)]">주간 {entry.weeklyShareCount}</p>
          </div>
        </div>
      ))}
    </div>
  )
}
