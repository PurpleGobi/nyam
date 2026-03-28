'use client'

import Image from 'next/image'
import { FollowingSourceBadge } from './following-source-badge'

interface FeedItem {
  id: string
  recordId: string
  targetName: string
  targetType: 'restaurant' | 'wine'
  satisfaction: number | null
  comment: string | null
  visitDate: string | null
  sourceType: 'bubble' | 'user'
  sourceName: string
  sourceIcon: string | null
  sourceAvatar: string | null
  sourceAvatarColor: string | null
  authorNickname: string
  authorAvatar: string | null
  authorAvatarColor: string | null
  createdAt: string
}

interface FollowingFeedCardProps {
  item: FeedItem
  onPress: () => void
}

export function FollowingFeedCard({ item, onPress }: FollowingFeedCardProps) {
  const scoreColor = item.targetType === 'restaurant' ? 'var(--accent-food)' : 'var(--accent-wine)'

  return (
    <button
      type="button"
      onClick={onPress}
      className="flex w-full flex-col gap-2 rounded-xl text-left transition-transform active:scale-[0.98]"
      style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', padding: '14px' }}
    >
      {/* 소스 배지 + 시간 */}
      <div className="flex items-center justify-between">
        <FollowingSourceBadge
          sourceType={item.sourceType}
          sourceName={item.sourceName}
          sourceIcon={item.sourceIcon}
          sourceAvatar={item.sourceAvatar}
          sourceAvatarColor={item.sourceAvatarColor}
        />
        {item.visitDate && (
          <span className="text-[11px]" style={{ color: 'var(--text-hint)' }}>{item.visitDate}</span>
        )}
      </div>

      {/* 식당/와인명 + 점수 */}
      <div className="flex items-center justify-between">
        <span className="text-[15px] font-[800]" style={{ color: 'var(--text)' }}>
          {item.targetName}
        </span>
        {item.satisfaction !== null && (
          <span className="text-[18px] font-[800]" style={{ color: scoreColor }}>
            {item.satisfaction}
          </span>
        )}
      </div>

      {/* 한줄평 — 맞팔 소스만 표시, 1줄 클램프 */}
      {item.sourceType === 'user' && item.comment && (
        <p className="line-clamp-1 text-[12px]" style={{ color: 'var(--text-sub)' }}>
          {item.comment}
        </p>
      )}

      {/* 버블 소스: 가입 유도 CTA */}
      {item.sourceType === 'bubble' && (
        <span className="text-[11px]" style={{ color: 'var(--accent-social)' }}>
          버블에 가입하면 더 볼 수 있어요
        </span>
      )}
    </button>
  )
}
