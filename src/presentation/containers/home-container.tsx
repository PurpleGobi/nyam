'use client'

import { useState, useMemo, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { UtensilsCrossed, Wine } from 'lucide-react'
import type { FilterRule, SortOption } from '@/domain/entities/saved-filter'
import type { RecordWithTarget } from '@/domain/entities/record'
import { RESTAURANT_FILTER_ATTRIBUTES, WINE_FILTER_ATTRIBUTES } from '@/domain/entities/filter-config'
import { matchesAllRules } from '@/domain/services/filter-matcher'
import { useAuth } from '@/presentation/providers/auth-provider'
import { useRecordsWithTarget } from '@/application/hooks/use-records'
import { useHomeState } from '@/application/hooks/use-home-state'
import { useSavedFilters } from '@/application/hooks/use-saved-filters'
import { useCalendarRecords } from '@/application/hooks/use-calendar-records'
import { useRestaurantStats } from '@/application/hooks/use-restaurant-stats'
import { useWineStats } from '@/application/hooks/use-wine-stats'
import { useAiGreeting } from '@/application/hooks/use-ai-greeting'
import { useNudge } from '@/application/hooks/use-nudge'
import { useRecommendations } from '@/application/hooks/use-recommendations'
import { useSettings } from '@/application/hooks/use-settings'
import { AppHeader } from '@/presentation/components/layout/app-header'
import { FabAdd } from '@/presentation/components/layout/fab-add'
import { AiGreeting } from '@/presentation/components/home/ai-greeting'
import { NudgeStrip } from '@/presentation/components/home/nudge-strip'
import { HomeTabs } from '@/presentation/components/home/home-tabs'
import { RecordCard } from '@/presentation/components/home/record-card'
import { WineCard } from '@/presentation/components/home/wine-card'
import { CompactListItem } from '@/presentation/components/home/compact-list-item'
import { CalendarView } from '@/presentation/components/home/calendar-view'
import { CalendarDayDetail } from '@/presentation/components/home/calendar-day-detail'
import { MapView } from '@/presentation/components/home/map-view'
import type { MapRecord } from '@/presentation/components/home/map-view'
import { SavedFilterChips } from '@/presentation/components/home/saved-filter-chips'
import { FilterSystem } from '@/presentation/components/ui/filter-system'
import { SortDropdown } from '@/presentation/components/home/sort-dropdown'
// FilterChipSaveModal은 FilterSystem 내장으로 대체
import { StatsToggle } from '@/presentation/components/home/stats-toggle'
import { WorldMapChart } from '@/presentation/components/home/world-map-chart'
import { GenreChart } from '@/presentation/components/home/genre-chart'
import { ScoreDistribution } from '@/presentation/components/home/score-distribution'
import { MonthlyChart } from '@/presentation/components/home/monthly-chart'
import { SceneChart } from '@/presentation/components/home/scene-chart'
import { WineRegionMap } from '@/presentation/components/home/wine-region-map'
import { VarietalChart } from '@/presentation/components/home/varietal-chart'
import { WineTypeChart } from '@/presentation/components/home/wine-type-chart'
import { PdLockOverlay } from '@/presentation/components/home/pd-lock-overlay'
import { RecommendationCard } from '@/presentation/components/home/recommendation-card'
import { FollowingFeed } from '@/presentation/components/home/following-feed'
import { useFollowingFeed } from '@/application/hooks/use-following-feed'

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
      // targetId별 방문 횟수 집계 후 내림차순 정렬
      const visitCounts = new Map<string, number>()
      for (const r of records) {
        visitCounts.set(r.targetId, (visitCounts.get(r.targetId) ?? 0) + 1)
      }
      return sorted.sort((a, b) => (visitCounts.get(b.targetId) ?? 0) - (visitCounts.get(a.targetId) ?? 0))
    }
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
    isMapOpen, toggleMap,
    activeChipId, setActiveChipId,
    isFilterOpen, toggleFilter,
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

  const { filters, createFilter, deleteFilter } = useSavedFilters(user?.id ?? null, activeTab)
  const { records } = useRecordsWithTarget(user?.id ?? null, activeTab)

  // 칩별 카운트: 로드된 records에 matchesAllRules 적용 (repo의 getRecordCount는 rules 미적용이므로 클라이언트 계산)
  const counts = useMemo(() => {
    const result: Record<string, number> = {}
    for (const f of filters) {
      result[f.id] = records.filter((r) =>
        matchesAllRules(r as unknown as Record<string, unknown>, f.rules, 'and'),
      ).length
    }
    return result
  }, [filters, records])

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

  // 넛지 — useNudge hook
  const hasUnratedRecords = useMemo(() => records.some((r) => r.status === 'checked'), [records])
  const {
    nudge,
    isVisible: isNudgeVisible,
    isDismissing: isNudgeDismissing,
    handleAction: handleNudgeAction,
    handleDismiss: handleNudgeDismiss,
  } = useNudge({ userId: user?.id ?? null, hasUnratedRecords, hasRecentRecords: records.length > 0 })

  // 추천 카드
  const { cards: recommendationCards } = useRecommendations(user?.id ?? null, records.length)

  // 팔로잉 피드
  const [isFollowingMode, setIsFollowingMode] = useState(false)
  const followingFeed = useFollowingFeed({
    userId: user?.id ?? null,
    targetType: activeTab,
  })

  const handleFollowingSelect = useCallback(() => {
    setIsFollowingMode((prev) => !prev)
    if (!isFollowingMode) {
      setActiveChipId(null)
      setFilterRules([])
    }
  }, [isFollowingMode, setActiveChipId, setFilterRules])

  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false)
  const [chipName, setChipName] = useState('')

  // 필터 열 때 항상 빈 상태로 초기화
  const handleFilterToggle = useCallback(() => {
    if (!isFilterOpen) {
      setFilterRules([])
      setConjunction('and')
      setChipName('')
      setActiveChipId(null)
    }
    toggleFilter()
  }, [isFilterOpen, toggleFilter, setFilterRules, setConjunction, setActiveChipId])
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

  const handleChipSelect = useCallback((chipId: string | null) => {
    setIsFollowingMode(false)
    setActiveChipId(chipId)
    if (chipId) {
      const chip = filters.find((f) => f.id === chipId)
      if (chip) {
        setFilterRules(chip.rules)
        setChipName(chip.name)
        if (chip.sortBy) setCurrentSort(chip.sortBy)
      }
    } else {
      setFilterRules([])
      setChipName('')
    }
  }, [filters, setActiveChipId, setFilterRules, setCurrentSort])

  const handleRulesChange = useCallback((rules: FilterRule[]) => {
    setFilterRules(rules)
    setActiveChipId(null)
  }, [setFilterRules, setActiveChipId])

  const handleSortChange = useCallback((sort: SortOption) => {
    setCurrentSort(sort)
    toggleSort()
  }, [setCurrentSort, toggleSort])

  const handleSaveChip = useCallback(async (name: string) => {
    await createFilter(name, filterRules, currentSort)
    setIsSaveModalOpen(false)
  }, [createFilter, filterRules, currentSort])

  // 필터/소팅/검색 적용된 레코드
  const allDisplayRecords = useMemo(() => {
    let result = records
    result = applyFilterRules(result, filterRules, conjunction)
    result = searchRecords(result, searchQuery)
    result = sortRecords(result, currentSort)
    return result
  }, [records, filterRules, conjunction, searchQuery, currentSort])

  // 페이지네이션: 카드 5개, 리스트 10개
  const pageSize = viewMode === 'list' ? 10 : 5
  const [currentRecordPage, setCurrentRecordPage] = useState(1)
  const totalRecordPages = Math.max(1, Math.ceil(allDisplayRecords.length / pageSize))
  const displayRecords = allDisplayRecords.slice(
    (currentRecordPage - 1) * pageSize,
    currentRecordPage * pageSize,
  )

  // 필터/탭/뷰모드 변경 시 페이지 리셋
  const pageResetKey = `${activeTab}-${filterRules.length}-${currentSort}-${searchQuery}-${activeChipId}-${viewMode}`
  useEffect(() => {
    setCurrentRecordPage(1)
  }, [pageResetKey])

  // 캘린더 레코드
  const { days: calendarDays } = useCalendarRecords({
    userId: user?.id ?? null,
    tab: activeTab,
    year: calYear,
    month: calMonth,
  })

  // 캘린더 선택 날짜의 상세 기록
  const selectedDayRecords = useMemo(() => {
    if (!selectedDate) return []
    return displayRecords.filter((r) => r.visitDate?.startsWith(selectedDate))
  }, [displayRecords, selectedDate])

  const selectedDateLabel = useMemo(() => {
    if (!selectedDate) return ''
    const d = new Date(selectedDate)
    const weekdays = ['일', '월', '화', '수', '목', '금', '토']
    return `${d.getMonth() + 1}월 ${d.getDate()}일 (${weekdays[d.getDay()]})`
  }, [selectedDate])

  // 맵 레코드 (식당 전용)
  const mapRecords: MapRecord[] = useMemo(() => {
    if (activeTab !== 'restaurant') return []
    return displayRecords.map((r) => ({
      restaurantId: r.targetId,
      name: r.targetName,
      genre: r.targetMeta ?? '',
      area: r.targetArea ?? '',
      lat: r.targetLat ?? 0,
      lng: r.targetLng ?? 0,
      score: r.satisfaction,
      distanceKm: null,
    }))
  }, [displayRecords, activeTab])

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
    // 지도 뷰 (식당 전용, 별도 토글)
    if (isMapOpen && activeTab === 'restaurant') {
      if (mapRecords.length === 0) return renderEmptyState()
      return (
        <div className="pb-24">
          <MapView
            records={mapRecords}
            onPinClick={(id) => router.push(`/restaurants/${id}`)}
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
      if (displayRecords.length === 0) return renderEmptyState()
      return (
        <div className="content-detail pb-24">
          {displayRecords.map((record, i) => (
            <CompactListItem
              key={record.id}
              rank={i + 1}
              thumbnailUrl={record.targetPhotoUrl}
              name={record.targetName}
              meta={[record.targetMeta, record.visitDate].filter(Boolean).join(' · ')}
              score={record.satisfaction}
              accentType={activeTab}
              onClick={() =>
                router.push(
                  `/${record.targetType === 'restaurant' ? 'restaurants' : 'wines'}/${record.targetId}`,
                )
              }
            />
          ))}
          </div>
      )
    }

    // 카드(card) 뷰 — 기본
    if (displayRecords.length === 0) return renderEmptyState()
    return (
      <div className="flex flex-col gap-3 px-4 pb-24 pt-2 md:grid md:grid-cols-2 md:gap-4 md:px-8">
        {displayRecords.map((record) =>
          activeTab === 'wine' ? (
            <WineCard
              key={record.id}
              id={record.id}
              wine={{
                id: record.targetId,
                name: record.targetName,
                wineType: '',
                variety: record.targetMeta ?? null,
                region: record.targetArea ?? null,
                photoUrl: record.targetPhotoUrl,
              }}
              myRecord={{
                satisfaction: record.satisfaction,
                axisX: record.axisX,
                axisY: record.axisY,
                visitDate: record.visitDate,
                wineStatus: record.wineStatus ?? 'tasted',
                purchasePrice: record.purchasePrice,
              }}
            />
          ) : (
            <RecordCard
              key={record.id}
              id={record.id}
              targetId={record.targetId}
              targetType={record.targetType}
              name={record.targetName}
              meta={[record.targetMeta, record.targetArea, record.visitDate].filter(Boolean).join(' · ')}
              photoUrl={record.targetPhotoUrl}
              satisfaction={record.satisfaction}
              axisX={record.axisX}
              axisY={record.axisY}
              status={record.status}
              sources={[
                {
                  type: 'me',
                  label: '나',
                  detail: `${record.satisfaction ?? '-'} · ${record.visitDate ?? ''}`,
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

        {isNudgeVisible && nudge && (
          <div className="pt-2">
            <NudgeStrip
              nudge={nudge}
              isDismissing={isNudgeDismissing}
              onAction={handleNudgeAction}
              onDismiss={handleNudgeDismiss}
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
          isMapOpen={isMapOpen}
          onFilterToggle={handleFilterToggle}
          isFilterOpen={isFilterOpen}
          onSortToggle={toggleSort}
          isSortOpen={isSortOpen}
          onSearchToggle={() => router.push('/discover')}
          isSearchOpen={isSearchOpen}
          searchQuery={searchQuery}
          onSearchQueryChange={setSearchQuery}
          onSearchClear={() => setSearchQuery('')}
        />

        {/* 필터/소팅/검색 패널 — 캘린더/팔로잉 모드에서는 숨김 */}
        {!isCalendarMode && isFilterOpen && (
          <div className="px-4 pt-2 md:px-8">
            <FilterSystem
              rules={filterRules}
              conjunction={conjunction}
              attributes={filterAttributes}
              onRulesChange={handleRulesChange}
              onConjunctionChange={setConjunction}
              chipName={chipName}
              onChipNameChange={setChipName}
              onSaveAsChip={(name) => {
                if (name) {
                  handleSaveChip(name)
                  setChipName('')
                }
              }}
              activeChipId={activeChipId}
              onDeleteChip={(chipId) => {
                deleteFilter(chipId)
                setActiveChipId(null)
                setFilterRules([])
                setChipName('')
              }}
              accentColor={accentColor}
              onClose={handleFilterToggle}
            />
          </div>
        )}

        {!isCalendarMode && isSortOpen && (
          <div className="relative">
            <SortDropdown
              currentSort={currentSort}
              onSortChange={handleSortChange}
              accentType={accentType}
            />
          </div>
        )}


        {/* 저장 필터 칩 — 캘린더/팔로잉 모드에서는 숨김 */}
        {!isCalendarMode && (
          <SavedFilterChips
            chips={filters}
            activeChipId={activeChipId}
            counts={counts}
            accentClass={accentType}
            onChipSelect={handleChipSelect}
            recordPage={currentRecordPage}
            recordTotalPages={totalRecordPages}
            onRecordPagePrev={() => setCurrentRecordPage((p) => Math.max(1, p - 1))}
            onRecordPageNext={() => setCurrentRecordPage((p) => Math.min(totalRecordPages, p + 1))}
          />
        )}
        </div>

        {/* 팔로잉 피드 */}
        {isFollowingMode && (
          <FollowingFeed
            items={followingFeed.items}
            isLoading={followingFeed.isLoading}
            onItemPress={(recordId) => router.push(`/records/${recordId}`)}
            sourceFilter={followingFeed.sourceFilter}
            onSourceFilterChange={followingFeed.setSourceFilter}
          />
        )}

        {/* 통계 패널 — 캘린더/지도/팔로잉 모드에서는 숨김 */}
        {!isCalendarMode && !isFollowingMode && !(isMapOpen && activeTab === 'restaurant') && canShowStats && (
          <div className="px-4 pt-2 md:px-8">
            <StatsToggle
              isOpen={isStatsOpen}
              onToggle={() => setIsStatsOpen(!isStatsOpen)}
              label="통계"
            />

            {isStatsOpen && (
              <div className="mt-3 flex flex-col gap-5">
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
            )}
          </div>
        )}

        {/* 추천 카드 */}
        {!isCalendarMode && !isFollowingMode && !(isMapOpen && activeTab === 'restaurant') && recommendationCards.length > 0 && (
          <div className="px-4 pb-2 pt-3 md:px-8">
            <p className="mb-2 text-[13px] font-semibold" style={{ color: 'var(--text)' }}>추천</p>
            <div className="flex gap-3 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
              {recommendationCards.map((card) => (
                <RecommendationCard key={card.id} card={card} />
              ))}
            </div>
          </div>
        )}

        {/* 뷰 모드별 콘텐츠 — 팔로잉 모드에서는 숨김 */}
        {!isFollowingMode && renderContent()}
      </div>

      <FabAdd currentTab={activeTab} onClick={() => router.push(`/add?type=${activeTab}`)} />

    </div>
  )
}
