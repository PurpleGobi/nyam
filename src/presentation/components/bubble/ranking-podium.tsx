'use client'

import Image from 'next/image'
import { Crown, Medal } from 'lucide-react'

export interface RankingPodiumItem {
  rank: 1 | 2 | 3
  targetId: string
  targetName: string
  targetMeta: string | null
  thumbnailUrl: string | null
  avgSatisfaction: number
  recordCount: number
  delta: number | 'new' | null
}

interface RankingPodiumProps {
  items: RankingPodiumItem[]
  targetType: 'restaurant' | 'wine'
}

const PODIUM_CONFIG: Record<number, { height: string; badgeColor: string }> = {
  1: { height: 'h-[110px]', badgeColor: '#FFD700' },
  2: { height: 'h-[88px]', badgeColor: '#C0C0C0' },
  3: { height: 'h-[76px]', badgeColor: '#CD7F32' },
}

export function RankingPodium({ items, targetType }: RankingPodiumProps) {
  if (items.length === 0) {
    return <p className="py-6 text-center text-[14px]" style={{ color: 'var(--text-hint)' }}>랭킹 데이터가 없습니다</p>
  }

  const scoreColor = targetType === 'restaurant' ? 'var(--accent-food)' : 'var(--accent-wine)'
  // 표시 순서: 2위, 1위, 3위
  const ordered = [items.find((i) => i.rank === 2), items.find((i) => i.rank === 1), items.find((i) => i.rank === 3)].filter(Boolean) as RankingPodiumItem[]

  return (
    <div className="flex items-end justify-center gap-3 px-4 py-4">
      {ordered.map((item) => {
        const config = PODIUM_CONFIG[item.rank]
        const isFirst = item.rank === 1
        const BadgeIcon = isFirst ? Crown : Medal

        return (
          <div key={item.targetId} className="flex w-[100px] flex-col items-center gap-1.5">
            {/* 사진 + 오버레이 */}
            <div className={`relative w-full overflow-hidden rounded-xl ${config.height}`}>
              {item.thumbnailUrl ? (
                <Image src={item.thumbnailUrl} alt="" fill className="object-cover" sizes="100px" />
              ) : (
                <div className="h-full w-full" style={{ backgroundColor: targetType === 'restaurant' ? 'var(--accent-food-light)' : 'var(--accent-wine-light)' }} />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />

              {/* 순위 배지 */}
              <div
                className="absolute left-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-md"
                style={{ backgroundColor: config.badgeColor }}
              >
                <BadgeIcon size={12} color="#FFFFFF" />
              </div>

              {/* 점수 */}
              <div className="absolute bottom-1.5 right-1.5 rounded-md px-1.5 py-0.5" style={{ backgroundColor: scoreColor }}>
                <span className="text-[13px] font-black text-white">{Math.round(item.avgSatisfaction)}</span>
              </div>
            </div>

            {/* 이름 */}
            <p className="w-full truncate text-center text-[12px] font-bold" style={{ color: 'var(--text)' }}>{item.targetName}</p>

            {/* 메타 + 변동 */}
            <div className="flex items-center gap-1">
              <span className="text-[10px]" style={{ color: 'var(--text-hint)' }}>기록 {item.recordCount}개</span>
              <DeltaBadge delta={item.delta} />
            </div>
          </div>
        )
      })}
    </div>
  )
}

function DeltaBadge({ delta }: { delta: number | 'new' | null }) {
  if (delta === null || delta === 0) return null

  if (delta === 'new') {
    return (
      <span className="rounded px-1 py-0.5 text-[10px] font-semibold" style={{ backgroundColor: 'var(--bg-page)', color: 'var(--text-hint)' }}>
        NEW
      </span>
    )
  }

  const isUp = delta > 0
  return (
    <span className="text-[10px] font-bold" style={{ color: isUp ? 'var(--positive)' : 'var(--negative)' }}>
      {isUp ? '▲' : '▼'}{Math.abs(delta)}
    </span>
  )
}
