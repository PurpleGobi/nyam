'use client'

import Link from 'next/link'
import { Users } from 'lucide-react'
import { FollowingFeedCard } from './following-feed-card'

interface FeedItem {
  id: string
  recordId: string
  targetId: string
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

type SourceFilter = 'all' | 'bubble' | 'mutual'

interface FollowingFeedProps {
  items: FeedItem[]
  isLoading: boolean
  onItemPress: (targetId: string, targetType: 'restaurant' | 'wine') => void
  sourceFilter: SourceFilter
  onSourceFilterChange: (f: SourceFilter) => void
}

const SOURCE_FILTERS: { value: SourceFilter; label: string }[] = [
  { value: 'all', label: '전체' },
  { value: 'bubble', label: '버블' },
  { value: 'mutual', label: '맞팔' },
]

export function FollowingFeed({ items, isLoading, onItemPress, sourceFilter, onSourceFilterChange }: FollowingFeedProps) {
  return (
    <div className="flex flex-col">
      {/* 소스 필터칩 */}
      <div className="flex gap-2 px-4 py-2">
        {SOURCE_FILTERS.map((f) => {
          const isActive = sourceFilter === f.value
          return (
            <button
              key={f.value}
              type="button"
              onClick={() => onSourceFilterChange(f.value)}
              className="rounded-full px-3 py-1.5 text-[12px] font-semibold transition-colors"
              style={{
                backgroundColor: isActive ? 'var(--accent-social)' : 'var(--bg-card)',
                color: isActive ? '#FFFFFF' : 'var(--text-sub)',
                border: isActive ? 'none' : '1px solid var(--border)',
              }}
            >
              {f.label}
            </button>
          )
        })}
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-3 px-4 py-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl" style={{ backgroundColor: 'var(--bg-card)' }} />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center px-4 py-16">
          <Users size={40} style={{ color: 'var(--text-hint)' }} />
          <p className="mt-3 text-[14px] font-semibold" style={{ color: 'var(--text-sub)' }}>
            팔로우하는 버블이 없거나 맞팔 친구가 없어요
          </p>
          <p className="mt-1 text-[12px]" style={{ color: 'var(--text-hint)' }}>
            버블에 가입하거나 다른 유저를 팔로우해보세요
          </p>
          <Link
            href="/bubbles"
            className="mt-4 rounded-lg px-4 py-2 text-[13px] font-semibold no-underline"
            style={{ backgroundColor: 'var(--accent-social)', color: '#fff' }}
          >
            버블 탐색하기
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-3 px-4 py-3">
          {items.map((item) => (
            <FollowingFeedCard key={item.id} item={item} onPress={() => onItemPress(item.targetId, item.targetType)} />
          ))}
        </div>
      )}
    </div>
  )
}
