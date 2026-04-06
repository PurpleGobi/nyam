'use client'

import { useState, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Trophy, Users, Map, ArrowUpDown, Search, X, Settings, UtensilsCrossed, Wine } from 'lucide-react'
import { useAuth } from '@/presentation/providers/auth-provider'
import { useBubbleDetail } from '@/application/hooks/use-bubble-detail'
import { useBubbleFeed } from '@/application/hooks/use-bubble-feed'
import type { FeedShareEnriched } from '@/application/hooks/use-bubble-feed'
import { useBubbleRanking } from '@/application/hooks/use-bubble-ranking'
import { useBubbleMembers } from '@/application/hooks/use-bubble-members'
import type { MemberRoleFilter, MemberMatchFilter } from '@/application/hooks/use-bubble-members'
import { useInviteLink } from '@/application/hooks/use-invite-link'
import { BubbleInfoSheet } from '@/presentation/components/bubble/bubble-info-sheet'
import { CompactListItem } from '@/presentation/components/home/compact-list-item'
import { ConditionFilterBar } from '@/presentation/components/home/condition-filter-bar'
import { AdvancedFilterSheet } from '@/presentation/components/home/advanced-filter-sheet'
import { RankingPodium } from '@/presentation/components/bubble/ranking-podium'
import type { RankingPodiumItem } from '@/presentation/components/bubble/ranking-podium'
import { RankingList } from '@/presentation/components/bubble/ranking-list'
import { MemberGrid } from '@/presentation/components/bubble/member-grid'
import { MemberListView } from '@/presentation/components/bubble/member-list-view'
import { InviteLinkGenerator } from '@/presentation/components/bubble/invite-link-generator'
import { AppHeader } from '@/presentation/components/layout/app-header'
import { FabBack } from '@/presentation/components/layout/fab-back'
import { StickyTabs } from '@/presentation/components/ui/sticky-tabs'
import { FilterChip, FilterChipGroup } from '@/presentation/components/ui/filter-chip'
import { SortDropdown } from '@/presentation/components/home/sort-dropdown'
import { BubbleIcon } from '@/presentation/components/bubble/bubble-icon'
import { BubbleMiniHeader } from '@/presentation/components/bubble/bubble-mini-header'
import type { RankingTargetType } from '@/domain/entities/bubble'
import type { SortOption } from '@/domain/entities/saved-filter'
import type { FilterChipItem, AdvancedFilterChip } from '@/domain/entities/condition-chip'
import { chipsToFilterRules, isAdvancedChip } from '@/domain/entities/condition-chip'
import { RESTAURANT_FILTER_ATTRIBUTES, WINE_FILTER_ATTRIBUTES } from '@/domain/entities/filter-config'
import { matchesAllRules } from '@/domain/services/filter-matcher'

interface BubbleDetailContainerProps {
  bubbleId: string
}

type ContentTab = 'restaurant' | 'wine'
type SubPage = 'list' | 'ranking' | 'members'

const SORT_LABELS: Partial<Record<SortOption, string>> = {
  latest: '최신순',
  score_high: '점수 높은순',
  score_low: '점수 낮은순',
  name: '이름순',
  visit_count: '방문 많은순',
}

const PAGE_SIZE = 8

/** targetId별로 그룹핑한 집계 카드 데이터 */
interface AggregatedTarget {
  targetId: string
  targetType: 'restaurant' | 'wine'
  name: string
  category: string | null
  area: string | null
  photoUrl: string | null
  avgSatisfaction: number
  memberCount: number
  latestSharedAt: string
  latestVisitDate: string | null
  isMine: boolean
  mySatisfaction: number | null
  tasteMatchPct: number | null
  dots: Array<{ axisX: number; axisY: number; satisfaction: number; avatarColor: string; nickname: string }>
}

