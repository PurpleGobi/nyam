'use client'

import { Sparkles, Heart, Trophy, Gift, CircleDot } from 'lucide-react'
import type { XpHistory, XpReason } from '@/domain/entities/xp'
import { formatTimeAgo } from '@/shared/utils/date-format'

interface RecentXpListProps {
  items: XpHistory[]
}

const REASON_LABELS: Record<XpReason, string> = {
  record_full: '풀 기록',
  record_photo: '사진 기록',
  record_score: '점수 기록',
  record_name: '이름 등록',
  detail_axis: '세부 축',
  category: '카테고리',
  social_share: '버블 공유',
  social_like: '좋아요',
  social_follow: '팔로우',
  social_mutual: '맞팔로우',
  bonus_onboard: '온보딩 보너스',
  bonus_first_record: '첫 기록 보너스',
  bonus_first_bubble: '첫 버블 보너스',
  bonus_first_share: '첫 공유 보너스',
  milestone: '마일스톤',
  revisit: '재방문',
}

function getIconConfig(reason: XpReason) {
  if (
    reason === 'record_full' ||
    reason === 'record_photo' ||
    reason === 'record_score'
  ) {
    return {
      Icon: Sparkles,
      bg: 'color-mix(in srgb, var(--accent-food) 15%, transparent)',
      color: 'var(--accent-food)',
    }
  }

  if (reason.startsWith('social_')) {
    return {
      Icon: Heart,
      bg: 'color-mix(in srgb, var(--accent-social) 15%, transparent)',
      color: 'var(--accent-social)',
    }
  }

  if (reason === 'milestone') {
    return {
      Icon: Trophy,
      bg: 'color-mix(in srgb, #C9A96E 15%, transparent)',
      color: '#C9A96E',
    }
  }

  if (reason.startsWith('bonus_')) {
    return {
      Icon: Gift,
      bg: 'color-mix(in srgb, var(--positive) 15%, transparent)',
      color: 'var(--positive)',
    }
  }

  return {
    Icon: CircleDot,
    bg: 'var(--bg-elevated)',
    color: 'var(--text-sub)',
  }
}


export function RecentXpList({ items }: RecentXpListProps) {
  const displayItems = items.slice(0, 5)

  if (displayItems.length === 0) return null

  return (
    <div
      className="card mx-4 rounded-2xl px-4 py-4"
    >
      <p style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text)' }}>
        최근 XP
      </p>

      <div className="mt-3 flex flex-col gap-2">
        {displayItems.map((item) => {
          const { Icon, bg, color } = getIconConfig(item.reason)
          const label = REASON_LABELS[item.reason] ?? item.reason

          return (
            <div key={item.id} className="flex items-center gap-3">
              <div
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                style={{ backgroundColor: bg }}
              >
                <Icon size={16} style={{ color }} />
              </div>

              <div className="flex min-w-0 flex-1 items-center justify-between">
                <div className="flex min-w-0 items-center gap-2">
                  <span
                    className="truncate"
                    style={{ fontSize: '13px', color: 'var(--text)' }}
                  >
                    {label}
                  </span>
                  <span
                    className="shrink-0"
                    style={{ fontSize: '11px', color: 'var(--text-hint)' }}
                  >
                    {formatTimeAgo(item.createdAt)}
                  </span>
                </div>

                <span
                  className="shrink-0 pl-2"
                  style={{ fontSize: '13px', fontWeight: 700, color: 'var(--accent-food)' }}
                >
                  +{item.xpAmount}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
