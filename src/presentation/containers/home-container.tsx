'use client'

import { useState, useMemo, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { UtensilsCrossed, Wine } from 'lucide-react'
import type { FilterRule, SortOption } from '@/domain/entities/saved-filter'
import type { RecordWithTarget, RecordSource } from '@/domain/entities/record'
import type { GroupedTarget } from '@/domain/entities/grouped-target'
import type { ScoreSource } from '@/domain/entities/score'
import { groupRecordsByTarget } from '@/domain/services/record-grouper'
import type { FilterChipItem, AdvancedFilterChip } from '@/domain/entities/condition-chip'
import { chipsToFilterRules, isAdvancedChip } from '@/domain/entities/condition-chip'
import { RESTAURANT_FILTER_ATTRIBUTES, WINE_FILTER_ATTRIBUTES } from '@/domain/entities/filter-config'
import { matchesAllRules } from '@/domain/services/filter-matcher'
import { useAuth } from '@/presentation/providers/auth-provider'
import { useHomeRecords } from '@/application/hooks/use-home-records'
import type { ViewType } from '@/application/hooks/use-home-records'
import { useHomeState } from '@/application/hooks/use-home-state'
import { useCalendarRecords } from '@/application/hooks/use-calendar-records'
import { useRestaurantStats } from '@/application/hooks/use-restaurant-stats'
import { useWineStats } from '@/application/hooks/use-wine-stats'
import { useAiGreeting } from '@/application/hooks/use-ai-greeting'
import { useSettings } from '@/application/hooks/use-settings'
import { usePersistedFilterState } from '@/application/hooks/use-persisted-filter-state'
import { AppHeader } from '@/presentation/components/layout/app-header'
import { FabAdd } from '@/presentation/components/layout/fab-add'
import { AiGreeting } from '@/presentation/components/home/ai-greeting'
import { HomeTabs } from '@/presentation/components/home/home-tabs'
import { RecordCard } from '@/presentation/components/home/record-card'
import { WineCard } from '@/presentation/components/home/wine-card'
import { CompactListItem } from '@/presentation/components/home/compact-list-item'
import type { MapRecord } from '@/presentation/components/home/map-view'
import { ConditionFilterBar } from '@/presentation/components/home/condition-filter-bar'
import { AdvancedFilterSheet } from '@/presentation/components/home/advanced-filter-sheet'
import { SortDropdown } from '@/presentation/components/home/sort-dropdown'
// StatsToggle card removed — stats now toggled via icon in HomeTabs
import { PdLockOverlay } from '@/presentation/components/home/pd-lock-overlay'
import { useFollowingFeed } from '@/application/hooks/use-following-feed'

// --- Heavy components: lazy-loaded (only fetched when actually rendered) ---
const CalendarView = dynamic(() => import('@/presentation/components/home/calendar-view').then(m => ({ default: m.CalendarView })), { ssr: false })
const CalendarDayDetail = dynamic(() => import('@/presentation/components/home/calendar-day-detail').then(m => ({ default: m.CalendarDayDetail })), { ssr: false })
const MapView = dynamic(() => import('@/presentation/components/home/map-view').then(m => ({ default: m.MapView })), { ssr: false })
const FollowingFeed = dynamic(() => import('@/presentation/components/home/following-feed').then(m => ({ default: m.FollowingFeed })), { ssr: false })
const WorldMapChart = dynamic(() => import('@/presentation/components/home/world-map-chart').then(m => ({ default: m.WorldMapChart })), { ssr: false })
const GenreChart = dynamic(() => import('@/presentation/components/home/genre-chart').then(m => ({ default: m.GenreChart })), { ssr: false })
const ScoreDistribution = dynamic(() => import('@/presentation/components/home/score-distribution').then(m => ({ default: m.ScoreDistribution })), { ssr: false })
const MonthlyChart = dynamic(() => import('@/presentation/components/home/monthly-chart').then(m => ({ default: m.MonthlyChart })), { ssr: false })
const SceneChart = dynamic(() => import('@/presentation/components/home/scene-chart').then(m => ({ default: m.SceneChart })), { ssr: false })
const WineRegionMap = dynamic(() => import('@/presentation/components/home/wine-region-map').then(m => ({ default: m.WineRegionMap })), { ssr: false })
const VarietalChart = dynamic(() => import('@/presentation/components/home/varietal-chart').then(m => ({ default: m.VarietalChart })), { ssr: false })
const WineTypeChart = dynamic(() => import('@/presentation/components/home/wine-type-chart').then(m => ({ default: m.WineTypeChart })), { ssr: false })

function mapRecordSourceToScoreSource(source?: RecordSource): ScoreSource | undefined {
  if (!source || source === 'wishlist') return undefined
  const map: Record<string, ScoreSource> = {
    mine: 'my',
    following: 'following',
    bubble: 'bubble',
    public: 'nyam',
  }
  return map[source]
}

const FALLBACK_SOURCE_PRIORITY: Record<string, number> = {
  mine: 0,
  following: 1,
  bubble: 2,
  public: 3,
  wishlist: 4,
}

/** 그룹 내 source 우선순위 기반 대표 점수의 source 반환 */
function getBestScoreSource(group: GroupedTarget): RecordSource | undefined {
  const withScore = group.allRecords.filter((r) => r.satisfaction != null)
  if (withScore.length === 0) return group.allRecords[0]?.source
  const best = [...withScore].sort((a, b) => {
    const pa = FALLBACK_SOURCE_PRIORITY[a.source ?? 'wishlist'] ?? 99
    const pb = FALLBACK_SOURCE_PRIORITY[b.source ?? 'wishlist'] ?? 99
    return pa - pb
  })[0]
  return best?.source
}

function sortRecords(records: RecordWithTarget[], sort: SortOption): RecordWithTarget[] {
  const sorted = [...records]
  switch (sort) {
    case 'latest':
      return sorted.sort((a, b) => {
        const dateA = a.visitDate ?? ''
        const dateB = b.visitDate ?? ''
        if (dateA !== dateB) return dateB.localeCompare(dateA)
        return b.createdAt.localeCompare(a.createdAt)
      })
    case 'score_high':
      return sorted.sort((a, b) => (b.satisfaction ?? 0) - (a.satisfaction ?? 0))
    case 'score_low':
      return sorted.sort((a, b) => (a.satisfaction ?? 0) - (b.satisfaction ?? 0))
    case 'name':
      return sorted.sort((a, b) => a.targetName.localeCompare(b.targetName))
    case 'visit_count': {
      const visitCounts = new Map<string, number>()
      for (const r of records) {
        visitCounts.set(r.targetId, (visitCounts.get(r.targetId) ?? 0) + 1)
      }
      return sorted.sort((a, b) => (visitCounts.get(b.targetId) ?? 0) - (visitCounts.get(a.targetId) ?? 0))
    }
  }
}

function sortGroupedTargets(groups: GroupedTarget[], sort: SortOption): GroupedTarget[] {
  const sorted = [...groups]
  switch (sort) {
    case 'latest':
      return sorted.sort((a, b) => {
        const dateA = a.visitDate ?? ''
        const dateB = b.visitDate ?? ''
        if (dateA !== dateB) return dateB.localeCompare(dateA)
        return b.createdAt.localeCompare(a.createdAt)
      })
    case 'score_high':
      return sorted.sort((a, b) => (b.satisfaction ?? 0) - (a.satisfaction ?? 0))
    case 'score_low':
      return sorted.sort((a, b) => (a.satisfaction ?? 0) - (b.satisfaction ?? 0))
    case 'name':
      return sorted.sort((a, b) => a.targetName.localeCompare(b.targetName))
    case 'visit_count':
      return sorted.sort((a, b) => b.visitCount - a.visitCount)
  }
}

function searchRecords(records: RecordWithTarget[], query: string): RecordWithTarget[] {
  if (!query.trim()) return records
  const q = query.trim().toLowerCase()
  return records.filter((r) =>
    r.targetName.toLowerCase().includes(q)
    || (r.targetMeta ?? '').toLowerCase().includes(q)
    || (r.targetArea ?? '').toLowerCase().includes(q),
  )
}

function applyFilterRules(records: RecordWithTarget[], rules: FilterRule[], conjunction: 'and' | 'or'): RecordWithTarget[] {
  if (rules.length === 0) return records
  return records.filter((record) =>
    matchesAllRules(record as unknown as Record<string, unknown>, rules, conjunction),
  )
}

const MEAL_TIME_LABELS: Record<string, string> = {
  breakfast: '아침',
  lunch: '점심',
  dinner: '저녁',
  snack: '간식',
}

export function HomeContainer() {
  const { user } = useAuth()
  const router = useRouter()
  const { settings } = useSettings()
  const {
    activeTab, setActiveTab, viewMode, cycleViewMode,
    toggleMap,
    isSortOpen, toggleSort,
    isSearchOpen, toggleSearch,
    filterRules, setFilterRules,
    conjunction, setConjunction,
    currentSort, setCurrentSort,
    searchQuery, setSearchQuery,
  } = useHomeState({
    initialTab: settings?.prefHomeTab && settings.prefHomeTab !== 'last' ? settings.prefHomeTab as 'restaurant' | 'wine' : undefined,
    initialViewMode: settings?.prefViewMode && settings.prefViewMode !== 'last' ? settings.prefViewMode as 'card' | 'list' | 'calendar' : undefined,
  })

  // ── 조건 칩 상태 (디폴트: 빈 배열 = 전체보기) ──
  const [conditionChips, setConditionChips] = useState<FilterChipItem[]>([])
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false)
  const [prevTab, setPrevTab] = useState(activeTab)

  // ── Write-Behind Cache: 칩 상태 저장/복원 ──
  const { loadState, saveState } = usePersistedFilterState(user?.id ?? null)
  const [initializedTabs, setInitializedTabs] = useState<Set<string>>(new Set())

  // 초기 마운트 + 탭 전환 시 저장된 칩 복원
  useEffect(() => {
    if (!user?.id) return

    let cancelled = false
    void loadState(activeTab).then((chips) => {
      if (cancelled) return
      setInitializedTabs((prev) => {
        if (prev.has(activeTab)) return prev
        const next = new Set(prev)
        next.add(activeTab)
        return next
      })
      setConditionChips(chips)
      const rules = chipsToFilterRules(chips)
      setFilterRules(rules)
    })

    return () => { cancelled = true }
  }, [activeTab, user?.id, loadState, setFilterRules])

  // 탭 전환 시 아직 로드 안 된 탭이면 칩 초기화 (useEffect에서 복원 예정)
  if (prevTab !== activeTab) {
    setPrevTab(activeTab)
    if (!initializedTabs.has(activeTab)) {
      setConditionChips([])
    }
  }

  // 칩 변경 → filterRules 동기화 + 저장
  const handleChipsChange = useCallback((chips: FilterChipItem[]) => {
    setConditionChips(chips)
    const rules = chipsToFilterRules(chips)
    setFilterRules(rules)
    saveState(activeTab, chips)
  }, [setFilterRules, saveState, activeTab])

  // Advanced Filter 적용
  const handleAdvancedApply = useCallback((chip: AdvancedFilterChip) => {
    // 기존 advanced 칩을 교체하거나 추가
    const hasExisting = conditionChips.some(isAdvancedChip)
    let nextChips: FilterChipItem[]
    if (hasExisting) {
      nextChips = conditionChips.map((c) => isAdvancedChip(c) ? chip : c)
    } else {
      nextChips = [...conditionChips, chip]
    }
    handleChipsChange(nextChips)
  }, [conditionChips, handleChipsChange])

  // ── conditionChips에서 view 값 추출 ──
  const viewTypes: ViewType[] = useMemo(() => {
    const views: ViewType[] = []
    for (const chip of conditionChips) {
      if (isAdvancedChip(chip)) continue
      if (chip.attribute !== 'view') continue
      const vals = String(chip.value).split(',')
      for (const v of vals) {
        const trimmed = v.trim()
        if (trimmed === 'visited' || trimmed === 'wishlist' || trimmed === 'bubble' || trimmed === 'following' || trimmed === 'public') {
          views.push(trimmed)
        }
      }
    }
    return views
  }, [conditionChips])

  // view 칩은 데이터 소스 변경용이므로 filterRules에서 제외
  const nonViewFilterRules = useMemo(() => {
    return filterRules.filter((r) => r.attribute !== 'view')
  }, [filterRules])

  // ── useHomeRecords: view 기반 서버 데이터 페칭 ──
  const {
    records,
  } = useHomeRecords({
    userId: user?.id ?? null,
    tab: activeTab,
    viewTypes,
  })

  const restaurantStats = useRestaurantStats(user?.id ?? null)
  const wineStats = useWineStats(user?.id ?? null)

  // AI 인사말 — greeting-generator 기반
  const recentRecordsForGreeting = useMemo(() => {
    return records
      .filter((r) => r.targetType === 'restaurant' && r.visitDate)
      .slice(0, 5)
      .map((r) => ({
        restaurantName: r.targetName,
        restaurantId: r.targetId,
        satisfaction: r.satisfaction ?? 0,
        visitDate: r.visitDate ?? '',
        area: '',
        scene: r.scene ?? null,
      }))
  }, [records])

  const weeklyRecordCount = useMemo(() => {
    const oneWeekAgo = new Date()
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)
    const cutoff = oneWeekAgo.toISOString().slice(0, 10)
    return records.filter((r) => (r.visitDate ?? r.createdAt) >= cutoff).length
  }, [records])

  const {
    greeting,
    isVisible: isGreetingVisible,
    isDismissing: isGreetingDismissing,
    dismiss: dismissGreeting,
  } = useAiGreeting({
    recentRecords: recentRecordsForGreeting,
    weeklyRecordCount,
    frequentArea: null,
  })

  // 팔로잉 피드
  const [isFollowingMode, setIsFollowingMode] = useState(false)
  const followingFeed = useFollowingFeed({
    userId: user?.id ?? null,
    targetType: activeTab,
    enabled: isFollowingMode,
  })

  const handleFollowingSelect = useCallback(() => {
    setIsFollowingMode((prev) => !prev)
    if (!isFollowingMode) {
      setFilterRules([])
    }
  }, [isFollowingMode, setFilterRules])

  const [isStatsOpen, setIsStatsOpen] = useState(false)

  // 캘린더 상태
  const now = new Date()
  const [calYear, setCalYear] = useState(now.getFullYear())
  const [calMonth, setCalMonth] = useState(now.getMonth() + 1)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  const filterAttributes = activeTab === 'restaurant'
    ? RESTAURANT_FILTER_ATTRIBUTES
    : WINE_FILTER_ATTRIBUTES

  const accentType = activeTab === 'restaurant' ? 'food' as const : 'wine' as const
  const accentColor = accentType === 'food' ? 'var(--accent-food)' : 'var(--accent-wine)'

  const canShowStats = activeTab === 'restaurant'
    ? restaurantStats.totalRecordCount >= 5
    : wineStats.totalRecordCount >= 5

  const totalCountries = useMemo(() => {
    const countries = new Set(restaurantStats.cityStats.map((c) => c.country))
    return countries.size
  }, [restaurantStats.cityStats])

  const handleSortChange = useCallback((sort: SortOption) => {
    setCurrentSort(sort)
    toggleSort()
  }, [setCurrentSort, toggleSort])

  // 필터/검색 적용된 레코드 (그룹화 전) — view 칩은 이미 서버에서 처리됨
  const filteredRecords = useMemo(() => {
    let result = records
    result = applyFilterRules(result, nonViewFilterRules, conjunction)
    result = searchRecords(result, searchQuery)
    return result
  }, [records, nonViewFilterRules, conjunction, searchQuery])

  // 그룹화 + 소팅 (카드/리스트/맵 뷰용)
  const allGroupedTargets = useMemo(() => {
    const grouped = groupRecordsByTarget(filteredRecords)
    return sortGroupedTargets(grouped, currentSort)
  }, [filteredRecords, currentSort])

  // 캘린더 뷰용 개별 레코드 (소팅 적용)
  const allSortedRecords = useMemo(() => {
    if (viewMode !== 'calendar') return []
    return sortRecords(filteredRecords, currentSort)
  }, [filteredRecords, currentSort, viewMode])

  // 페이지네이션: 카드 5개, 리스트/지도 10개
  const pageSize = viewMode === 'list' || viewMode === 'map' ? 10 : 5
  const [currentRecordPage, setCurrentRecordPage] = useState(1)
  const totalRecordPages = Math.max(1, Math.ceil(allGroupedTargets.length / pageSize))
  const displayGrouped = allGroupedTargets.slice(
    (currentRecordPage - 1) * pageSize,
    currentRecordPage * pageSize,
  )

  // 필터/탭/뷰모드 변경 시 페이지 리셋 (useEffect 대신 렌더 중 비교)
  const pageResetKey = `${activeTab}-${filterRules.length}-${currentSort}-${searchQuery}-${conditionChips.length}-${viewMode}`
  const [prevPageResetKey, setPrevPageResetKey] = useState(pageResetKey)
  if (prevPageResetKey !== pageResetKey) {
    setPrevPageResetKey(pageResetKey)
    setCurrentRecordPage(1)
  }

  // 캘린더 레코드 — 본인 기록(visited)만 사용
  const visitedRecords = useMemo(() =>
    records.filter((r) => r.source === 'mine' || r.source === 'following'),
    [records],
  )
  const { days: calendarDays } = useCalendarRecords({
    records: visitedRecords,
    year: calYear,
    month: calMonth,
  })

  // 캘린더 선택 날짜의 상세 기록
  const selectedDayRecords = useMemo(() => {
    if (!selectedDate) return []
    return allSortedRecords.filter((r) => r.visitDate?.startsWith(selectedDate))
  }, [allSortedRecords, selectedDate])

  const selectedDateLabel = useMemo(() => {
    if (!selectedDate) return ''
    const d = new Date(selectedDate)
    const weekdays = ['일', '월', '화', '수', '목', '금', '토']
    return `${d.getMonth() + 1}월 ${d.getDate()}일 (${weekdays[d.getDay()]})`
  }, [selectedDate])

  // 맵 레코드 (식당 전용 — 그룹화로 중복 마커 제거)
  const mapRecords: MapRecord[] = useMemo(() => {
    if (activeTab !== 'restaurant') return []
    return displayGrouped.map((g) => ({
      restaurantId: g.targetId,
      name: g.targetName,
      genre: g.targetMeta ?? '',
      area: g.targetArea ?? '',
      lat: g.targetLat ?? 0,
      lng: g.targetLng ?? 0,
      score: g.satisfaction,
      distanceKm: null,
      photoUrl: g.targetPhotoUrl,
    }))
  }, [displayGrouped, activeTab])

  // 빈 상태
  const renderEmptyState = () => (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-16">
      {activeTab === 'restaurant' ? (
        <UtensilsCrossed size={48} style={{ color: 'var(--text-hint)' }} />
      ) : (
        <Wine size={48} style={{ color: 'var(--text-hint)' }} />
      )}
      <p className="mt-4 text-[15px] font-semibold text-[var(--text)]">
        {activeTab === 'restaurant' ? '첫 식당을 기록해보세요' : '첫 와인을 기록해보세요'}
      </p>
      <p className="mt-1 text-center text-[13px] text-[var(--text-hint)]">
        +버튼을 눌러 시작하세요
      </p>
    </div>
  )

  // 뷰 모드별 콘텐츠
  const renderContent = () => {
    // 지도 뷰 (식당 전용)
    if (viewMode === 'map' && activeTab === 'restaurant') {
      if (mapRecords.length === 0) return renderEmptyState()
      return (
        <div className="pb-24">
          <MapView
            records={mapRecords}
            onNavigate={(id) => router.push(`/restaurants/${id}`)}
          />
        </div>
      )
    }

    // 캘린더 뷰
    if (viewMode === 'calendar') {
      return (
        <div className="pb-24">
          <CalendarView
            year={calYear}
            month={calMonth}
            records={calendarDays}
            onMonthChange={(y, m) => { setCalYear(y); setCalMonth(m); setSelectedDate(null) }}
            onDaySelect={setSelectedDate}
            selectedDate={selectedDate}
            accentType={activeTab}
          />
          {selectedDate && selectedDayRecords.length > 0 && (
            <CalendarDayDetail
              date={selectedDateLabel}
              records={selectedDayRecords.map((r) => ({
                mealTime: MEAL_TIME_LABELS[r.mealTime ?? ''] ?? '',
                name: r.targetName,
                score: r.satisfaction,
                scoreSource: mapRecordSourceToScoreSource(r.source),
                id: r.id,
                targetType: r.targetType,
                targetId: r.targetId,
              }))}
              accentType={activeTab}
            />
          )}
        </div>
      )
    }

    // 리스트(list) 뷰
    if (viewMode === 'list') {
      if (displayGrouped.length === 0) return renderEmptyState()
      return (
        <div className="content-detail px-4 pb-24 md:px-8">
          {displayGrouped.map((group, i) => (
            <CompactListItem
              key={group.targetId}
              rank={i + 1}
              photoUrl={group.targetPhotoUrl}
              name={group.targetName}
              meta={[group.targetMeta, group.visitDate].filter(Boolean).join(' · ')}
              score={group.satisfaction}
              axisX={group.axisX}
              axisY={group.axisY}
              accentType={activeTab}
              visitCount={group.visitCount}
              scoreSource={mapRecordSourceToScoreSource(getBestScoreSource(group))}
              onClick={() =>
                router.push(
                  `/${group.targetType === 'restaurant' ? 'restaurants' : 'wines'}/${group.targetId}`,
                )
              }
            />
          ))}
          </div>
      )
    }

    // 카드(card) 뷰 — 기본
    if (displayGrouped.length === 0) return renderEmptyState()
    return (
      <div className="flex flex-col gap-3 px-4 pb-24 pt-2 md:grid md:grid-cols-2 md:gap-4 md:px-8">
        {displayGrouped.map((group) =>
          activeTab === 'wine' ? (
            <WineCard
              key={group.targetId}
              id={group.latestRecordId}
              wine={{
                id: group.targetId,
                name: group.targetName,
                wineType: '',
                variety: group.targetMeta ?? null,
                region: group.targetArea ?? null,
                photoUrl: group.targetPhotoUrl,
              }}
              myRecord={{
                satisfaction: group.satisfaction,
                axisX: group.axisX,
                axisY: group.axisY,
                visitDate: group.visitDate,
                listStatus: group.listStatus ?? 'tasted',
                purchasePrice: group.allRecords[0]?.purchasePrice ?? null,
              }}
            />
          ) : (
            <RecordCard
              key={group.targetId}
              id={group.latestRecordId}
              targetId={group.targetId}
              targetType={group.targetType}
              name={group.targetName}
              meta={[group.targetMeta, group.targetArea, group.visitDate].filter(Boolean).join(' · ')}
              photoUrl={group.targetPhotoUrl}
              satisfaction={group.satisfaction}
              axisX={group.axisX}
              axisY={group.axisY}
              status={group.listStatus ?? 'visited'}
              visitCount={group.visitCount}
              scoreSource={mapRecordSourceToScoreSource(getBestScoreSource(group))}
              sources={[
                {
                  type: 'me',
                  label: '나',
                  detail: `${group.satisfaction ?? '-'} · ${group.visitDate ?? ''}`,
                },
              ]}
            />
          ),
        )}
      </div>
    )
  }

  const isCalendarMode = viewMode === 'calendar'

  return (
    <div className="content-feed flex min-h-dvh flex-col bg-[var(--bg)]">
      <AppHeader />

      <div className="flex flex-1 flex-col">
        {isGreetingVisible && (
          <div className="pt-2">
            <AiGreeting
              greeting={greeting}
              isDismissing={isGreetingDismissing}
              onDismiss={dismissGreeting}
            />
          </div>
        )}

        <div style={{ position: 'sticky', top: '46px', zIndex: 80, backgroundColor: 'var(--bg)' }}>
        <HomeTabs
          activeTab={activeTab}
          viewMode={viewMode}
          onTabChange={setActiveTab}
          onViewCycle={cycleViewMode}
          onMapToggle={toggleMap}
          onSortToggle={toggleSort}
          isSortOpen={isSortOpen}
          onSearchToggle={() => router.push('/discover')}
          isSearchOpen={isSearchOpen}
          searchQuery={searchQuery}
          onSearchQueryChange={setSearchQuery}
          onSearchClear={() => setSearchQuery('')}
          onStatsToggle={() => setIsStatsOpen(!isStatsOpen)}
          isStatsOpen={isStatsOpen}
          canShowStats={canShowStats && !isCalendarMode && !isFollowingMode && !(viewMode === 'map' && activeTab === 'restaurant')}
          accentType={accentType}
        />

        {!isCalendarMode && isSortOpen && (
          <div className="relative">
            <SortDropdown
              currentSort={currentSort}
              onSortChange={handleSortChange}
              accentType={accentType}
            />
          </div>
        )}

        {/* 조건 필터 칩 바 — 캘린더/팔로잉 모드에서는 숨김 */}
        {!isCalendarMode && (
          <ConditionFilterBar
            chips={conditionChips}
            onChipsChange={handleChipsChange}
            attributes={filterAttributes}
            accentType={accentType}
            onAdvancedOpen={() => setIsAdvancedOpen(true)}
            recordPage={currentRecordPage}
            recordTotalPages={totalRecordPages}
            onRecordPagePrev={() => setCurrentRecordPage((p) => Math.max(1, p - 1))}
            onRecordPageNext={() => setCurrentRecordPage((p) => Math.min(totalRecordPages, p + 1))}
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

        {/* 팔로잉 피드 */}
        {isFollowingMode && (
          <FollowingFeed
            items={followingFeed.items}
            isLoading={followingFeed.isLoading}
            onItemPress={(targetId, targetType) => {
              if (targetType === 'wine') router.push(`/wines/${targetId}`)
              else router.push(`/restaurants/${targetId}`)
            }}
            sourceFilter={followingFeed.sourceFilter}
            onSourceFilterChange={followingFeed.setSourceFilter}
          />
        )}

        {/* 통계 패널 — 아이콘으로 토글 (캘린더/지도/팔로잉 모드에서는 숨김) */}
        {isStatsOpen && !isCalendarMode && !isFollowingMode && !(viewMode === 'map' && activeTab === 'restaurant') && canShowStats && (
          <div className="px-4 pt-2 md:px-8">
            <div className="flex flex-col gap-5">
              {activeTab === 'restaurant' && (
                <>
                  <WorldMapChart
                    cities={restaurantStats.cityStats}
                    totalCountries={totalCountries}
                    totalPlaces={restaurantStats.cityStats.length}
                  />

                  {restaurantStats.genreStats.length > 0 && (
                    <div>
                      <p className="mb-2 text-[13px] font-semibold" style={{ color: 'var(--text)' }}>장르</p>
                      <GenreChart genres={restaurantStats.genreStats} />
                    </div>
                  )}

                  <div>
                    <p className="mb-2 text-[13px] font-semibold" style={{ color: 'var(--text)' }}>점수 분포</p>
                    <ScoreDistribution
                      buckets={restaurantStats.scoreBuckets}
                      accentColor="var(--accent-food)"
                    />
                  </div>

                  <MonthlyChart
                    months={restaurantStats.monthlyStats}
                    totalAmount={restaurantStats.totalSpending}
                    accentColor="var(--accent-food)"
                    unit="곳"
                  />

                  {restaurantStats.sceneStats.length > 0 && (
                    <div>
                      <p className="mb-2 text-[13px] font-semibold" style={{ color: 'var(--text)' }}>상황</p>
                      <SceneChart scenes={restaurantStats.sceneStats} />
                    </div>
                  )}
                </>
              )}

              {activeTab === 'wine' && (
                <>
                  <PdLockOverlay minRecords={5} currentCount={wineStats.totalRecordCount}>
                    <WineRegionMap data={wineStats.countryStats} />
                  </PdLockOverlay>

                  <PdLockOverlay minRecords={10} currentCount={wineStats.totalRecordCount}>
                    <div className="flex flex-col gap-5">
                      <div>
                        <p className="mb-2 text-[13px] font-semibold" style={{ color: 'var(--text)' }}>품종</p>
                        <VarietalChart varieties={wineStats.varietalStats} />
                      </div>
                      <div>
                        <p className="mb-2 text-[13px] font-semibold" style={{ color: 'var(--text)' }}>점수 분포</p>
                        <ScoreDistribution
                          buckets={wineStats.scoreBuckets}
                          accentColor="var(--accent-wine)"
                        />
                      </div>
                    </div>
                  </PdLockOverlay>

                  <PdLockOverlay minRecords={20} currentCount={wineStats.totalRecordCount}>
                    <div className="flex flex-col gap-5">
                      <MonthlyChart
                        months={wineStats.monthlyStats}
                        totalAmount={wineStats.totalSpending}
                        accentColor="var(--accent-wine)"
                        unit="병"
                      />
                      <WineTypeChart types={wineStats.wineTypeStats} />
                    </div>
                  </PdLockOverlay>
                </>
              )}
            </div>
          </div>
        )}

        {/* 뷰 모드별 콘텐츠 — 팔로잉 모드에서는 숨김 */}
        {!isFollowingMode && renderContent()}
      </div>

      <FabAdd variant={activeTab === 'wine' ? 'wine' : 'food'} onClick={() => router.push(`/add?type=${activeTab}`)} />

    </div>
  )
}
