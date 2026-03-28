'use client'

import { useRouter } from 'next/navigation'
import { ChevronLeft, MoreHorizontal } from 'lucide-react'
import { useAuth } from '@/presentation/providers/auth-provider'
import { useFollow } from '@/application/hooks/use-follow'
import { useBubblerProfile } from '@/application/hooks/use-bubbler-profile'
import { BubblerHero } from '@/presentation/components/bubbler/bubbler-hero'
import { BubbleContextCard } from '@/presentation/components/bubbler/bubble-context-card'
import { TasteProfile } from '@/presentation/components/bubbler/taste-profile'
import { PicksGrid } from '@/presentation/components/bubbler/picks-grid'
import { RecentRecords } from '@/presentation/components/bubbler/recent-records'
import { ActivitySection } from '@/presentation/components/bubbler/activity-section'

interface BubblerProfileContainerProps {
  userId: string
  bubbleId?: string | null
}

export function BubblerProfileContainer({ userId, bubbleId = null }: BubblerProfileContainerProps) {
  const router = useRouter()
  const { user: authUser } = useAuth()
  const { accessLevel, isLoading: followLoading, toggleFollow } = useFollow(authUser?.id ?? null, userId)
  const { data, isLoading } = useBubblerProfile(authUser?.id ?? null, userId, bubbleId)

  if (isLoading || !data) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-[3px] border-[var(--accent-social)] border-t-transparent" />
      </div>
    )
  }

  const isSelf = authUser?.id === userId

  return (
    <div className="flex min-h-dvh flex-col" style={{ backgroundColor: 'var(--bg)' }}>
      {/* 헤더 */}
      <nav className="flex items-center justify-between px-4" style={{ height: '44px' }}>
        <button type="button" onClick={() => router.back()} className="flex h-11 w-11 items-center justify-center">
          <ChevronLeft size={22} style={{ color: 'var(--text)' }} />
        </button>
        <span className="text-[15px] font-bold" style={{ color: 'var(--text)' }}>
          {data.bubbleContext?.bubbleName ?? data.nickname}
        </span>
        <button type="button" className="flex h-11 w-11 items-center justify-center">
          <MoreHorizontal size={18} style={{ color: 'var(--text-sub)' }} />
        </button>
      </nav>

      <div className="flex flex-col gap-6 px-4 pb-8">
        {/* 프로필 히어로 */}
        <BubblerHero
          nickname={data.nickname}
          handle={data.handle}
          avatarUrl={data.avatarUrl}
          avatarColor={data.avatarColor}
          level={data.level}
          levelTitle={data.levelTitle}
          accessLevel={data.accessLevel}
          isOwnProfile={isSelf}
          isFollowLoading={followLoading}
          onToggleFollow={toggleFollow}
        />

        {/* 통계 */}
        <div className="flex justify-center gap-8">
          <StatItem label="기록" value={data.totalRecords} />
        </div>

        {/* 버블 컨텍스트 카드 */}
        {data.bubbleContext && (
          <BubbleContextCard
            bubbleName={data.bubbleContext.bubbleName}
            bubbleIcon={data.bubbleContext.bubbleIcon}
            rank={data.bubbleContext.rank}
            memberSince={data.bubbleContext.memberSince}
            tasteMatchPct={data.bubbleContext.tasteMatchPct}
          />
        )}

        {/* 취향 프로필 */}
        <TasteProfile
          categories={data.categories}
          scoreTendency={{ avgSatisfaction: data.avgSatisfaction, totalRecords: data.totalRecords }}
          topRegions={data.topRegions}
        />

        {/* 강력 추천 (Picks) */}
        <PicksGrid
          picks={data.topPicks}
          onItemPress={(id, type) => router.push(type === 'restaurant' ? `/restaurants/${id}` : `/wines/${id}`)}
        />

        {/* 최근 기록 */}
        <RecentRecords
          records={data.recentRecords}
          onRecordPress={(id) => router.push(`/records/${id}`)}
        />

        {/* 활동 히트맵 */}
        <ActivitySection heatmap={data.heatmap} />
      </div>
    </div>
  )
}

function StatItem({ label, value }: { label: string; value: number }) {
  return (
    <div className="text-center">
      <p className="text-[18px] font-bold" style={{ color: 'var(--text)' }}>{value}</p>
      <p className="text-[11px]" style={{ color: 'var(--text-hint)' }}>{label}</p>
    </div>
  )
}
