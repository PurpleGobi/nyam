'use client'

import { Inbox } from 'lucide-react'
import { FollowingFeedCard } from './following-feed-card'

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

interface FollowingFeedProps {
  items: FeedItem[]
  isLoading: boolean
  onItemPress: (recordId: string) => void
}

export function FollowingFeed({ items, isLoading, onItemPress }: FollowingFeedProps) {
  if (isLoading) {
    return (
      <div className="flex flex-col gap-3 px-4 py-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-xl" style={{ backgroundColor: 'var(--bg-card)' }} />
        ))}
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center px-4 py-16">
        <Inbox size={40} style={{ color: 'var(--text-hint)' }} />
        <p className="mt-3 text-[14px] font-semibold" style={{ color: 'var(--text-sub)' }}>
          아직 피드가 없어요
        </p>
        <p className="mt-1 text-[12px]" style={{ color: 'var(--text-hint)' }}>
          버블에 가입하거나 다른 유저를 팔로우해보세요
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3 px-4 py-3">
      {items.map((item) => (
        <FollowingFeedCard key={item.id} item={item} onPress={() => onItemPress(item.recordId)} />
      ))}
    </div>
  )
}
