'use client'

import { useState, useMemo, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Trophy, Users, Settings, UserPlus, UserMinus, Plus, List, ShieldCheck, FileCheck, PencilLine, Star, Info, Sparkles } from 'lucide-react'
import { useAuth } from '@/presentation/providers/auth-provider'
import { useBubbleDetail } from '@/application/hooks/use-bubble-detail'
import { useBubbleJoin } from '@/application/hooks/use-bubble-join'
import { useBubblePhotos } from '@/application/hooks/use-bubble-photos'
import { HeroCarousel } from '@/presentation/components/detail/hero-carousel'
import { useBubbleFeed } from '@/application/hooks/use-bubble-feed'
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
import Image from 'next/image'
import { InvitePopup } from '@/presentation/components/bubble/invite-popup'
import { BubbleJoinContainer } from '@/presentation/containers/bubble-join-container'
import { MiniProfilePopup } from '@/presentation/components/profile/mini-profile-popup'
import { AddItemSearchSheet } from '@/presentation/components/bubble/add-item-search-sheet'
import { AppHeader } from '@/presentation/components/layout/app-header'
import { FabBack } from '@/presentation/components/layout/fab-back'
import { useBubbleSimilarities } from '@/application/hooks/use-bubble-similarity'
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
  const bubbleSimilarityMap = useBubbleSimilarities(user?.id ?? null, [bubbleId])
  const bubbleSimilarity = bubbleSimilarityMap.get(bubbleId) ?? null
  // 실시간 랭킹: bubble_items feed에서 집계 (크론 기반 스냅샷 대체)
  const [rankingType, setRankingType] = useState<RankingTargetType>('restaurant')

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

    // 주간 요일별 기록 수 [월,화,수,목,금,토,일]
    const weeklyChartData = [0, 0, 0, 0, 0, 0, 0]
    for (const s of weeklyShares) {
      const day = new Date(s.sharedAt).getDay()
      // JS: 일=0 → 인덱스 6, 월=1 → 인덱스 0, ...
      const idx = day === 0 ? 6 : day - 1
      weeklyChartData[idx]++
    }

    return {
      totalRecords: bubble?.recordCount ?? 0,
      weeklyRecords: weeklyShares.length,
      avgSatisfaction,
      topTargets,
      weeklyChartData,
    }
  }, [shares, mountTime, bubble?.recordCount])

  // 실시간 랭킹: shares(bubble_items feed)에서 target별 집계
  const liveRanking = useMemo(() => {
    const filtered = shares.filter((s) =>
      s.targetType === rankingType && s.targetId,
    )
    const map = new Map<string, { targetId: string; targetName: string; targetType: string; totalSatisfaction: number; count: number; ratedCount: number }>()
    for (const s of filtered) {
      const key = s.targetId ?? ''
      if (!key) continue
      const existing = map.get(key)
      if (existing) {
        existing.count++
        if (s.satisfaction != null) { existing.totalSatisfaction += s.satisfaction; existing.ratedCount++ }
      } else {
        map.set(key, {
          targetId: key,
          targetName: s.targetName ?? '',
          targetType: s.targetType ?? 'restaurant',
          totalSatisfaction: s.satisfaction ?? 0,
          count: 1,
          ratedCount: s.satisfaction != null ? 1 : 0,
        })
      }
    }
    return [...map.values()]
      .sort((a, b) => b.count - a.count || (b.ratedCount > 0 ? b.totalSatisfaction / b.ratedCount : 0) - (a.ratedCount > 0 ? a.totalSatisfaction / a.ratedCount : 0))
      .slice(0, 10)
      .map((item, i) => ({
        targetId: item.targetId,
        targetType: item.targetType as RankingTargetType,
        rankPosition: i + 1,
        avgSatisfaction: item.ratedCount > 0 ? Math.round(item.totalSatisfaction / item.ratedCount) : null,
        recordCount: item.count,
        delta: { value: 'new' as const, direction: 'new' as const },
      }))
  }, [shares, rankingType])

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

  // 랭킹 포디움: shares 데이터에서 targetName 활용
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
  const isAdmin = myRole === 'admin'
  const canInvite = isOwner || isAdmin
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
              {isMember && (
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
              <span>기록 {activitySummary.totalRecords}개</span>
              {bubble.area && (
                <>
                  <span style={{ fontSize: '11px', color: 'var(--text-hint)' }}>·</span>
                  <span>{bubble.area}</span>
                </>
              )}
              {bubbleSimilarity && (
                <>
                  <span style={{ fontSize: '11px', color: 'var(--text-hint)' }}>·</span>
                  <span className="inline-flex items-center gap-1">
                    <Sparkles size={11} style={{ color: 'var(--accent-food)' }} />
                    <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--accent-food)' }}>
                      적합도 {Math.round(bubbleSimilarity.similarity * 100)}%
                    </span>
                    <span style={{ fontSize: '11px', color: 'var(--text-hint)' }}>
                      신뢰 {Math.round(bubbleSimilarity.avgConfidence * 100)}% · {bubbleSimilarity.matchedMembers}명 기반
                    </span>
                  </span>
                </>
              )}
            </div>

            {/* 액션 버튼 행 */}
            <div className="mt-3 flex flex-wrap gap-2 pb-3">
              {isMember ? (
                <button
                  type="button"
                  onClick={() => router.push(`/?bubbleId=${bubbleId}`)}
                  className="flex items-center gap-1.5 rounded-full px-4 py-2 text-[12px] font-semibold transition-opacity active:opacity-70"
                  style={{ backgroundColor: 'var(--accent-food)', color: '#FFFFFF' }}
                >
                  <List size={13} /> 리스트 보기
                </button>
              ) : (
                <button
                  type="button"
                  disabled
                  className="flex items-center gap-1.5 rounded-full px-4 py-2 text-[12px] font-semibold opacity-40"
                  style={{ backgroundColor: 'var(--accent-food)', color: '#FFFFFF' }}
                >
                  <List size={13} /> 리스트 보기
                </button>
              )}
              {isMember && (
                <button
                  type="button"
                  onClick={() => {
                    if (canInvite) {
                      setShowInviteModal(true)
                    } else {
                      showToast('관리자 등급만 초대가 가능합니다', 3000)
                    }
                  }}
                  className="flex items-center gap-1.5 rounded-full px-4 py-2 text-[12px] font-semibold transition-opacity"
                  style={{
                    backgroundColor: canInvite ? 'var(--accent-social)' : 'var(--bg-card)',
                    color: canInvite ? 'var(--primary-foreground)' : 'var(--text-hint)',
                    border: canInvite ? 'none' : '1px solid var(--border)',
                  }}
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
          <div className="flex gap-3">
            {/* 좌측 컬럼: 공개 설정 */}
            <div className="flex-1 rounded-xl" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
              <div className="flex items-center justify-between px-3 py-2" style={{ borderBottom: '1px solid var(--border)' }}>
                <span className="text-[11px]" style={{ color: 'var(--text-hint)' }}>공개 범위</span>
                <span className="text-[12px] font-semibold" style={{ color: 'var(--text)' }}>
                  {bubble.visibility === 'private' ? '비공개' : '공개'}
                </span>
              </div>
              <div className="flex items-center justify-between px-3 py-2" style={{ borderBottom: '1px solid var(--border)' }}>
                <span className="text-[11px]" style={{ color: 'var(--text-hint)' }}>가입 방식</span>
                <span className="text-[12px] font-semibold" style={{ color: 'var(--text)' }}>
                  {bubble.joinPolicy === 'invite_only' ? '초대만'
                    : bubble.joinPolicy === 'closed' ? '팔로우만'
                    : bubble.joinPolicy === 'manual_approve' ? '승인 필요'
                    : bubble.joinPolicy === 'auto_approve' ? '자동 승인'
                    : '자유 가입'}
                </span>
              </div>
              <div className="flex items-center justify-between px-3 py-2">
                <span className="text-[11px]" style={{ color: 'var(--text-hint)' }}>탐색 노출</span>
                <span className="text-[12px] font-semibold" style={{ color: 'var(--text)' }}>
                  {bubble.isSearchable ? 'ON' : 'OFF'}
                </span>
              </div>
            </div>
            {/* 우측 컬럼: 가입 조건 */}
            <div className="flex-1 rounded-xl" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
              <div className="flex items-center justify-between px-3 py-2" style={{ borderBottom: '1px solid var(--border)' }}>
                <span className="text-[11px]" style={{ color: 'var(--text-hint)' }}>최소 기록</span>
                <span className="text-[12px] font-semibold" style={{ color: 'var(--text)' }}>
                  {bubble.minRecords > 0 ? `${bubble.minRecords}개` : '없음'}
                </span>
              </div>
              <div className="flex items-center justify-between px-3 py-2" style={{ borderBottom: '1px solid var(--border)' }}>
                <span className="text-[11px]" style={{ color: 'var(--text-hint)' }}>최소 레벨</span>
                <span className="text-[12px] font-semibold" style={{ color: 'var(--text)' }}>
                  {bubble.minLevel > 0 ? `Lv.${bubble.minLevel}` : '없음'}
                </span>
              </div>
              <div className="flex items-center justify-between px-3 py-2">
                <span className="text-[11px]" style={{ color: 'var(--text-hint)' }}>최대 인원</span>
                <span className="text-[12px] font-semibold" style={{ color: 'var(--text)' }}>
                  {bubble.maxMembers !== null ? `${bubble.maxMembers}명` : '무제한'}
                </span>
              </div>
            </div>
          </div>
        </section>

        <Divider />

        {/* ─── 버블 통계 ─── */}
        <section className="px-5 py-4">
          <h2 className="mb-3 text-[14px] font-bold" style={{ color: 'var(--text)' }}>버블 통계</h2>
          <BubbleStatsCard
            recordCount={activitySummary.totalRecords}
            memberCount={bubble.memberCount}
            weeklyRecordCount={activitySummary.weeklyRecords}
            prevWeeklyRecordCount={bubble.prevWeeklyRecordCount}
            avgSatisfaction={activitySummary.avgSatisfaction ?? bubble.avgSatisfaction}
            weeklyChartData={activitySummary.weeklyChartData}
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
              <h2 className="mb-1 text-[14px] font-bold" style={{ color: 'var(--text)' }}>전문 분야</h2>
              <p className="mb-3 text-[11px]" style={{ color: 'var(--text-hint)' }}>
                멤버들의 경험치 기반 전문성 집계
              </p>
              {(() => {
                const foodGroups = expertiseGroups.filter((g) => g.axisType === 'genre' || g.axisType === 'area')
                const wineGroups = expertiseGroups.filter((g) => g.axisType === 'wine_region' || g.axisType === 'wine_variety')
                const renderColumn = (groups: typeof expertiseGroups, accent: string) => (
                  <div className="flex min-w-0 flex-1 flex-col gap-3">
                    {groups.map((group) => (
                      <div key={group.axisType}>
                        <p className="mb-1.5 text-[12px] font-semibold" style={{ color: accent }}>
                          {group.label}
                        </p>
                        <div className="rounded-xl" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                          {group.items.map((item, i) => (
                            <div
                              key={item.axisValue}
                              className="flex items-center justify-between px-3 py-2"
                              style={i < group.items.length - 1 ? { borderBottom: '1px solid var(--border)' } : undefined}
                            >
                              <span className="min-w-0 flex-1 truncate text-[12px] font-medium" style={{ color: 'var(--text)' }}>
                                {item.axisValue}
                              </span>
                              <span className="shrink-0 text-[11px] font-semibold" style={{ color: accent }}>
                                Lv.{Math.round(item.avgLevel)}
                              </span>
                              <span className="ml-1.5 w-[30px] shrink-0 text-right text-[10px]" style={{ color: 'var(--text-hint)' }}>
                                {item.memberCount}명
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )
                return (
                  <div className="flex gap-3">
                    {foodGroups.length > 0 && renderColumn(foodGroups, 'var(--accent-food)')}
                    {wineGroups.length > 0 && renderColumn(wineGroups, 'var(--accent-wine)')}
                  </div>
                )
              })()}
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

          {liveRanking.length > 0 ? (
            <div className="rounded-xl" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
              {liveRanking.map((entry, i) => {
                const nameMap = new Map<string, string>()
                for (const s of shares) { if (s.targetId && s.targetName) nameMap.set(s.targetId, s.targetName) }
                const name = nameMap.get(entry.targetId) ?? entry.targetId.substring(0, 8)
                const accentColor = rankingType === 'restaurant' ? 'var(--accent-food)' : 'var(--accent-wine)'
                const isTop3 = i < 3
                const medalColors = ['#D4A017', '#A0A0A0', '#CD7F32']
                return (
                  <button
                    key={entry.targetId}
                    type="button"
                    onClick={() => router.push(rankingType === 'restaurant' ? `/restaurants/${entry.targetId}` : `/wines/${entry.targetId}`)}
                    className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors active:bg-[var(--bg-elevated)]"
                    style={i < liveRanking.length - 1 ? { borderBottom: '1px solid var(--border)' } : undefined}
                  >
                    {/* 순위 */}
                    <span
                      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold"
                      style={isTop3
                        ? { backgroundColor: medalColors[i], color: '#FFFFFF' }
                        : { backgroundColor: 'var(--bg-elevated)', color: 'var(--text-hint)' }}
                    >
                      {i + 1}
                    </span>
                    {/* 이름 */}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-semibold" style={{ color: 'var(--text)' }}>{name}</p>
                      <p className="text-[11px]" style={{ color: 'var(--text-hint)' }}>
                        {entry.recordCount}개 기록
                      </p>
                    </div>
                    {/* 점수 */}
                    {entry.avgSatisfaction != null && (
                      <span className="shrink-0 text-[16px] font-bold" style={{ color: accentColor }}>
                        {entry.avgSatisfaction}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
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

