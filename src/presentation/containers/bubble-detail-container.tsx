'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, List, UtensilsCrossed, Wine, SlidersHorizontal, X } from 'lucide-react'
import { useAuth } from '@/presentation/providers/auth-provider'
import { useBubbleDetail } from '@/application/hooks/use-bubble-detail'
import { useBubbleFeed } from '@/application/hooks/use-bubble-feed'
import type { FeedFilters, FeedSortType, FeedTargetFilter, FeedPeriodFilter, FeedScoreFilter } from '@/application/hooks/use-bubble-feed'
import { useBubbleRanking } from '@/application/hooks/use-bubble-ranking'
import { useBubbleMembers } from '@/application/hooks/use-bubble-members'
import type { MemberFilters, MemberSortType, MemberRoleFilter, MemberMatchFilter } from '@/application/hooks/use-bubble-members'
import { useBubblePermissions } from '@/application/hooks/use-bubble-permissions'
import { useReactions } from '@/application/hooks/use-reactions'
import { useInviteLink } from '@/application/hooks/use-invite-link'
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
import { CommentSheetContainer } from '@/presentation/containers/comment-sheet-container'
import { InviteLinkGenerator } from '@/presentation/components/bubble/invite-link-generator'
import { AppHeader } from '@/presentation/components/layout/app-header'
import { FabBack } from '@/presentation/components/layout/fab-back'
import { StickyTabs } from '@/presentation/components/ui/sticky-tabs'
import { FilterChip, FilterChipGroup } from '@/presentation/components/ui/filter-chip'
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
  const [showInviteModal, setShowInviteModal] = useState(false)
  const { inviteCode, generateLink, copyToClipboard, isLoading: inviteLoading } = useInviteLink(bubbleId)
  const [inviteExpiresAt, setInviteExpiresAt] = useState<string | null>(null)

  if (isLoading || !bubble) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-[3px] border-[var(--accent-social)] border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="content-detail flex min-h-dvh flex-col" style={{ backgroundColor: 'var(--bg)' }}>
      {/* 헤더 */}
      <AppHeader />
      <FabBack />

      {/* 히어로 */}
      <BubbleHero
        bubble={bubble}
        myRole={myRole}
        tasteMatchPct={tasteMatch}
        onInfoClick={() => setShowInfoSheet(true)}
        onSettingsClick={() => router.push(`/bubbles/${bubbleId}/settings`)}
        onInviteClick={() => setShowInviteModal(true)}
      />

      {/* 퀵 통계 */}
      <BubbleQuickStats
        recordCount={bubble.recordCount}
        avgSatisfaction={bubble.avgSatisfaction}
        weeklyRecordCount={bubble.weeklyRecordCount}
        uniqueTargetCount={bubble.uniqueTargetCount}
      />

      {/* 스티키 탭 */}
      <StickyTabs
        tabs={[
          { key: 'feed' as const, label: '피드' },
          { key: 'ranking' as const, label: '랭킹' },
          { key: 'members' as const, label: '멤버' },
        ]}
        activeTab={activeTab}
        variant="social"
        onTabChange={setActiveTab}
        rightSlot={
          (activeTab === 'feed' || activeTab === 'members') ? (
            <button
              type="button"
              onClick={() => {
                if (activeTab === 'feed') setFeedViewMode((v) => v === 'card' ? 'compact' : 'card')
                if (activeTab === 'members') setMemberViewMode((v) => v === 'grid' ? 'list' : 'grid')
              }}
              className="icon-button"
            >
              {(activeTab === 'feed' ? feedViewMode === 'card' : memberViewMode === 'grid')
                ? <List size={20} />
                : <Eye size={20} />
              }
            </button>
          ) : undefined
        }
      />

      {/* 탭 콘텐츠 */}
      <div className="flex-1 px-4 py-4">
        {activeTab === 'feed' && (
          <FeedTabContent
            bubbleId={bubbleId}
            myRole={myRole}
            contentVisibility={bubble.contentVisibility}
            allowComments={bubble.allowComments}
            viewMode={feedViewMode}
            userId={user?.id ?? null}
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
            currentUserId={user?.id ?? null}
            onMemberClick={(userId) => router.push(`/users/${userId}?bubble=${bubbleId}`)}
          />
        )}
      </div>

      {/* 정보 시트 */}
      <BubbleInfoSheet
        isOpen={showInfoSheet}
        onClose={() => setShowInfoSheet(false)}
        bubble={bubble}
      />

      {/* 초대 모달 */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
          <div
            className="absolute inset-0"
            style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
            onClick={() => setShowInviteModal(false)}
            onKeyDown={() => {}}
            role="presentation"
          />
          <div
            className="relative w-full max-w-[400px] rounded-t-2xl p-5 pb-8 sm:rounded-2xl sm:pb-5"
            style={{ backgroundColor: 'var(--bg-card)' }}
          >
            <div className="mb-4 flex items-center justify-between">
              <span className="text-[15px] font-bold" style={{ color: 'var(--text)' }}>버블 초대</span>
              <button type="button" onClick={() => setShowInviteModal(false)} className="icon-button">
                <X size={20} style={{ color: 'var(--text-sub)' }} />
              </button>
            </div>
            <InviteLinkGenerator
              bubbleId={bubbleId}
              inviteCode={inviteCode}
              inviteExpiresAt={inviteExpiresAt}
              onGenerate={async (expiry) => {
                await generateLink(expiry)
                if (expiry === 'unlimited') {
                  setInviteExpiresAt(null)
                } else {
                  const days = expiry === '1d' ? 1 : expiry === '7d' ? 7 : 30
                  setInviteExpiresAt(new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString())
                }
              }}
              onCopy={copyToClipboard}
              isLoading={inviteLoading}
            />
          </div>
        </div>
      )}
    </div>
  )
}

