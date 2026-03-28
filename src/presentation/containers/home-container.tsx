'use client'

import { useState, useMemo, useCallback } from 'react'
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
import { NotionFilterPanel } from '@/presentation/components/home/notion-filter-panel'
import { SortDropdown } from '@/presentation/components/home/sort-dropdown'
import { SearchDropdown } from '@/presentation/components/home/search-dropdown'
import { FilterChipSaveModal } from '@/presentation/components/home/filter-chip-save-modal'
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

function sortRecords(records: DiningRecord[], sort: SortOption): DiningRecord[] {
  const sorted = [...records]
  switch (sort) {
    case 'latest':
      return sorted.sort((a, b) => (b.visitDate ?? b.createdAt).localeCompare(a.visitDate ?? a.createdAt))
    case 'score_high':
      return sorted.sort((a, b) => (b.satisfaction ?? 0) - (a.satisfaction ?? 0))
    case 'score_low':
      return sorted.sort((a, b) => (a.satisfaction ?? 0) - (b.satisfaction ?? 0))
    case 'name':
      return sorted.sort((a, b) => a.targetId.localeCompare(b.targetId))
    case 'visit_count':
      return sorted.sort((a, b) => (b.visitDate ?? b.createdAt).localeCompare(a.visitDate ?? a.createdAt))
  }
}

function searchRecords(records: DiningRecord[], query: string): DiningRecord[] {
  if (!query.trim()) return records
  const q = query.trim().toLowerCase()
  return records.filter((r) => r.targetId.toLowerCase().includes(q))
}

