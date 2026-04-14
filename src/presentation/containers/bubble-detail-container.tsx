'use client'

import { useState, useMemo, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Trophy, Users, Settings, UserPlus, UserMinus, Plus, List, ShieldCheck, FileCheck, PencilLine, Star, Info } from 'lucide-react'
import { useAuth } from '@/presentation/providers/auth-provider'
import { useBubbleDetail } from '@/application/hooks/use-bubble-detail'
import { useBubbleJoin } from '@/application/hooks/use-bubble-join'
import { useBubblePhotos } from '@/application/hooks/use-bubble-photos'
import { HeroCarousel } from '@/presentation/components/detail/hero-carousel'
import { useBubbleFeed } from '@/application/hooks/use-bubble-feed'
import { useBubbleRanking } from '@/application/hooks/use-bubble-ranking'
import { useBubbleMembers } from '@/application/hooks/use-bubble-members'
import { useSingleBubbleExpertise } from '@/application/hooks/use-bubble-expertise'
import { useInviteLink } from '@/application/hooks/use-invite-link'
import { useBubbleInviteMember } from '@/application/hooks/use-bubble-invite-member'
import { useBubbleMember } from '@/application/hooks/use-bubble-member'
import { useBubbleItems } from '@/application/hooks/use-bubble-items'
import { useSearch } from '@/application/hooks/use-search'
import { useToast } from '@/presentation/components/ui/toast'
import { BubbleIcon } from '@/presentation/components/bubble/bubble-icon'
import { BubbleStatsCard } from '@/presentation/components/bubble/bubble-stats-card'
import { RankingPodium } from '@/presentation/components/bubble/ranking-podium'
import type { RankingPodiumItem } from '@/presentation/components/bubble/ranking-podium'
import { RankingList } from '@/presentation/components/bubble/ranking-list'
import Image from 'next/image'
import { InvitePopup } from '@/presentation/components/bubble/invite-popup'
import { BubbleJoinContainer } from '@/presentation/containers/bubble-join-container'
import { MiniProfilePopup } from '@/presentation/components/profile/mini-profile-popup'
import { AddItemSearchSheet } from '@/presentation/components/bubble/add-item-search-sheet'
import { AppHeader } from '@/presentation/components/layout/app-header'
import { FabBack } from '@/presentation/components/layout/fab-back'
import type { RankingTargetType, ExpertiseAxisType } from '@/domain/entities/bubble'

interface BubbleDetailContainerProps {
  bubbleId: string
}

