'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, Eye, List, UtensilsCrossed, Wine } from 'lucide-react'
import { useAuth } from '@/presentation/providers/auth-provider'
import { useBubbleDetail } from '@/application/hooks/use-bubble-detail'
import { useBubbleFeed } from '@/application/hooks/use-bubble-feed'
import { useBubbleRanking } from '@/application/hooks/use-bubble-ranking'
import { useBubbleMembers } from '@/application/hooks/use-bubble-members'
import { BubbleHero } from '@/presentation/components/bubble/bubble-hero'
import { BubbleQuickStats } from '@/presentation/components/bubble/bubble-quick-stats'
import { BubbleInfoSheet } from '@/presentation/components/bubble/bubble-info-sheet'
import { FeedCard } from '@/presentation/components/bubble/feed-card'
import { FeedCompact } from '@/presentation/components/bubble/feed-compact'
import { RankingPodium } from '@/presentation/components/bubble/ranking-podium'
import type { RankingPodiumItem } from '@/presentation/components/bubble/ranking-podium'
import { RankingList } from '@/presentation/components/bubble/ranking-list'
import { MemberGrid } from '@/presentation/components/bubble/member-grid'
import { MemberListView } from '@/presentation/components/bubble/member-list-view'
import type { RankingTargetType, BubbleMemberRole, BubbleContentVisibility } from '@/domain/entities/bubble'
import type { ReactionType } from '@/domain/entities/reaction'

interface BubbleDetailContainerProps {
  bubbleId: string
}

type TabType = 'feed' | 'ranking' | 'members'

export function BubbleDetailContainer({ bubbleId }: BubbleDetailContainerProps) {
  const router = useRouter()
  const { user } = useAuth()
  const { bubble, myRole, tasteMatch, isLoading } = useBubbleDetail(bubbleId, user?.id ?? null)

  const [activeTab, setActiveTab] = useState<TabType>('feed')
  const [feedViewMode, setFeedViewMode] = useState<'card' | 'compact'>('card')
  const [memberViewMode, setMemberViewMode] = useState<'grid' | 'list'>('grid')
  const [rankingTargetType, setRankingTargetType] = useState<RankingTargetType>('restaurant')
  const [showInfoSheet, setShowInfoSheet] = useState(false)

  if (isLoading || !bubble) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-[3px] border-[var(--accent-social)] border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="flex min-h-dvh flex-col" style={{ backgroundColor: 'var(--bg)' }}>
      {/* 헤더 */}
      <nav className="flex items-center justify-between px-4" style={{ height: '44px' }}>
        <button type="button" onClick={() => router.back()} className="flex h-11 w-11 items-center justify-center">
          <ChevronLeft size={22} style={{ color: 'var(--text)' }} />
        </button>
        <span className="text-[15px] font-bold" style={{ color: 'var(--text)' }}>버블</span>
        <div className="w-11" />
      </nav>

      {/* 히어로 */}
      <BubbleHero
        bubble={bubble}
        myRole={myRole}
        tasteMatchPct={tasteMatch}
        onInfoClick={() => setShowInfoSheet(true)}
        onSettingsClick={() => router.push(`/bubbles/${bubbleId}/settings`)}
        onInviteClick={() => {/* invite modal */}}
      />

      {/* 퀵 통계 */}
      <BubbleQuickStats
        recordCount={bubble.recordCount}
        avgSatisfaction={bubble.avgSatisfaction}
        weeklyRecordCount={bubble.weeklyRecordCount}
        uniqueTargetCount={bubble.uniqueTargetCount}
      />

      {/* 스티키 탭 */}
      <div className="sticky top-0 z-50 mt-4 flex items-center" style={{ backgroundColor: 'var(--bg)', borderBottom: '1px solid var(--border)' }}>
        <div className="flex flex-1">
          {(['feed', 'ranking', 'members'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className="flex-1 py-2.5 text-center text-[13px] font-semibold transition-colors"
              style={{
                color: activeTab === tab ? 'var(--accent-social)' : 'var(--text-hint)',
                borderBottom: activeTab === tab ? '2px solid var(--accent-social)' : '2px solid transparent',
              }}
            >
              {tab === 'feed' ? '피드' : tab === 'ranking' ? '랭킹' : '멤버'}
            </button>
          ))}
        </div>
        {/* 우측: 뷰 전환 */}
        {(activeTab === 'feed' || activeTab === 'members') && (
          <button
            type="button"
            onClick={() => {
              if (activeTab === 'feed') setFeedViewMode((v) => v === 'card' ? 'compact' : 'card')
              if (activeTab === 'members') setMemberViewMode((v) => v === 'grid' ? 'list' : 'grid')
            }}
            className="mr-3 flex h-8 w-8 items-center justify-center rounded-lg"
          >
            {(activeTab === 'feed' ? feedViewMode === 'card' : memberViewMode === 'grid')
              ? <List size={16} style={{ color: 'var(--text-hint)' }} />
              : <Eye size={16} style={{ color: 'var(--text-hint)' }} />
            }
          </button>
        )}
      </div>

      {/* 탭 콘텐츠 */}
      <div className="flex-1 px-4 py-4">
        {activeTab === 'feed' && (
          <FeedTabContent
            bubbleId={bubbleId}
            myRole={myRole}
            contentVisibility={bubble.contentVisibility}
            viewMode={feedViewMode}
          />
        )}
        {activeTab === 'ranking' && (
          <RankingTabContent
            bubbleId={bubbleId}
            targetType={rankingTargetType}
            onTargetTypeChange={setRankingTargetType}
          />
        )}
        {activeTab === 'members' && (
          <MemberTabContent
            bubbleId={bubbleId}
            viewMode={memberViewMode}
            onMemberClick={(userId) => router.push(`/bubbles/${bubbleId}/members/${userId}`)}
          />
        )}
      </div>

      {/* 정보 시트 */}
      <BubbleInfoSheet
        isOpen={showInfoSheet}
        onClose={() => setShowInfoSheet(false)}
        bubble={bubble}
      />
    </div>
  )
}