function applyFilterRules(records: DiningRecord[], rules: FilterRule[], conjunction: 'and' | 'or'): DiningRecord[] {
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
  } = useHomeState()

  const recordTab = activeTab === 'following' ? 'restaurant' : activeTab
  const { filters, createFilter } = useSavedFilters(user?.id ?? null, recordTab)
  const { records } = useRecords(user?.id ?? null, recordTab)

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
        restaurantName: r.targetId,
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
  } = useNudge({ userId: user?.id ?? null, hasUnratedRecords })

  // 추천 카드
  const { cards: recommendationCards } = useRecommendations(user?.id ?? null, records.length)

  // 팔로잉 피드
  const { items: followingItems, isLoading: isFollowingLoading } = useFollowingFeed(
    activeTab === 'following' ? (user?.id ?? null) : null,
  )

  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false)
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
    setActiveChipId(chipId)
    if (chipId) {
      const chip = filters.find((f) => f.id === chipId)
      if (chip) {
        setFilterRules(chip.rules)
        if (chip.sortBy) setCurrentSort(chip.sortBy)
      }
    } else {
      setFilterRules([])
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
  const displayRecords = useMemo(() => {
    let result = records
    result = applyFilterRules(result, filterRules, conjunction)
    result = searchRecords(result, searchQuery)
    result = sortRecords(result, currentSort)
    return result
  }, [records, filterRules, conjunction, searchQuery, currentSort])

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
      name: r.targetId,
      genre: '',
      area: '',
      lat: 0,
      lng: 0,
      score: r.satisfaction,
      distanceKm: null,
    }))
  }, [displayRecords, activeTab])

  // 빈 상태
  const renderEmptyState = () => (
    <div className="flex flex-col items-center py-16">
      {activeTab === 'restaurant' ? (
        <UtensilsCrossed size={48} style={{ color: 'var(--text-hint)' }} />
      ) : (
        <Wine size={48} style={{ color: 'var(--text-hint)' }} />
      )}
      <p className="mt-4 text-[15px] font-semibold text-[var(--text)]">
        {activeTab === 'restaurant' ? '첫 식당을 기록해보세요' : '첫 와인을 기록해보세요'}
      </p>
      <p className="mt-1 text-[13px] text-[var(--text-hint)]">
        +버튼을 눌러 시작하세요
      </p>
    </div>
  )

  // 뷰 모드별 콘텐츠
  const renderContent = () => {
    // 팔로잉 피드
    if (activeTab === 'following') {
      return (
        <FollowingFeed
          items={followingItems}
          isLoading={isFollowingLoading}
          onItemPress={(recordId) => router.push(`/records/${recordId}`)}
        />
      )
    }

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
                name: r.targetId,
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

    // 리스트(compact) 뷰
    if (viewMode === 'compact') {
      if (displayRecords.length === 0) return renderEmptyState()
      return (
        <div className="pb-24">
          {displayRecords.map((record, i) => (
            <CompactListItem
              key={record.id}
              rank={i + 1}
              thumbnailUrl={null}
              name={record.targetId}
              meta={record.visitDate ?? ''}
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

    // 카드(detailed) 뷰 — 기본
    if (displayRecords.length === 0) return renderEmptyState()
    return (
      <div className="flex flex-col gap-3 px-4 pb-24 pt-2">
        {displayRecords.map((record) =>
          activeTab === 'wine' ? (
            <WineCard
              key={record.id}
              id={record.id}
              wine={{
                id: record.targetId,
                name: record.targetId,
                wineType: '',
                variety: null,
                region: null,
                photoUrl: null,
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
              name={record.targetId}
              meta={record.visitDate ?? ''}
              photoUrl={null}
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
  const isFollowingMode = activeTab === 'following'

  return (
    <div className="flex min-h-dvh flex-col bg-[var(--bg)]">
      <AppHeader />

      <div className="flex flex-1 flex-col overflow-y-auto">
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

        <HomeTabs
          activeTab={activeTab}
          viewMode={viewMode}
          onTabChange={setActiveTab}
          onViewCycle={cycleViewMode}
          onMapToggle={toggleMap}
          isMapOpen={isMapOpen}
          onFilterToggle={toggleFilter}
          isFilterOpen={isFilterOpen}
          onSortToggle={toggleSort}
          isSortOpen={isSortOpen}
          onSearchToggle={toggleSearch}
          isSearchOpen={isSearchOpen}
        />

        {/* 필터/소팅/검색 패널 — 캘린더/팔로잉 모드에서는 숨김 */}
        {!isCalendarMode && !isFollowingMode && isFilterOpen && (
          <div className="pt-2">
            <NotionFilterPanel
              rules={filterRules}
              conjunction={conjunction}
              attributes={filterAttributes}
              onRulesChange={handleRulesChange}
              onConjunctionChange={setConjunction}
              onSaveAsChip={() => setIsSaveModalOpen(true)}
              accentColor={accentColor}
            />
          </div>
        )}

        {!isCalendarMode && !isFollowingMode && isSortOpen && (
          <div className="pt-2">
            <SortDropdown
              currentSort={currentSort}
              onSortChange={handleSortChange}
              accentType={accentType}
            />
          </div>
        )}

        {!isCalendarMode && !isFollowingMode && isSearchOpen && (
          <div className="pt-2">
            <SearchDropdown
              query={searchQuery}
              onQueryChange={setSearchQuery}
              onClear={() => setSearchQuery('')}
            />
          </div>
        )}

        {/* 저장 필터 칩 — 캘린더/팔로잉 모드에서는 숨김 */}
        {!isCalendarMode && !isFollowingMode && (
          <SavedFilterChips
            chips={filters}
            activeChipId={activeChipId}
            counts={counts}
            accentClass={accentType}
            onChipSelect={handleChipSelect}
          />
        )}

        {/* 통계 패널 — 캘린더/지도/팔로잉 모드에서는 숨김 */}
        {!isCalendarMode && !isFollowingMode && !(isMapOpen && activeTab === 'restaurant') && canShowStats && (
          <div className="px-4 pt-2">
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

                    {wineStats.wineTypeStats.length > 0 && (
                      <div>
                        <p className="mb-2 text-[13px] font-semibold" style={{ color: 'var(--text)' }}>와인 타입</p>
                        <WineTypeChart types={wineStats.wineTypeStats} />
                      </div>
                    )}

                    <PdLockOverlay minRecords={20} currentCount={wineStats.totalRecordCount}>
                      <MonthlyChart
                        months={wineStats.monthlyStats}
                        totalAmount={wineStats.totalSpending}
                        accentColor="var(--accent-wine)"
                        unit="병"
                      />
                    </PdLockOverlay>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* 추천 카드 */}
        {!isCalendarMode && !isFollowingMode && !(isMapOpen && activeTab === 'restaurant') && recommendationCards.length > 0 && (
          <div className="px-4 pb-2 pt-3">
            <p className="mb-2 text-[13px] font-semibold" style={{ color: 'var(--text)' }}>추천</p>
            <div className="flex gap-3 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
              {recommendationCards.map((card) => (
                <RecommendationCard key={card.id} card={card} />
              ))}
            </div>
          </div>
        )}

        {/* 뷰 모드별 콘텐츠 */}
        {renderContent()}
      </div>

      <FabAdd currentTab={activeTab === 'following' ? 'restaurant' : activeTab} onClick={() => router.push(`/add?type=${activeTab === 'following' ? 'restaurant' : activeTab}`)} />

      <FilterChipSaveModal
        isOpen={isSaveModalOpen}
        onClose={() => setIsSaveModalOpen(false)}
        onSave={handleSaveChip}
        accentColor={accentColor}
      />
    </div>
  )
}