export function BubbleDetailContainer({ bubbleId }: BubbleDetailContainerProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useAuth()
  const { bubble, myRole, myStatus, tasteMatch, isLoading, refetch } = useBubbleDetail(bubbleId, user?.id ?? null)
  const { cancelJoin, isLoading: isJoinLoading } = useBubbleJoin()
  const { photos: bubblePhotos } = useBubblePhotos(bubbleId)

  const [showInviteModal, setShowInviteModal] = useState(false)
  const [showJoinFlow, setShowJoinFlow] = useState(searchParams.get('join') === 'true')
  const [showAddItemSearch, setShowAddItemSearch] = useState(false)
  const [miniProfileUserId, setMiniProfileUserId] = useState<string | null>(null)
  const [rankingType, setRankingType] = useState<RankingTargetType>('restaurant')

  const { showToast } = useToast()
  const { expertise } = useSingleBubbleExpertise(bubbleId)
  const { inviteCode, generateLink, copyToClipboard, isLoading: inviteLoading } = useInviteLink(bubbleId)
  const {
    searchResults: inviteSearchResults,
    isSearching: inviteIsSearching,
    isInviting,
    invitedIds,
    searchUsers: inviteSearchUsers,
    inviteUser,
    clearSearch: inviteClearSearch,
  } = useBubbleInviteMember(bubbleId)
  const { pendingInvites, refreshPending } = useBubbleMember(bubbleId, user?.id ?? null)
  const { members, isLoading: membersLoading } = useBubbleMembers(bubbleId)
  const { rankings: ranking, isLoading: rankingLoading } = useBubbleRanking(bubbleId, rankingType)

  // 대상 추가 검색
  const { addItemToBubble } = useBubbleItems(user?.id ?? null, null, 'restaurant')
  const { setQuery: setSearchQuery, results: searchResults, isSearching: isSearchLoading, executeSearch } = useSearch({ targetType: 'restaurant' })

  // 직접 초대 — 멤버 ID 제외 검색
  const memberIds = useMemo(() => members.map((m) => m.userId), [members])

  const handleInviteSearch = useCallback((query: string) => {
    inviteSearchUsers(query, memberIds)
  }, [inviteSearchUsers, memberIds])

  const handleInviteUser = useCallback(async (targetUserId: string) => {
    if (!user) return
    const result = await inviteUser(targetUserId, user.id, bubble?.name ?? '', user.nickname, pendingInvites)
    if (result.duplicate) {
      showToast('이미 초대한 사용자입니다', 3000)
      return
    }
    refreshPending()
  }, [user, bubble?.name, inviteUser, pendingInvites, showToast, refreshPending])

  const handleInviteClose = useCallback(() => {
    setShowInviteModal(false)
    inviteClearSearch()
  }, [inviteClearSearch])

  const handleSearchInSheet = useCallback((q: string) => {
    setSearchQuery(q)
    executeSearch(q)
  }, [setSearchQuery, executeSearch])

  const handleAddItemFromSearch = useCallback(async (targetId: string, targetType: 'restaurant' | 'wine') => {
    await addItemToBubble(bubbleId, targetId, targetType, 'manual')
  }, [bubbleId, addItemToBubble])

  // 피드에서 활동 요약 계산
  const { shares } = useBubbleFeed(
    bubbleId,
    myRole,
    bubble?.contentVisibility ?? 'rating_and_comment',
  )

  const [mountTime] = useState(() => Date.now())
  const activitySummary = useMemo(() => {
    const thisWeek = mountTime - 7 * 24 * 60 * 60 * 1000
    const weeklyShares = shares.filter((s) => new Date(s.sharedAt).getTime() > thisWeek)

    // 인기 대상 (가장 많은 기록)
    const targetCounts = new Map<string, { name: string; count: number; type: string }>()
    for (const s of shares) {
      const key = s.targetId ?? ''
      if (!key) continue
      const existing = targetCounts.get(key)
      if (existing) {
        existing.count++
      } else {
        targetCounts.set(key, { name: s.targetName ?? '', count: 1, type: s.targetType ?? 'restaurant' })
      }
    }
    const topTargets = [...targetCounts.values()]
      .sort((a, b) => b.count - a.count)
      .slice(0, 3)

    // 전체 평균 만족도
    const rated = shares.filter((s) => s.satisfaction != null)
    const avgSatisfaction = rated.length > 0
      ? Math.round(rated.reduce((sum, s) => sum + (s.satisfaction ?? 0), 0) / rated.length)
      : null

    return {
      totalRecords: shares.length,
      weeklyRecords: weeklyShares.length,
      avgSatisfaction,
      topTargets,
    }
  }, [shares, mountTime])

  // 기존 아이템 ID 목록 (중복 방지)
  const existingTargetIds = useMemo(() => {
    return shares.map((s) => s.targetId).filter((id): id is string => id != null)
  }, [shares])

  // 검색 결과를 AddItemSearchSheet 형식으로 변환
  const searchResultsForSheet = useMemo(() => {
    return searchResults.map((r) => ({
      id: r.id,
      name: r.name,
      type: r.type,
      meta: r.type === 'restaurant'
        ? [r.genre, r.area].filter(Boolean).join(' · ')
        : [r.wineType, r.region].filter(Boolean).join(' · '),
    }))
  }, [searchResults])

  // 전문성 축별 그룹핑 (Top 5 per axis)
  const expertiseGroups = useMemo(() => {
    if (expertise.length === 0) return []

    const AXIS_LABELS: Record<ExpertiseAxisType, string> = {
      area: '지역',
      genre: '장르',
      wine_region: '산지',
      wine_variety: '품종',
    }

    const grouped = new Map<ExpertiseAxisType, typeof expertise>()
    for (const e of expertise) {
      const list = grouped.get(e.axisType) ?? []
      list.push(e)
      grouped.set(e.axisType, list)
    }

    return [...grouped.entries()]
      .map(([axisType, items]) => ({
        axisType,
        label: AXIS_LABELS[axisType],
        items: items.sort((a, b) => b.avgLevel - a.avgLevel).slice(0, 5),
      }))
      .filter((g) => g.items.length > 0)
  }, [expertise])

  // 랭킹 포디움 데이터 (target 기반: 이 버블에서 인기 있는 식당/와인)
  const podiumItems: RankingPodiumItem[] = useMemo(() => {
    return ranking.slice(0, 3).map((r, i) => ({
      rank: (i + 1) as 1 | 2 | 3,
      targetId: r.targetId,
      targetName: r.targetId, // TODO: target name은 별도 조회 필요
      targetMeta: null,
      photoUrl: null,
      avgSatisfaction: r.avgSatisfaction ?? 0,
      recordCount: r.recordCount,
      delta: typeof r.delta.value === 'number' ? r.delta.value : r.delta.value === 'new' ? ('new' as const) : null,
    }))
  }, [ranking])

  const handlePageShare = useCallback(() => {
    if (!bubble) return
    if (navigator.share) {
      navigator.share({ title: bubble.name, url: window.location.href }).catch(() => {})
    } else {
      navigator.clipboard.writeText(window.location.href).catch(() => {})
    }
  }, [bubble])

  const handleCancelJoin = useCallback(async () => {
    if (!user) return
    await cancelJoin(bubbleId, user.id)
    showToast('가입 신청을 취소했습니다')
    refetch()
  }, [user, cancelJoin, bubbleId, showToast, refetch])

  if (isLoading || !bubble) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center" style={{ backgroundColor: 'var(--bg)' }}>
        <div className="h-6 w-6 animate-spin rounded-full border-[3px] border-[var(--accent-social)] border-t-transparent" />
      </div>
    )
  }

  const isOwner = myRole === 'owner'
  const isMember = myStatus === 'active' && (myRole === 'owner' || myRole === 'admin' || myRole === 'member')
  const isPending = myStatus === 'pending'
  const joinButtonLabel = bubble.joinPolicy === 'closed'
    ? '팔로우'
    : '가입 신청'
  const canJoin = !isMember && !isPending && bubble.joinPolicy !== 'invite_only'

  return (
    <div className="content-detail flex min-h-dvh flex-col" style={{ backgroundColor: 'var(--bg)' }}>
      <AppHeader />
      <FabBack />

      <div className="flex-1 overflow-y-auto" style={{ WebkitOverflowScrolling: 'touch' }}>

        {/* ─── 히어로 (식당/와인 상세와 동일 HeroCarousel) ─── */}
        {bubblePhotos.length > 0 ? (
          <HeroCarousel
            photos={bubblePhotos.map((p) => p.url)}
            fallbackIcon="restaurant"
            onShare={handlePageShare}
          />
        ) : (
          <div
            className="relative w-full overflow-hidden"
            style={{ height: '224px' }}
          >
            {bubble.icon && (bubble.icon.startsWith('http://') || bubble.icon.startsWith('https://')) ? (
              <Image src={bubble.icon} alt="" fill className="object-cover" sizes="100vw" />
            ) : (
              <div
                className="flex h-full w-full items-center justify-center"
                style={{ backgroundColor: bubble.iconBgColor ?? 'var(--accent-social-light)' }}
              >
                <BubbleIcon icon={bubble.icon} size={48} />
              </div>
            )}
            <div
              className="pointer-events-none absolute inset-x-0 bottom-0"
              style={{ height: '80px', background: 'linear-gradient(transparent, rgba(0,0,0,0.4))' }}
            />
          </div>
        )}

        {/* ─── 이름 + 메타 (식당/와인 상세와 동일 패딩/폰트) ─── */}
        <div>
          <section style={{ padding: '14px 20px 0' }}>
            <div className="flex items-center gap-1.5">
              <h1 style={{ fontSize: '21px', fontWeight: 800, color: 'var(--text)' }}>
                {bubble.name}
              </h1>
              {isOwner && (
                <button
                  type="button"
                  onClick={() => router.push(`/bubbles/${bubbleId}/settings`)}
                  className="flex items-center justify-center rounded-full p-1 transition-opacity active:opacity-70"
                >
                  <Settings size={16} style={{ color: 'var(--text-hint)' }} />
                </button>
              )}
            </div>

            {bubble.description && (
              <p className="mt-1 text-[13px] leading-relaxed" style={{ color: 'var(--text-sub)' }}>
                {bubble.description}
              </p>
            )}

            {/* 오너: 닉네임 + @핸들 */}
            {bubble.ownerNickname && (
              <p className="mt-1 text-[12px]" style={{ color: 'var(--text-hint)' }}>
                운영자{' '}
                <span style={{ color: 'var(--text-sub)', fontWeight: 600 }}>{bubble.ownerNickname}</span>
                {bubble.ownerHandle && (
                  <span className="ml-1" style={{ color: 'var(--text-hint)' }}>@{bubble.ownerHandle}</span>
                )}
              </p>
            )}

            <div style={{ height: '1px', backgroundColor: 'var(--border)', margin: '10px 0' }} />

            {/* 멤버 · 기록 · 지역 메타 */}
            <div className="flex flex-wrap items-center gap-2 py-1" style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text)' }}>
              <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5" style={{ fontSize: '12px', fontWeight: 700, backgroundColor: 'color-mix(in srgb, var(--accent-social) 12%, transparent)', color: 'var(--accent-social)' }}>
                <Users size={11} />
                멤버 {bubble.memberCount}명
              </span>
              <span style={{ fontSize: '11px', color: 'var(--text-hint)' }}>·</span>
              <span>기록 {bubble.recordCount}개</span>
              {bubble.area && (
                <>
                  <span style={{ fontSize: '11px', color: 'var(--text-hint)' }}>·</span>
                  <span>{bubble.area}</span>
                </>
              )}
            </div>

            {/* 액션 버튼 행 */}
            <div className="mt-3 flex flex-wrap gap-2 pb-3">
              <button
                type="button"
                onClick={() => router.push(`/?bubbleId=${bubbleId}`)}
                className="flex items-center gap-1.5 rounded-full px-4 py-2 text-[12px] font-semibold transition-opacity active:opacity-70"
                style={{ backgroundColor: 'var(--accent-food)', color: '#FFFFFF' }}
              >
                <List size={13} /> 리스트 보기
              </button>
              {isMember && (
                <button
                  type="button"
                  onClick={() => setShowInviteModal(true)}
                  className="flex items-center gap-1.5 rounded-full px-4 py-2 text-[12px] font-semibold transition-opacity active:opacity-70"
                  style={{ backgroundColor: 'var(--accent-social)', color: 'var(--primary-foreground)' }}
                >
                  <UserPlus size={13} /> 초대
                </button>
              )}
              {canJoin && (
                <button
                  type="button"
                  onClick={() => setShowJoinFlow(true)}
                  className="flex items-center gap-1.5 rounded-full px-4 py-2 text-[12px] font-semibold transition-opacity active:opacity-70"
                  style={{ backgroundColor: 'var(--accent-social)', color: 'var(--primary-foreground)' }}
                >
                  <UserPlus size={13} /> {joinButtonLabel}
                </button>
              )}
              {isPending && (
                <button
                  type="button"
                  onClick={handleCancelJoin}
                  disabled={isJoinLoading}
                  className="flex items-center gap-1.5 rounded-full px-4 py-2 text-[12px] font-semibold transition-opacity active:opacity-70 disabled:opacity-50"
                  style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-sub)', border: '1px solid var(--border)' }}
                >
                  <UserMinus size={13} /> 가입 신청 취소
                </button>
              )}
            </div>
          </section>
        </div>

        <Divider />

        {/* ─── 버블 정보 ─── */}
        <section className="px-5 py-4">
          <h2 className="mb-3 flex items-center gap-1.5 text-[14px] font-bold" style={{ color: 'var(--text)' }}>
            <Info size={15} style={{ color: 'var(--accent-social)' }} /> 정보
          </h2>
          <div className="flex flex-col gap-3">
            {/* 가입 조건 */}
            <div>
              <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold" style={{ color: 'var(--text-hint)' }}>
                <ShieldCheck size={12} /> 가입 조건
              </p>
              <div className="flex flex-wrap gap-1.5">
                {(() => {
                  const conditions: Array<{ icon: typeof FileCheck; label: string }> = []
                  if (bubble.joinPolicy === 'invite_only') conditions.push({ icon: FileCheck, label: '초대만' })
                  else if (bubble.joinPolicy === 'closed') conditions.push({ icon: FileCheck, label: '팔로우만' })
                  else if (bubble.joinPolicy === 'manual_approve') conditions.push({ icon: FileCheck, label: '승인 필요' })
                  else if (bubble.joinPolicy === 'auto_approve') conditions.push({ icon: FileCheck, label: '자동 승인' })
                  else conditions.push({ icon: Users, label: '자유 가입' })
                  if (bubble.minRecords > 0) conditions.push({ icon: PencilLine, label: `기록 ${bubble.minRecords}개+` })
                  if (bubble.minLevel > 0) conditions.push({ icon: Star, label: `Lv.${bubble.minLevel}+` })
                  if (bubble.maxMembers !== null) conditions.push({ icon: Users, label: `최대 ${bubble.maxMembers}명` })
                  return conditions.map((c, i) => (
                    <span
                      key={i}
                      className="flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium"
                      style={{ backgroundColor: 'var(--bg-section)', color: 'var(--text-sub)', border: '1px solid var(--border)' }}
                    >
                      <c.icon size={11} /> {c.label}
                    </span>
                  ))
                })()}
              </div>
            </div>
            {/* 공개 설정 */}
            <div className="flex flex-wrap gap-1.5">
              <span
                className="rounded-full px-2.5 py-1 text-[11px] font-medium"
                style={{ backgroundColor: 'var(--bg-section)', color: 'var(--text-sub)', border: '1px solid var(--border)' }}
              >
                {bubble.visibility === 'private' ? '비공개' : '공개'}
              </span>
              {bubble.isSearchable && (
                <span
                  className="rounded-full px-2.5 py-1 text-[11px] font-medium"
                  style={{ backgroundColor: 'var(--bg-section)', color: 'var(--text-sub)', border: '1px solid var(--border)' }}
                >
                  탐색 노출
                </span>
              )}
            </div>
          </div>
        </section>

        <Divider />

        {/* ─── 버블 통계 ─── */}
        <section className="px-5 py-4">
          <h2 className="mb-3 text-[14px] font-bold" style={{ color: 'var(--text)' }}>버블 통계</h2>
          <BubbleStatsCard
            recordCount={bubble.recordCount}
            memberCount={bubble.memberCount}
            weeklyRecordCount={activitySummary.weeklyRecords}
            prevWeeklyRecordCount={0}
            avgSatisfaction={bubble.avgSatisfaction}
            weeklyChartData={[0, 0, 0, 0, 0, 0, 0]}
          />

          {/* 인기 대상 */}
          {activitySummary.topTargets.length > 0 && (
            <div className="mt-3">
              <p className="mb-1.5 text-[11px] font-semibold" style={{ color: 'var(--text-hint)' }}>인기</p>
              <div className="flex flex-wrap gap-1.5">
                {activitySummary.topTargets.map((t) => (
                  <button
                    key={t.name}
                    type="button"
                    onClick={() => router.push(t.type === 'wine' ? `/wines/${t.name}` : `/restaurants/${t.name}`)}
                    className="rounded-full px-2.5 py-[3px] text-[11px] font-medium"
                    style={{ backgroundColor: 'var(--bg-section)', color: 'var(--text-sub)', border: '1px solid var(--border)' }}
                  >
                    {t.name} ({t.count})
                  </button>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* ─── 전문 분야 ─── */}
        {expertiseGroups.length > 0 && (
          <>
            <Divider />
            <section className="px-5 py-4">
              <h2 className="mb-3 text-[14px] font-bold" style={{ color: 'var(--text)' }}>전문 분야</h2>
              <div className="flex flex-col gap-3">
                {expertiseGroups.map((group) => (
                  <div key={group.axisType}>
                    <p className="mb-1.5 text-[11px] font-semibold" style={{ color: 'var(--text-hint)' }}>
                      {group.label}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {group.items.map((item) => (
                        <span
                          key={item.axisValue}
                          className="rounded-full px-2.5 py-[3px] text-[11px] font-medium"
                          style={{ backgroundColor: 'var(--bg-section)', color: 'var(--text-sub)', border: '1px solid var(--border)' }}
                        >
                          {item.axisValue} Lv.{Math.round(item.avgLevel)} ({item.memberCount}명)
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}

        <Divider />

        {/* ─── 멤버 ─── */}
        <section className="px-5 py-4">
          <h2 className="mb-3 text-[14px] font-bold" style={{ color: 'var(--text)' }}>
            멤버 <span style={{ color: 'var(--text-hint)', fontWeight: 500 }}>{bubble.memberCount}</span>
          </h2>
          {membersLoading ? (
            <div className="flex justify-center py-4">
              <div className="h-5 w-5 animate-spin rounded-full border-[2px] border-[var(--accent-social)] border-t-transparent" />
            </div>
          ) : members.length === 0 ? (
            <p className="py-4 text-center text-[13px]" style={{ color: 'var(--text-hint)' }}>멤버가 없습니다</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {members.slice(0, 20).map((m) => (
                <button
                  key={m.userId}
                  type="button"
                  onClick={() => setMiniProfileUserId(m.userId)}
                  className="flex flex-col items-center gap-1 transition-opacity active:opacity-70"
                  style={{ width: '56px' }}
                >
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-full text-[13px] font-bold"
                    style={{
                      backgroundColor: m.avatarColor ?? 'var(--accent-social-light)',
                      color: 'var(--primary-foreground)',
                      border: m.userId === user?.id ? '2px solid var(--accent-social)' : '2px solid var(--bg-card)',
                    }}
                  >
                    {m.avatarUrl ? (
                      <Image src={m.avatarUrl} alt="" width={40} height={40} className="h-full w-full rounded-full object-cover" />
                    ) : (
                      (m.nickname ?? '?').charAt(0)
                    )}
                  </div>
                  <span className="w-full truncate text-center text-[10px]" style={{ color: 'var(--text-sub)' }}>
                    {m.userId === user?.id ? '나' : m.nickname}
                  </span>
                </button>
              ))}
            </div>
          )}
        </section>

        <Divider />

        {/* ─── 랭킹 ─── */}
        <section className="px-5 py-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-1.5 text-[14px] font-bold" style={{ color: 'var(--text)' }}>
              <Trophy size={15} style={{ color: 'var(--caution)' }} /> 랭킹
            </h2>
            <div className="flex gap-1">
              {(['restaurant', 'wine'] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setRankingType(type)}
                  className="rounded-full px-2.5 py-1 text-[11px] font-semibold transition-all"
                  style={{
                    backgroundColor: rankingType === type
                      ? (type === 'restaurant' ? 'var(--accent-food)' : 'var(--accent-wine)')
                      : 'var(--bg-section)',
                    color: rankingType === type ? 'var(--primary-foreground)' : 'var(--text-sub)',
                    border: rankingType === type ? 'none' : '1px solid var(--border)',
                  }}
                >
                  {type === 'restaurant' ? '식당' : '와인'}
                </button>
              ))}
            </div>
          </div>

          {rankingLoading ? (
            <div className="flex justify-center py-4">
              <div className="h-5 w-5 animate-spin rounded-full border-[2px] border-[var(--accent-social)] border-t-transparent" />
            </div>
          ) : ranking.length > 0 ? (
            <>
              <RankingPodium items={podiumItems} targetType={rankingType} />
              {ranking.length > 3 && (
                <RankingList
                  entries={ranking.slice(3)}
                  targetType={rankingType}
                  targetNames={{}}
                />
              )}
            </>
          ) : (
            <p className="py-4 text-center text-[13px]" style={{ color: 'var(--text-hint)' }}>
              아직 랭킹 데이터가 없어요
            </p>
          )}
        </section>

        {/* 취향 일치도 (본인이 멤버일 때) */}
        {tasteMatch !== null && (
          <>
            <Divider />
            <section className="px-5 py-4">
              <h2 className="mb-2 text-[14px] font-bold" style={{ color: 'var(--text)' }}>취향 일치도</h2>
              <div className="flex items-center gap-3">
                <div
                  className="flex h-[52px] w-[52px] items-center justify-center rounded-xl text-[18px] font-[800]"
                  style={{
                    backgroundColor: `color-mix(in srgb, var(--accent-social) 12%, var(--bg))`,
                    color: 'var(--accent-social)',
                  }}
                >
                  {tasteMatch}%
                </div>
                <p className="text-[13px]" style={{ color: 'var(--text-sub)' }}>
                  이 버블 멤버들과의 평균 취향 일치도예요
                </p>
              </div>
            </section>
          </>
        )}

        <div style={{ height: '100px' }} />
      </div>

      {/* 대상 추가 FAB (멤버 전용) */}
      {isMember && (
        <button
          type="button"
          onClick={() => setShowAddItemSearch(true)}
          className="fixed z-40 flex h-12 w-12 items-center justify-center rounded-full shadow-lg transition-opacity active:opacity-70"
          style={{
            bottom: '24px',
            right: '20px',
            backgroundColor: 'var(--accent-social)',
          }}
        >
          <Plus size={22} color="var(--primary-foreground)" />
        </button>
      )}

      {/* 가입 플로우 */}
      <BubbleJoinContainer
        bubbleId={bubbleId}
        isOpen={showJoinFlow}
        onClose={() => setShowJoinFlow(false)}
        onSuccess={refetch}
      />

      {/* 초대 팝업 */}
      {showInviteModal && (
        <InvitePopup
          bubbleName={bubble.name}
          inviteCode={inviteCode}
          isLinkLoading={inviteLoading}
          onGenerateLink={generateLink}
          onCopyLink={copyToClipboard}
          onClose={handleInviteClose}
          searchResults={inviteSearchResults}
          isSearching={inviteIsSearching}
          invitedIds={invitedIds}
          onSearchUsers={handleInviteSearch}
          onInviteUser={handleInviteUser}
          isInviting={isInviting}
        />
      )}

      {/* 미니 프로필 팝업 */}
      {miniProfileUserId && (
        <MiniProfilePopup
          isOpen={true}
          onClose={() => setMiniProfileUserId(null)}
          targetUserId={miniProfileUserId}
        />
      )}

      {/* 대상 추가 검색 시트 */}
      <AddItemSearchSheet
        isOpen={showAddItemSearch}
        onClose={() => setShowAddItemSearch(false)}
        bubbleName={bubble.name}
        searchResults={searchResultsForSheet}
        existingTargetIds={existingTargetIds}
        onSearch={handleSearchInSheet}
        onAdd={handleAddItemFromSearch}
        isLoading={isSearchLoading}
      />
    </div>
  )
}

function Divider() {
  return <div className="mx-5 h-px" style={{ backgroundColor: 'var(--border)' }} />
}