/* ──── 피드 탭 ──── */
function FeedTabContent({
  bubbleId,
  myRole,
  contentVisibility,
  viewMode,
}: {
  bubbleId: string
  myRole: BubbleMemberRole | null
  contentVisibility: BubbleContentVisibility
  viewMode: 'card' | 'compact'
}) {
  const { shares, isLoading } = useBubbleFeed(bubbleId, myRole, contentVisibility)

  if (isLoading) {
    return <div className="flex justify-center py-8"><div className="h-5 w-5 animate-spin rounded-full border-2 border-[var(--accent-social)] border-t-transparent" /></div>
  }

  if (shares.length === 0) {
    return <p className="py-8 text-center text-[14px]" style={{ color: 'var(--text-hint)' }}>공유된 기록이 없습니다</p>
  }

  if (viewMode === 'compact') {
    return (
      <div className="flex flex-col gap-1">
        {shares.map((s) => (
          <FeedCompact
            key={s.id}
            recordId={s.recordId}
            authorName={s.authorName ?? '멤버'}
            targetName={s.targetName ?? '기록'}
            targetType={s.targetType ?? 'restaurant'}
            targetMeta={s.targetMeta ?? null}
            satisfaction={s.satisfaction ?? null}
            sharedAt={s.sharedAt}
            onClick={() => {}}
          />
        ))}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {shares.map((s) => (
        <FeedCard
          key={s.id}
          recordId={s.recordId}
          authorName={s.authorName ?? '멤버'}
          authorAvatar={s.authorAvatar ?? null}
          authorAvatarColor={s.authorAvatarColor ?? null}
          authorLevel={s.authorLevel ?? 1}
          sharedAt={s.sharedAt}
          targetName={s.targetName ?? '기록'}
          targetType={s.targetType ?? 'restaurant'}
          targetMeta={s.targetMeta ?? null}
          satisfaction={s.satisfaction ?? null}
          comment={s.comment ?? null}
          photoUrls={s.photoUrls ?? []}
          reactions={{}}
          myReactions={[]}
          likeCount={0}
          commentCount={0}
          readCount={0}
          onReactionToggle={() => {}}
          onCommentClick={() => {}}
          onClick={() => {}}
        />
      ))}
    </div>
  )
}

/* ──── 랭킹 탭 ──── */
function RankingTabContent({
  bubbleId,
  targetType,
  onTargetTypeChange,
}: {
  bubbleId: string
  targetType: RankingTargetType
  onTargetTypeChange: (t: RankingTargetType) => void
}) {
  const { rankings, isLoading } = useBubbleRanking(bubbleId, targetType)

  const top3: RankingPodiumItem[] = rankings
    .filter((r) => r.rankPosition <= 3)
    .map((r) => ({
      rank: r.rankPosition as 1 | 2 | 3,
      targetId: r.targetId,
      targetName: r.targetId.substring(0, 8),
      targetMeta: null,
      thumbnailUrl: null,
      avgSatisfaction: r.avgSatisfaction ?? 0,
      recordCount: r.recordCount,
      delta: r.delta.direction === 'new' ? 'new' as const
        : r.delta.direction === 'same' ? null
        : r.delta.direction === 'up' ? (r.delta.value as number)
        : -(r.delta.value as number),
    }))
  const rest = rankings.filter((r) => r.rankPosition > 3)

  return (
    <div>
      {/* 서브토글: 식당/와인 */}
      <div className="mb-4 flex items-center justify-center">
        <div className="flex rounded-full p-1" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          {(['restaurant', 'wine'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => onTargetTypeChange(t)}
              className="flex items-center gap-1.5 rounded-full px-4 py-1.5 text-[12px] font-semibold transition-colors"
              style={{
                backgroundColor: targetType === t ? 'var(--text)' : 'transparent',
                color: targetType === t ? 'var(--bg)' : 'var(--text-sub)',
              }}
            >
              {t === 'restaurant' ? <><UtensilsCrossed size={13} /> 식당</> : <><Wine size={13} /> 와인</>}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8"><div className="h-5 w-5 animate-spin rounded-full border-2 border-[var(--accent-social)] border-t-transparent" /></div>
      ) : rankings.length === 0 ? (
        <p className="py-8 text-center text-[14px]" style={{ color: 'var(--text-hint)' }}>랭킹 데이터가 없습니다</p>
      ) : (
        <>
          <RankingPodium items={top3} targetType={targetType} />
          {rest.length > 0 && (
            <div className="mt-2">
              <RankingList entries={rest} targetType={targetType} targetNames={{}} />
            </div>
          )}
        </>
      )}
    </div>
  )
}

/* ──── 멤버 탭 ──── */
function MemberTabContent({
  bubbleId,
  viewMode,
  onMemberClick,
}: {
  bubbleId: string
  viewMode: 'grid' | 'list'
  onMemberClick: (userId: string) => void
}) {
  const { members, isLoading } = useBubbleMembers(bubbleId)

  if (isLoading) {
    return <div className="flex justify-center py-8"><div className="h-5 w-5 animate-spin rounded-full border-2 border-[var(--accent-social)] border-t-transparent" /></div>
  }

  if (members.length === 0) {
    return <p className="py-8 text-center text-[14px]" style={{ color: 'var(--text-hint)' }}>멤버가 없습니다</p>
  }

  if (viewMode === 'list') {
    return <MemberListView members={members} onSelect={onMemberClick} />
  }

  const gridItems = members.map((m) => ({
    userId: m.userId,
    nickname: m.userId.substring(0, 6),
    avatarUrl: null,
    avatarColor: null,
    level: 1,
    levelTitle: '입문자',
    role: m.role,
    isMe: false,
    followStatus: 'none' as const,
    tasteMatchPct: m.tasteMatchPct,
    recordCount: m.memberUniqueTargetCount,
    uniqueTargetCount: m.memberUniqueTargetCount,
    badgeLabel: m.badgeLabel,
  }))

  return (
    <MemberGrid
      members={gridItems}
      onMemberClick={onMemberClick}
      onFollowToggle={() => {}}
    />
  )
}
