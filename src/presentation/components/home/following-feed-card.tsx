'use client'

import { getGaugeColor } from '@/shared/utils/gauge-color'
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
  return (
    <button
      type="button"
      onClick={onPress}
      className="flex w-full flex-col gap-2 rounded-xl p-3 text-left transition-colors active:scale-[0.98]"
      style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold"
            style={{ backgroundColor: item.authorAvatarColor ?? 'var(--accent-social-light)', color: '#FFFFFF' }}
          >
            {item.authorAvatar ? (
              <img src={item.authorAvatar} alt="" className="h-full w-full rounded-full object-cover" />
            ) : (
              item.authorNickname.charAt(0)
            )}
          </div>
          <span className="text-[13px] font-semibold" style={{ color: 'var(--text)' }}>{item.authorNickname}</span>
        </div>
        <FollowingSourceBadge
          sourceType={item.sourceType}
          sourceName={item.sourceName}
          sourceIcon={item.sourceIcon}
          sourceAvatar={item.sourceAvatar}
          sourceAvatarColor={item.sourceAvatarColor}
        />
      </div>

      <div className="flex items-center gap-2">
        <span
          className="text-[14px] font-bold"
          style={{ color: item.targetType === 'restaurant' ? 'var(--accent-food)' : 'var(--accent-wine)' }}
        >
          {item.targetName}
        </span>
        {item.satisfaction !== null && (
          <div
            className="flex h-6 w-6 items-center justify-center rounded-full"
            style={{ backgroundColor: getGaugeColor(item.satisfaction) }}
          >
            <span style={{ fontSize: '10px', fontWeight: 800, color: '#FFFFFF' }}>{item.satisfaction}</span>
          </div>
        )}
      </div>

      {item.comment && (
        <p className="line-clamp-2 text-[12px]" style={{ color: 'var(--text-sub)', lineHeight: 1.5 }}>
          {item.comment}
        </p>
      )}

      {item.visitDate && (
        <span className="text-[10px]" style={{ color: 'var(--text-hint)' }}>{item.visitDate}</span>
      )}
    </button>
  )
}
