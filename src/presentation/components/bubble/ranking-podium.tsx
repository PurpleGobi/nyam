'use client'

import Image from 'next/image'
import { Crown, Medal, TrendingUp, TrendingDown, Sparkles } from 'lucide-react'

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

const PODIUM_CONFIG: Record<number, {
  height: number
  badgeColor: string
  badgeBg: string
  glowColor: string
  ringColor: string
}> = {
  1: { height: 130, badgeColor: '#FFD700', badgeBg: 'linear-gradient(135deg, #FFD700, #FFA000)', glowColor: 'rgba(255, 215, 0, 0.2)', ringColor: '#FFD700' },
  2: { height: 100, badgeColor: '#C0C0C0', badgeBg: 'linear-gradient(135deg, #E0E0E0, #A0A0A0)', glowColor: 'rgba(192, 192, 192, 0.15)', ringColor: '#C0C0C0' },
  3: { height: 85, badgeColor: '#CD7F32', badgeBg: 'linear-gradient(135deg, #D4A06A, #B06A30)', glowColor: 'rgba(205, 127, 50, 0.15)', ringColor: '#CD7F32' },
}

export function RankingPodium({ items, targetType }: RankingPodiumProps) {
  if (items.length === 0) {
    return <p className="py-6 text-center text-[14px]" style={{ color: 'var(--text-hint)' }}>랭킹 데이터가 없습니다</p>
  }

  const scoreColor = targetType === 'restaurant' ? 'var(--accent-food)' : 'var(--accent-wine)'
  // 표시 순서: 2위, 1위, 3위
  const ordered = [items.find((i) => i.rank === 2), items.find((i) => i.rank === 1), items.find((i) => i.rank === 3)].filter(Boolean) as RankingPodiumItem[]

  return (
    <div className="flex items-end justify-center gap-3 px-4 py-6">
      {ordered.map((item) => {
        const config = PODIUM_CONFIG[item.rank]
        const isFirst = item.rank === 1

        return (
          <div key={item.targetId} className="flex w-[105px] flex-col items-center gap-2">
            {/* 순위 번호 */}
            <div className="flex items-center gap-1">
              <div
                className="flex h-[22px] w-[22px] items-center justify-center rounded-full text-[10px] font-black text-white"
                style={{ background: config.badgeBg }}
              >
                {item.rank}
              </div>
              {isFirst && <Crown size={14} style={{ color: '#FFD700' }} />}
            </div>

            {/* 사진 카드 */}
            <div
              className="relative w-full overflow-hidden rounded-2xl"
              style={{
                height: config.height,
                boxShadow: isFirst ? `0 4px 16px ${config.glowColor}` : undefined,
                border: `2px solid ${config.ringColor}`,
              }}
            >
              {item.thumbnailUrl ? (
                <Image src={item.thumbnailUrl} alt="" fill className="object-cover" sizes="105px" />
              ) : (
                <div
                  className="flex h-full w-full items-center justify-center"
                  style={{
                    backgroundColor: targetType === 'restaurant' ? 'var(--accent-food-light)' : 'var(--accent-wine-light)',
                  }}
                >
                  {isFirst ? <Crown size={24} style={{ color: config.badgeColor }} /> : <Medal size={20} style={{ color: config.badgeColor }} />}
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

              {/* 점수 오버레이 */}
              <div className="absolute bottom-0 left-0 right-0 px-2 pb-2">
                <span className="text-[22px] font-black leading-none text-white" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.4)' }}>
                  {Math.round(item.avgSatisfaction)}
                </span>
                <span className="ml-0.5 text-[10px] font-semibold text-white/70">점</span>
              </div>
            </div>

            {/* 이름 */}
            <p className="w-full truncate text-center text-[12px] font-bold" style={{ color: 'var(--text)' }}>
              {item.targetName}
            </p>

            {/* 메타 행: 기록 수 + 변동 */}
            <div className="flex items-center gap-1.5">
              <span className="text-[10px]" style={{ color: 'var(--text-hint)' }}>
                {item.recordCount}개 기록
              </span>
              <DeltaBadge delta={item.delta} />
            </div>
          </div>
        )
      })}
    </div>
  )
}

function DeltaBadge({ delta }: { delta: number | 'new' | null }) {
  if (delta === null || delta === 0) {
    return (
      <span className="text-[10px]" style={{ color: 'var(--text-hint)' }}>
        ─
      </span>
    )
  }

  if (delta === 'new') {
    return (
      <span
        className="flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[9px] font-bold"
        style={{ backgroundColor: 'var(--accent-social-light)', color: 'var(--accent-social)' }}
      >
        <Sparkles size={8} />
        NEW
      </span>
    )
  }

  const isUp = delta > 0
  return (
    <span
      className="flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[9px] font-bold"
      style={{
        backgroundColor: isUp ? 'var(--positive-light)' : 'var(--negative-light)',
        color: isUp ? 'var(--positive)' : 'var(--negative)',
      }}
    >
      {isUp ? <TrendingUp size={8} /> : <TrendingDown size={8} />}
      {isUp ? '+' : ''}{delta}
    </span>
  )
}
