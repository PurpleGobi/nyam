'use client'

import type { RankingEntry } from '@/application/hooks/use-bubble-ranking'

interface RankingListProps {
  entries: RankingEntry[]
  targetType: 'restaurant' | 'wine'
  targetNames: Record<string, string>
}

export function RankingList({ entries, targetType, targetNames }: RankingListProps) {
  if (entries.length === 0) {
    return <p className="py-6 text-center text-[14px] text-[var(--text-hint)]">랭킹 데이터가 없습니다</p>
  }

  const accentColor = targetType === 'restaurant' ? 'var(--accent-food)' : 'var(--accent-wine)'

  return (
    <div className="flex flex-col gap-1.5">
      {entries.map((entry) => {
        const name = targetNames[entry.targetId] ?? '알 수 없음'

        return (
          <div
            key={entry.targetId}
            className="card flex items-center gap-3 rounded-xl px-3 py-2.5"
          >
            {/* 순위 */}
            <span className="w-6 text-center text-[14px] font-bold text-[var(--text)]">
              {entry.rankPosition}
            </span>

            {/* 썸네일 placeholder */}
            <div
              className="h-10 w-10 shrink-0 rounded-lg"
              style={{
                backgroundColor: targetType === 'restaurant' ? 'var(--accent-food-light)' : 'var(--accent-wine-light)',
              }}
            />

            {/* 이름 + 메타 */}
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-bold text-[var(--text)]">{name}</p>
              <p className="text-[11px] text-[var(--text-sub)]">기록 {entry.recordCount}개</p>
            </div>

            {/* 점수 + 등락 */}
            <div className="shrink-0 text-right">
              <p className="text-[16px] font-extrabold" style={{ color: accentColor }}>
                {entry.avgSatisfaction ?? '-'}
              </p>
              <DeltaIndicator delta={entry.delta} />
            </div>
          </div>
        )
      })}
    </div>
  )
}

function DeltaIndicator({ delta }: { delta: RankingEntry['delta'] }) {
  if (delta.direction === 'new') {
    return (
      <span
        className="rounded px-1 text-[10px] font-semibold"
        style={{ backgroundColor: 'var(--bg-page)', color: 'var(--text-hint)' }}
      >
        NEW
      </span>
    )
  }

  if (delta.direction === 'up') {
    return (
      <span className="text-[10px] font-semibold" style={{ color: 'var(--positive)' }}>
        ▲{delta.value}
      </span>
    )
  }

  if (delta.direction === 'down') {
    return (
      <span className="text-[10px] font-semibold" style={{ color: 'var(--negative)' }}>
        ▼{delta.value}
      </span>
    )
  }

  // same
  return (
    <span className="text-[10px] font-semibold" style={{ color: 'var(--text-hint)' }}>─</span>
  )
}