function aggregateByTarget(shares: FeedShareEnriched[], currentUserId: string | null): AggregatedTarget[] {
  const grouped: Record<string, FeedShareEnriched[]> = {}
  for (const s of shares) {
    const key = s.targetId ?? ''
    if (!key) continue
    if (!grouped[key]) grouped[key] = []
    grouped[key].push(s)
  }

  const result: AggregatedTarget[] = []
  for (const [targetId, group] of Object.entries(grouped)) {
    const first = group[0]
    const isWine = first.targetType === 'wine'

    // 카테고리: 식당=장르, 와인=빈티지·스타일·와이너리·품종
    const category = isWine
      ? [
          first.targetVintage ? String(first.targetVintage) : null,
          first.targetWineType,
          first.targetProducer,
          first.targetMeta, // variety
        ].filter(Boolean).join(' · ') || null
      : first.targetMeta ?? null

    // 지역: 식당=area, 와인=region, country
    const area = isWine
      ? [first.targetArea, first.targetCountry].filter(Boolean).join(', ') || null
      : first.targetArea ?? null

    // 평가한 멤버들의 dot + 평균
    const rated = group.filter((s) => s.satisfaction != null)
    const avgSat = rated.length > 0
      ? Math.round(rated.reduce((sum, s) => sum + (s.satisfaction ?? 0), 0) / rated.length)
      : 0
    const dots = rated
      .filter((s) => s.axisX != null && s.axisY != null)
      .map((s) => ({
        axisX: s.axisX!,
        axisY: s.axisY!,
        satisfaction: s.satisfaction!,
        avatarColor: s.authorAvatarColor ?? 'var(--text-hint)',
        nickname: s.authorName ?? '',
      }))

    const latestSharedAt = group.reduce((latest, s) =>
      s.sharedAt > latest ? s.sharedAt : latest, group[0].sharedAt)

    // 최신 방문일
    const visitDates = group.map((s) => s.visitDate).filter(Boolean) as string[]
    const latestVisitDate = visitDates.length > 0
      ? visitDates.sort().reverse()[0]
      : null

    // 내 기록 + 일치도
    const myShare = currentUserId ? group.find((s) => s.sharedBy === currentUserId) : null
    let tasteMatchPct: number | null = null
    if (myShare?.satisfaction != null && avgSat > 0) {
      tasteMatchPct = Math.max(0, 100 - Math.abs(myShare.satisfaction - avgSat))
    }

    result.push({
      targetId,
      targetType: first.targetType ?? 'restaurant',
      name: first.targetName ?? '',
      category,
      area,
      photoUrl: first.targetPhotoUrl ?? null,
      avgSatisfaction: avgSat,
      memberCount: rated.length,
      latestSharedAt,
      latestVisitDate,
      isMine: myShare != null,
      mySatisfaction: myShare?.satisfaction ?? null,
      tasteMatchPct,
      dots,
    })
  }

  return result
}

function sortTargets(targets: AggregatedTarget[], sort: SortOption): AggregatedTarget[] {
  const sorted = [...targets]
  switch (sort) {
    case 'latest':
      return sorted.sort((a, b) => b.latestSharedAt.localeCompare(a.latestSharedAt))
    case 'score_high':
      return sorted.sort((a, b) => b.avgSatisfaction - a.avgSatisfaction)
    case 'score_low':
      return sorted.sort((a, b) => a.avgSatisfaction - b.avgSatisfaction)
    case 'name':
      return sorted.sort((a, b) => a.name.localeCompare(b.name))
    case 'visit_count':
      return sorted.sort((a, b) => b.memberCount - a.memberCount)
    default:
      return sorted
  }
}

function searchTargets(targets: AggregatedTarget[], query: string): AggregatedTarget[] {
  if (!query.trim()) return targets
  const q = query.trim().toLowerCase()
  return targets.filter((t) =>
    t.name.toLowerCase().includes(q)
    || (t.category ?? '').toLowerCase().includes(q)
    || (t.area ?? '').toLowerCase().includes(q),
  )
}

