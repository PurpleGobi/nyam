'use client'

import { useState, useMemo, useCallback } from 'react'
import { UtensilsCrossed, Wine } from 'lucide-react'
import type { NudgeDisplay } from '@/domain/entities/nudge'
import type { FilterRule, SortOption } from '@/domain/entities/saved-filter'
import type { DiningRecord } from '@/domain/entities/record'
import { RESTAURANT_FILTER_ATTRIBUTES, WINE_FILTER_ATTRIBUTES } from '@/domain/entities/filter-config'
import { useAuth } from '@/presentation/providers/auth-provider'
import { useRecords } from '@/application/hooks/use-records'
import { useHomeState } from '@/application/hooks/use-home-state'
import { useSavedFilters } from '@/application/hooks/use-saved-filters'
import { useRestaurantStats } from '@/application/hooks/use-restaurant-stats'
import { useWineStats } from '@/application/hooks/use-wine-stats'
import { AppHeader } from '@/presentation/components/layout/app-header'
import { FabAdd } from '@/presentation/components/layout/fab-add'
import { AiGreeting } from '@/presentation/components/home/ai-greeting'
import { NudgeStrip } from '@/presentation/components/home/nudge-strip'
import { HomeTabs } from '@/presentation/components/home/home-tabs'
import { RecordCard } from '@/presentation/components/home/record-card'
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

function getTimeGreeting(): { message: string; restaurantId: string | null } {
  const hour = new Date().getHours()
  if (hour >= 6 && hour < 11) {
    return { message: '좋은 아침이에요! 오늘 점심 뭐 먹을지 고민 중이라면 — 기록을 참고해보세요.', restaurantId: null }
  }
  if (hour >= 11 && hour < 15) {
    return { message: '점심 메뉴 고민 중이세요? 이번 주 광화문 쪽을 자주 가셨네요 — 오늘은 새로운 데 어때요?', restaurantId: null }
  }
  if (hour >= 15 && hour < 21) {
    return { message: '오늘 저녁은 어떠세요? 이번 주 기록 3건 — 꾸준히 잘 하고 계세요.', restaurantId: null }
  }
  return { message: '늦은 밤이네요. 이번 주 기록 3건 — 꾸준히 잘 하고 계세요.', restaurantId: null }
}

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
  return records.filter((record) => {
    const results = rules.map((rule) => {
      const val = (record as unknown as Record<string, unknown>)[rule.attribute]
      switch (rule.operator) {
        case 'eq': return String(val) === String(rule.value)
        case 'neq': return String(val) !== String(rule.value)
        case 'contains': return String(val ?? '').toLowerCase().includes(String(rule.value).toLowerCase())
        case 'not_contains': return !String(val ?? '').toLowerCase().includes(String(rule.value).toLowerCase())
        case 'gte': return Number(val) >= Number(rule.value)
        case 'lt': return Number(val) < Number(rule.value)
        default: return true
      }
    })
    return conjunction === 'and' ? results.every(Boolean) : results.some(Boolean)
  })
}

export function HomeContainer() {
  const { user } = useAuth()
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

  const { filters, counts, createFilter } = useSavedFilters(user?.id ?? null, activeTab)
  const { records } = useRecords(user?.id ?? null, activeTab)

  const restaurantStats = useRestaurantStats(user?.id ?? null)
  const wineStats = useWineStats(user?.id ?? null)

  const [showGreeting, setShowGreeting] = useState(true)
  const [nudge, setNudge] = useState<NudgeDisplay | null>({
    type: 'photo',
    icon: '📷',
    title: '사진 감지',
    subtitle: '3/19 12:34',
    actionLabel: '기록',
    actionHref: '/record/new',
    targetId: null,
  })
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false)
  const [isStatsOpen, setIsStatsOpen] = useState(false)

  const greeting = useMemo(() => getTimeGreeting(), [])

  const filterAttributes = activeTab === 'restaurant'
    ? RESTAURANT_FILTER_ATTRIBUTES
    : WINE_FILTER_ATTRIBUTES

  const accentType = activeTab === 'restaurant' ? 'food' as const : 'wine' as const

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

  const displayRecords = useMemo(() => {
    let result = records
    result = applyFilterRules(result, filterRules, conjunction)
    result = searchRecords(result, searchQuery)
    result = sortRecords(result, currentSort)
    return result
  }, [records, filterRules, conjunction, searchQuery, currentSort])

  return (
    <div className="flex min-h-dvh flex-col bg-[var(--bg)]">
      <AppHeader />

      <div className="flex flex-1 flex-col overflow-y-auto">
        {showGreeting && (
          <div className="pt-2">
            <AiGreeting
              greeting={greeting}
              isDismissing={!showGreeting}
              onDismiss={() => setShowGreeting(false)}
            />
          </div>
        )}

        {nudge && (
          <div className="pt-2">
            <NudgeStrip
              nudge={nudge}
              isDismissing={false}
              onAction={() => {/* navigate to record */}}
              onDismiss={() => setNudge(null)}
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

        {isFilterOpen && (
          <div className="pt-2">
            <NotionFilterPanel
              rules={filterRules}
              conjunction={conjunction}
              attributes={filterAttributes}
              onRulesChange={handleRulesChange}
              onConjunctionChange={setConjunction}
              onSaveAsChip={() => setIsSaveModalOpen(true)}
            />
          </div>
        )}

        {isSortOpen && (
          <div className="pt-2">
            <SortDropdown
              currentSort={currentSort}
              onSortChange={handleSortChange}
              accentType={accentType}
            />
          </div>
        )}

        {isSearchOpen && (
          <div className="pt-2">
            <SearchDropdown
              query={searchQuery}
              onQueryChange={setSearchQuery}
              onClear={() => setSearchQuery('')}
            />
          </div>
        )}

        <SavedFilterChips
          chips={filters}
          activeChipId={activeChipId}
          counts={counts}
          accentClass={accentType}
          onChipSelect={handleChipSelect}
        />

        {/* 통계 패널 */}
        {canShowStats && (
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

        <div className="flex flex-col gap-3 px-4 pb-24 pt-2">
          {displayRecords.length === 0 ? (
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
          ) : (
            displayRecords.map((record) => (
              <RecordCard
                key={record.id}
                id={record.id}
                targetId={record.targetId}
                targetType={record.targetType}
                name={record.targetId}
                meta={record.visitDate ?? ''}
                photoUrl={null}
                satisfaction={record.satisfaction}
                axisX={null}
                axisY={null}
                status="rated"
                sources={[{ type: 'me', label: '나', detail: `${record.satisfaction ?? '-'} · ${record.visitDate ?? ''}` }]}
              />
            ))
          )}
        </div>
      </div>

      <FabAdd currentTab={activeTab} />

      <FilterChipSaveModal
        isOpen={isSaveModalOpen}
        onClose={() => setIsSaveModalOpen(false)}
        onSave={handleSaveChip}
      />
    </div>
  )
}