/* FilterChip & FilterChipGroup imported from @/presentation/components/ui/filter-chip */

/* ──── 피드 탭 ──── */
function FeedTabContent({
  bubbleId,
  myRole,
  contentVisibility,
  allowComments,
  viewMode,
  userId,
}: {
  bubbleId: string
  myRole: BubbleMemberRole | null
  contentVisibility: BubbleContentVisibility
  allowComments: boolean
  viewMode: 'card' | 'compact'
  userId: string | null
}) {
  const { shares, filters, setFilters, sort, setSort, isLoading } = useBubbleFeed(bubbleId, myRole, contentVisibility)
  const { permissions } = useBubblePermissions(
    { allowComments, contentVisibility, joinPolicy: 'open' } as Parameters<typeof useBubblePermissions>[0],
    myRole,
  )

  // 댓글 시트 상태
  const [commentTarget, setCommentTarget] = useState<{ recordId: string; ownerId: string | null } | null>(null)

  if (isLoading) {
    return <div className="flex justify-center py-8"><div className="h-5 w-5 animate-spin rounded-full border-2 border-[var(--accent-social)] border-t-transparent" /></div>
  }

  return (
    <>
      {/* 필터칩 행 */}
      <FilterChipGroup className="mb-3">
        {(['all', 'restaurant', 'wine'] as FeedTargetFilter[]).map((t) => (
          <FilterChip key={t} active={filters.targetType === t} variant="social" onClick={() => setFilters({ ...filters, targetType: t })}>
            {t === 'all' ? '전체' : t === 'restaurant' ? '식당' : '와인'}
          </FilterChip>
        ))}
        {(['all', 'week', 'month'] as FeedPeriodFilter[]).map((p) => (
          <FilterChip key={p} active={filters.period === p} variant="social" onClick={() => setFilters({ ...filters, period: p })}>
            {p === 'all' ? '전체 기간' : p === 'week' ? '이번 주' : '이번 달'}
          </FilterChip>
        ))}
        {(['all', '90', '80'] as FeedScoreFilter[]).map((s) => (
          <FilterChip key={s} active={filters.minScore === s} variant="social" onClick={() => setFilters({ ...filters, minScore: s })}>
            {s === 'all' ? '점수 전체' : `${s}+`}
          </FilterChip>
        ))}
      </FilterChipGroup>

      {/* 정렬 */}
      <div className="mb-3 flex items-center gap-2">
        <SlidersHorizontal size={12} style={{ color: 'var(--text-hint)' }} />
        {(['recent', 'score', 'member'] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setSort(s)}
            className="text-[11px] font-semibold"
            style={{ color: sort === s ? 'var(--accent-social)' : 'var(--text-hint)' }}
          >
            {s === 'recent' ? '최신순' : s === 'score' ? '점수순' : '멤버별'}
          </button>
        ))}
      </div>

      {/* 피드 목록 */}
      {shares.length === 0 ? (
        <p className="py-8 text-center text-[14px]" style={{ color: 'var(--text-hint)' }}>공유된 기록이 없습니다</p>
      ) : viewMode === 'compact' ? (
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
      ) : (
        <div className="flex flex-col gap-3">
          {shares.map((s) => (
            <FeedCardWithReactions
              key={s.id}
              share={s}
              userId={userId}
              canReact={permissions.canReact}
              onCommentClick={() => setCommentTarget({ recordId: s.recordId, ownerId: s.sharedBy })}
            />
          ))}
        </div>
      )}

      {/* 댓글 시트 */}
      {commentTarget && (
        <CommentSheetContainer
          isOpen={!!commentTarget}
          onClose={() => setCommentTarget(null)}
          targetType="record"
          targetId={commentTarget.recordId}
          bubbleId={bubbleId}
          allowComments={allowComments}
          targetOwnerId={commentTarget.ownerId}
        />
      )}
    </>
  )
}

