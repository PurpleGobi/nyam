'use client'

import type { RankingEntry } from '@/application/hooks/use-bubble-ranking'

interface RankingPodiumProps {
  top3: RankingEntry[]
}

const MEDALS: Record<number, { emoji: string; size: string; ring: string }> = {
  1: { emoji: '🥇', size: 'h-16 w-16', ring: '#FFD700' },
  2: { emoji: '🥈', size: 'h-13 w-13', ring: '#C0C0C0' },
  3: { emoji: '🥉', size: 'h-12 w-12', ring: '#CD7F32' },
}

export function RankingPodium({ top3 }: RankingPodiumProps) {
  if (top3.length === 0) {
    return <p className="py-6 text-center text-[14px] text-[var(--text-hint)]">랭킹 데이터가 없습니다</p>
  }

  // 표시 순서: 2위, 1위, 3위
  const ordered = [top3[1], top3[0], top3[2]].filter(Boolean)

  return (
    <div className="flex items-end justify-center gap-4 py-4">
      {ordered.map((entry) => {
        const medal = MEDALS[entry.rank] ?? MEDALS[3]
        const isFirst = entry.rank === 1
        return (
          <div key={entry.userId} className="flex flex-col items-center gap-1.5">
            <span className={isFirst ? 'text-[28px]' : 'text-[22px]'}>{medal.emoji}</span>
            <div
              className={`flex items-center justify-center rounded-full ${medal.size}`}
              style={{
                backgroundColor: 'var(--accent-social-light)',
                border: `2px solid ${medal.ring}`,
              }}
            >
              <span className="text-[13px] font-bold" style={{ color: 'var(--accent-social)' }}>
                {entry.userId.substring(0, 2).toUpperCase()}
              </span>
            </div>
            <span className="text-[12px] font-semibold text-[var(--text)]">
              {entry.memberUniqueTargetCount}곳
            </span>
            {entry.badgeLabel && (
              <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ backgroundColor: 'var(--accent-social-light)', color: 'var(--accent-social)' }}>
                {entry.badgeLabel}
              </span>
            )}
          </div>
        )
      })}
    </div>
  )
}