export function BubbleDetailContainer({ bubbleId }: BubbleDetailContainerProps) {
  const router = useRouter()
  const { user } = useAuth()
  const { bubble, myRole, tasteMatch, isLoading } = useBubbleDetail(bubbleId, user?.id ?? null)

  const [activeTab, setActiveTab] = useState<ContentTab>('restaurant')
  const [subPage, setSubPage] = useState<SubPage>('list')
  const [showInfoSheet, setShowInfoSheet] = useState(false)
  const [showInviteModal, setShowInviteModal] = useState(false)
  const { inviteCode, generateLink, copyToClipboard, isLoading: inviteLoading } = useInviteLink(bubbleId)
  const [inviteExpiresAt, setInviteExpiresAt] = useState<string | null>(null)

  // 소팅 / 검색 / 필터
  const [isSortOpen, setIsSortOpen] = useState(false)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [currentSort, setCurrentSort] = useState<SortOption>('latest')
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [conditionChips, setConditionChips] = useState<FilterChipItem[]>([])
  const [filterRules, setFilterRules] = useState<import('@/domain/entities/saved-filter').FilterRule[]>([])
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false)
  const [prevTab, setPrevTab] = useState(activeTab)

  // 탭 전환 시 칩 초기화
  if (prevTab !== activeTab) {
    setPrevTab(activeTab)
    setConditionChips([])
    setFilterRules([])
  }

  const handleChipsChange = useCallback((chips: FilterChipItem[]) => {
    setConditionChips(chips)
    setFilterRules(chipsToFilterRules(chips))
  }, [])

  const handleAdvancedApply = useCallback((chip: AdvancedFilterChip) => {
    const hasExisting = conditionChips.some(isAdvancedChip)
    const nextChips = hasExisting
      ? conditionChips.map((c) => isAdvancedChip(c) ? chip : c)
      : [...conditionChips, chip]
    handleChipsChange(nextChips)
  }, [conditionChips, handleChipsChange])

  const filterAttributes = activeTab === 'restaurant'
    ? RESTAURANT_FILTER_ATTRIBUTES
    : WINE_FILTER_ATTRIBUTES

  const toggleSort = useCallback(() => {
    setIsSortOpen((p) => !p)
    setIsSearchOpen(false)
  }, [])

  const toggleSearch = useCallback(() => {
    setIsSearchOpen((p) => !p)
    setIsSortOpen(false)
  }, [])

  // 피드 데이터
  const { shares, isLoading: feedLoading } = useBubbleFeed(
    bubbleId,
    myRole,
    bubble?.contentVisibility ?? 'rating_and_comment',
  )

  // 탭별 필터 → targetId별 집계
  const userId = user?.id ?? null
  const aggregated = useMemo(() => {
    const tabShares = shares.filter((s) => s.targetType === activeTab)
    return aggregateByTarget(tabShares, userId)
  }, [shares, activeTab, userId])

  // 필터 + 검색 + 정렬
  const displayTargets = useMemo(() => {
    let result = aggregated
    // 조건 필터 적용 (category → genre, area → area 매핑)
    if (filterRules.length > 0) {
      result = result.filter((t) => {
        const obj: Record<string, unknown> = {
          genre: t.category,
          area: t.area,
          satisfaction: t.avgSatisfaction,
          member_count: t.memberCount,
        }
        return matchesAllRules(obj, filterRules, 'and')
      })
    }
    result = searchTargets(result, searchQuery)
    result = sortTargets(result, currentSort)
    return result
  }, [aggregated, filterRules, searchQuery, currentSort])

  // 페이지네이션
  const totalPages = Math.max(1, Math.ceil(displayTargets.length / PAGE_SIZE))
  const pagedTargets = displayTargets.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  // 탭/검색/정렬 변경 시 페이지 리셋
  const pageResetKey = `${activeTab}-${searchQuery}-${currentSort}-${conditionChips.length}`
  const [prevResetKey, setPrevResetKey] = useState(pageResetKey)
  if (prevResetKey !== pageResetKey) {
    setPrevResetKey(pageResetKey)
    setCurrentPage(1)
  }

  // 서브페이지 전환 시 리스트로 돌아올 때 상태 유지
  const handleSubPageChange = useCallback((page: SubPage) => {
    setSubPage(page)
    setIsSortOpen(false)
    setIsSearchOpen(false)
  }, [])

  if (isLoading || !bubble) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center" style={{ backgroundColor: 'var(--bg)' }}>
        <div className="h-6 w-6 animate-spin rounded-full border-[3px] border-[var(--accent-social)] border-t-transparent" />
        <span className="mt-3 text-[12px]" style={{ color: 'var(--text-hint)' }}>버블 불러오는 중...</span>
      </div>
    )
  }

  const isOwner = myRole === 'owner'
  const accentType = activeTab === 'restaurant' ? 'food' as const : 'wine' as const

  const tabVariant = activeTab === 'restaurant' ? 'food' as const : 'wine' as const

  return (
    <div className="content-detail flex min-h-dvh flex-col" style={{ backgroundColor: 'var(--bg)' }}>
      <AppHeader />
      <FabBack />

      {/* 스티키 영역: 버블 헤더 + 탭 + 필터 */}
      <div style={{ position: 'sticky', top: '46px', zIndex: 80, backgroundColor: 'var(--bg)' }}>
        <BubbleMiniHeader
          bubbleId={bubbleId}
          name={bubble.name}
          description={bubble.description}
          icon={bubble.icon}
          iconBgColor={bubble.iconBgColor}
          memberCount={bubble.memberCount}
        />
        <StickyTabs
          tabs={[
            { key: 'restaurant' as const, label: '식당', variant: 'food' },
            { key: 'wine' as const, label: '와인', variant: 'wine' },
          ]}
          activeTab={subPage === 'list' ? activeTab : activeTab}
          variant={tabVariant}
          onTabChange={(tab) => {
            setActiveTab(tab)
            setSubPage('list')
          }}
          rightSlot={
            isSearchOpen ? (
              <div className="flex flex-1 items-center gap-2" style={{ marginLeft: '8px' }}>
                <Search size={16} className="shrink-0" style={{ color: 'var(--text-hint)' }} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="이름으로 검색"
                  style={{
                    flex: 1, minWidth: 0, border: 'none', background: 'none',
                    fontSize: '13px', color: 'var(--text)', outline: 'none',
                  }}
                />
                {searchQuery.length > 0 && (
                  <button type="button" onClick={() => setSearchQuery('')} style={{ color: 'var(--text-hint)' }}>
                    <X size={14} />
                  </button>
                )}
                <button type="button" onClick={toggleSearch} className="shrink-0 text-[12px] font-medium" style={{ color: 'var(--text-sub)' }}>
                  닫기
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-0.5">
                <button
                  type="button"
                  onClick={() => handleSubPageChange(subPage === 'ranking' ? 'list' : 'ranking')}
                  className={`icon-button ${subPage === 'ranking' ? `active ${accentType}` : ''}`}
                  title="랭킹"
                >
                  <Trophy size={18} />
                </button>
                <button
                  type="button"
                  onClick={() => handleSubPageChange(subPage === 'members' ? 'list' : 'members')}
                  className={`icon-button ${subPage === 'members' ? `active ${accentType}` : ''}`}
                  title="멤버"
                >
                  <Users size={18} />
                </button>
                <button type="button" className="icon-button" title="지도">
                  <Map size={18} />
                </button>
                <button
                  type="button"
                  onClick={toggleSort}
                  className={`icon-button ${isSortOpen ? `active ${accentType}` : ''}`}
                  title="정렬"
                >
                  <ArrowUpDown size={18} />
                </button>
                <button
                  type="button"
                  onClick={toggleSearch}
                  className={`icon-button ${isSearchOpen ? `active ${accentType}` : ''}`}
                  title="검색"
                >
                  <Search size={18} />
                </button>
              </div>
            )
          }
        />

        {/* 소트 드롭다운 */}
        {subPage === 'list' && isSortOpen && (
          <div className="relative">
            <SortDropdown
              currentSort={currentSort}
              onSortChange={(s) => { setCurrentSort(s); setIsSortOpen(false) }}
              accentType={accentType}
            />
          </div>
        )}

        {/* 필터 칩 바 + 페이저 */}
        {subPage === 'list' && (
          <ConditionFilterBar
            chips={conditionChips}
            onChipsChange={handleChipsChange}
            attributes={filterAttributes}
            accentType={accentType}
            onAdvancedOpen={() => setIsAdvancedOpen(true)}
            recordPage={currentPage}
            recordTotalPages={totalPages}
            onRecordPagePrev={() => setCurrentPage((p) => Math.max(1, p - 1))}
            onRecordPageNext={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
          />
        )}

        {/* Advanced Filter 바텀 시트 */}
        <AdvancedFilterSheet
          isOpen={isAdvancedOpen}
          onClose={() => setIsAdvancedOpen(false)}
          onApply={handleAdvancedApply}
          attributes={filterAttributes}
          accentType={accentType}
        />
      </div>

      {/* 콘텐츠 영역 */}
      <div className="flex-1">
        {subPage === 'list' && (
          <ListContent
            targets={pagedTargets}
            isLoading={feedLoading}
            activeTab={activeTab}
            bubbleId={bubbleId}
          />
        )}
        {subPage === 'ranking' && (
          <RankingContent bubbleId={bubbleId} activeTab={activeTab} />
        )}
        {subPage === 'members' && (
          <MemberContent
            bubbleId={bubbleId}
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

/* ──── 리스트 콘텐츠 ──── */
function ListContent({
  targets,
  isLoading,
  activeTab,
  bubbleId,
}: {
  targets: AggregatedTarget[]
  isLoading: boolean
  activeTab: ContentTab
  bubbleId: string
}) {
  const router = useRouter()
  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-[var(--accent-social)] border-t-transparent" />
      </div>
    )
  }

  if (targets.length === 0) {
    return (
      <div className="flex flex-col items-center py-16">
        {activeTab === 'restaurant' ? (
          <UtensilsCrossed size={40} style={{ color: 'var(--text-hint)' }} />
        ) : (
          <Wine size={40} style={{ color: 'var(--text-hint)' }} />
        )}
        <p className="mt-3 text-[14px] font-semibold" style={{ color: 'var(--text)' }}>
          {activeTab === 'restaurant' ? '공유된 식당이 없어요' : '공유된 와인이 없어요'}
        </p>
        <p className="mt-1 text-[12px]" style={{ color: 'var(--text-hint)' }}>
          멤버들이 기록을 공유하면 여기에 나타나요
        </p>
      </div>
    )
  }

  return (
    <div className="px-4 pb-24">
      {targets.map((t, i) => (
        <CompactListItem
          key={t.targetId}
          rank={i + 1}
          photoUrl={t.photoUrl}
          name={t.name}
          meta={[t.category, t.area].filter(Boolean).join(' · ')}
          score={t.avgSatisfaction || null}
          axisX={null}
          axisY={null}
          accentType={t.targetType}
          onClick={() => router.push(`/${t.targetType === 'restaurant' ? 'restaurants' : 'wines'}/${t.targetId}?bubble=${bubbleId}`)}
          bubbleDots={t.dots}
          memberCount={t.memberCount}
          latestReviewAt={t.latestVisitDate ?? t.latestSharedAt}
        />
      ))}
    </div>
  )
}

/* ──── 랭킹 콘텐츠 ──── */
function RankingContent({
  bubbleId,
  activeTab,
}: {
  bubbleId: string
  activeTab: ContentTab
}) {
  const targetType: RankingTargetType = activeTab
  const { rankings, isLoading } = useBubbleRanking(bubbleId, targetType)

  const top3: RankingPodiumItem[] = rankings
    .filter((r) => r.rankPosition <= 3)
    .map((r) => ({
      rank: r.rankPosition as 1 | 2 | 3,
      targetId: r.targetId,
      targetName: r.targetId.substring(0, 8),
      targetMeta: null,
      photoUrl: null,
      avgSatisfaction: r.avgSatisfaction ?? 0,
      recordCount: r.recordCount,
      delta: r.delta.direction === 'new' ? 'new' as const
        : r.delta.direction === 'same' ? null
        : r.delta.direction === 'up' ? (r.delta.value as number)
        : -(r.delta.value as number),
    }))
  const rest = rankings.filter((r) => r.rankPosition > 3)

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-[var(--accent-social)] border-t-transparent" />
      </div>
    )
  }

  if (rankings.length === 0) {
    return (
      <div className="flex flex-col items-center py-16">
        <Trophy size={40} style={{ color: 'var(--text-hint)' }} />
        <p className="mt-3 text-[14px] font-semibold" style={{ color: 'var(--text)' }}>아직 랭킹이 없어요</p>
        <p className="mt-1 text-[12px]" style={{ color: 'var(--text-hint)' }}>기록이 쌓이면 주간 랭킹이 생겨요</p>
      </div>
    )
  }

  return (
    <div className="px-4 pb-24 pt-2">
      <RankingPodium items={top3} targetType={targetType} />
      {rest.length > 0 && (
        <div className="mt-2">
          <RankingList entries={rest} targetType={targetType} targetNames={{}} />
        </div>
      )}
    </div>
  )
}

/* ──── 멤버 콘텐츠 ──── */
function MemberContent({
  bubbleId,
  currentUserId,
  onMemberClick,
}: {
  bubbleId: string
  currentUserId: string | null
  onMemberClick: (userId: string) => void
}) {
  const { members, filters, setFilters, sort, setSort, isLoading } = useBubbleMembers(bubbleId)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-[var(--accent-social)] border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="px-4 pb-24 pt-2">
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
    </div>
  )
}