/* ──── 피드 카드 + 리액션 훅 연동 ──── */
function FeedCardWithReactions({
  share,
  userId,
  canReact,
  onCommentClick,
}: {
  share: ReturnType<typeof useBubbleFeed>['shares'][number]
  userId: string | null
  canReact: boolean
  onCommentClick: () => void
}) {
  const { counts, myReactions, toggle } = useReactions({
    targetType: 'record',
    targetId: share.recordId,
    userId,
    targetOwnerId: share.sharedBy,
    bookmarkTarget: null,
  })

  const handleReactionToggle = useCallback((type: ReactionType) => {
    if (!canReact) return
    toggle(type)
  }, [canReact, toggle])

  return (
    <FeedCard
      recordId={share.recordId}
      authorName={share.authorName ?? '멤버'}
      authorAvatar={share.authorAvatar ?? null}
      authorAvatarColor={share.authorAvatarColor ?? null}
      authorLevel={share.authorLevel ?? 1}
      sharedAt={share.sharedAt}
      targetName={share.targetName ?? '기록'}
      targetType={share.targetType ?? 'restaurant'}
      targetMeta={share.targetMeta ?? null}
      satisfaction={share.satisfaction ?? null}
      comment={share.comment ?? null}
      photoUrls={share.photoUrls ?? []}
      reactions={counts}
      myReactions={Array.from(myReactions)}
      likeCount={counts.like ?? 0}
      commentCount={0}
      readCount={0}
      onReactionToggle={handleReactionToggle}
      onCommentClick={onCommentClick}
      onClick={() => {}}
    />
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
  currentUserId,
  onMemberClick,
}: {
  bubbleId: string
  viewMode: 'grid' | 'list'
  currentUserId: string | null
  onMemberClick: (userId: string) => void
}) {
  const { members, filters, setFilters, sort, setSort, isLoading } = useBubbleMembers(bubbleId)

  if (isLoading) {
    return <div className="flex justify-center py-8"><div className="h-5 w-5 animate-spin rounded-full border-2 border-[var(--accent-social)] border-t-transparent" /></div>
  }

  return (
    <>
      <FilterChipGroup className="mb-3">
        {(['all', 'admin', 'member'] as MemberRoleFilter[]).map((r) => (
          <FilterChip key={r} active={filters.role === r} variant="social" onClick={() => setFilters({ ...filters, role: r })}>
            {r === 'all' ? '전체' : r === 'admin' ? '관리자' : '멤버'}
          </FilterChip>
        ))}
        {(['all', '80', '60'] as MemberMatchFilter[]).map((m) => (
          <FilterChip key={m} active={filters.minMatch === m} variant="social" onClick={() => setFilters({ ...filters, minMatch: m })}>
            {m === 'all' ? '일치도 전체' : `${m}%+`}
          </FilterChip>
        ))}
      </FilterChipGroup>

      {/* 정렬 */}
      <div className="mb-3 flex items-center gap-2">
        <SlidersHorizontal size={12} style={{ color: 'var(--text-hint)' }} />
        {(['match', 'records', 'level', 'activity'] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setSort(s)}
            className="text-[11px] font-semibold"
            style={{ color: sort === s ? 'var(--accent-social)' : 'var(--text-hint)' }}
          >
            {s === 'match' ? '일치도순' : s === 'records' ? '기록순' : s === 'level' ? '레벨순' : '활동순'}
          </button>
        ))}
      </div>

      {members.length === 0 ? (
        <p className="py-8 text-center text-[14px]" style={{ color: 'var(--text-hint)' }}>멤버가 없습니다</p>
      ) : viewMode === 'list' ? (
        <MemberListView members={members} onSelect={onMemberClick} />
      ) : (
        <MemberGrid
          members={members.map((m) => ({
            userId: m.userId,
            nickname: m.nickname,
            avatarUrl: m.avatarUrl,
            avatarColor: m.avatarColor,
            level: m.level,
            levelTitle: m.levelTitle,
            role: m.role,
            isMe: m.userId === currentUserId,
            followStatus: 'none' as const,
            tasteMatchPct: m.tasteMatchPct,
            recordCount: m.memberUniqueTargetCount,
            uniqueTargetCount: m.memberUniqueTargetCount,
            badgeLabel: m.badgeLabel,
          }))}
          onMemberClick={onMemberClick}
          onFollowToggle={() => {}}
        />
      )}
    </>
  )
}
