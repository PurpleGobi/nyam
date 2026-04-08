'use client'

import { useState, useMemo, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { UtensilsCrossed, Wine, Users } from 'lucide-react'
import type { FilterRule, SortOption } from '@/domain/entities/saved-filter'
import type { RecordWithTarget, RecordSource } from '@/domain/entities/record'
import type { HomeTarget } from '@/domain/entities/home-target'
import type { HomeViewType } from '@/domain/repositories/home-repository'
import type { ScoreSource } from '@/domain/entities/score'
import { haversineDistance } from '@/domain/services/distance'
import type { FilterChipItem, AdvancedFilterChip } from '@/domain/entities/condition-chip'
import { chipsToFilterRules, isAdvancedChip } from '@/domain/entities/condition-chip'
import { RESTAURANT_FILTER_ATTRIBUTES, WINE_FILTER_ATTRIBUTES, HOME_BUBBLE_FILTER_ATTRIBUTES } from '@/domain/entities/filter-config'
import { matchesAllRules } from '@/domain/services/filter-matcher'
import { useAuth } from '@/presentation/providers/auth-provider'
import { useHomeTargets } from '@/application/hooks/use-home-targets'
import { useHomeState } from '@/application/hooks/use-home-state'
import { useCalendarRecords } from '@/application/hooks/use-calendar-records'
import { useRestaurantStats } from '@/application/hooks/use-restaurant-stats'
import { useWineStats } from '@/application/hooks/use-wine-stats'
import { useAiGreeting } from '@/application/hooks/use-ai-greeting'
import { useSettings } from '@/application/hooks/use-settings'
import { usePersistedFilterState } from '@/application/hooks/use-persisted-filter-state'
import { useFeedScores } from '@/application/hooks/use-feed-scores'
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
import type { BubbleSortOption } from '@/domain/entities/saved-filter'
import { useBubbleList } from '@/application/hooks/use-bubble-list'
import { useBubbleExpertise } from '@/application/hooks/use-bubble-expertise'
import { useBubbleDiscover } from '@/application/hooks/use-bubble-discover'
import { BubbleCard } from '@/presentation/components/bubble/bubble-card'
import { useFollowingFeed } from '@/application/hooks/use-following-feed'
import { useUserCoords } from '@/application/hooks/use-user-coords'
import { useSocialFilterOptions } from '@/application/hooks/use-social-filter-options'
import type { SocialFilterState } from '@/presentation/components/home/condition-filter-bar'

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
  if (!source || source === 'bookmark') return undefined
  const map: Record<string, ScoreSource> = {
    mine: 'mine',
    bubble: 'bubble',
    // 'following'과 'public'은 ScoreSource에서 제거됨 → undefined 반환 (매핑 없음)
  }
  return map[source]
}

function sortHomeTargets(
  targets: HomeTarget[],
  sort: SortOption,
  userCoords?: { lat: number; lng: number } | null,
): HomeTarget[] {
  const sorted = [...targets]
  switch (sort) {
    case 'latest':
      return sorted.sort((a, b) => {
        const dateA = a.latestVisitDate ?? ''
        const dateB = b.latestVisitDate ?? ''
        if (dateA !== dateB) return dateB.localeCompare(dateA)
        return (b.latestCreatedAt ?? '').localeCompare(a.latestCreatedAt ?? '')
      })
    case 'score_high':
      return sorted.sort((a, b) => (b.satisfaction ?? 0) - (a.satisfaction ?? 0))
    case 'score_low':
      return sorted.sort((a, b) => (a.satisfaction ?? 0) - (b.satisfaction ?? 0))
    case 'name':
      return sorted.sort((a, b) => a.name.localeCompare(b.name))
    case 'visit_count':
      return sorted.sort((a, b) => b.visitCount - a.visitCount)
    case 'distance': {
      if (!userCoords) return sorted
      return sorted.sort((a, b) => {
        const distA = a.lat != null && a.lng != null
          ? haversineDistance(userCoords.lat, userCoords.lng, a.lat, a.lng)
          : Infinity
        const distB = b.lat != null && b.lng != null
          ? haversineDistance(userCoords.lat, userCoords.lng, b.lat, b.lng)
          : Infinity
        return distA - distB
      })
    }
  }
}

/** 와인탭 소팅 옵션 (거리순 미포함) */
const WINE_SORT_LABELS: Partial<Record<SortOption, string>> = {
  latest: '최신순',
  score_high: '점수 높은순',
  score_low: '점수 낮은순',
  name: '이름순',
  visit_count: '방문 많은순',
}

/** 버블탭 소팅 옵션 */
const HOME_BUBBLE_SORT_LABELS: Record<BubbleSortOption, string> = {
  activity: '최근 활동순',
  members: '멤버 많은순',
  records: '기록 많은순',
  name: '이름순',
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
  const [renderTimestamp] = useState(() => Date.now())
  const { bubbles: myBubbles, isLoading: bubblesLoading } = useBubbleList(user?.id ?? null)

  // ── 버블 전문성 ──
  const bubbleIds = useMemo(() => myBubbles.map((b) => b.id), [myBubbles])
  const { expertiseMap } = useBubbleExpertise(bubbleIds)

  // ── 버블 탭 소팅 ──
  const [bubbleSort, setBubbleSort] = useState<BubbleSortOption>('activity')

  // ── 버블 탭 필터 칩 ──
  const [bubbleConditionChips, setBubbleConditionChips] = useState<FilterChipItem[]>([])

  // ── 공개 버블 탐색 (membership=public 필터 시) ──
  const bubbleMembershipChip = bubbleConditionChips.find(
    (c) => !isAdvancedChip(c) && (c as { attribute: string }).attribute === 'membership',
  )
  const isPublicBubbleMode = bubbleMembershipChip
    ? String((bubbleMembershipChip as { value: string }).value) === 'public'
    : false
  const userAreas = useMemo(
    () => [...new Set(myBubbles.map((b) => b.area).filter(Boolean))] as string[],
    [myBubbles],
  )
  const excludeBubbleIds = useMemo(() => myBubbles.map((b) => b.id), [myBubbles])
  const { recommended: publicBubbles, isLoading: publicBubblesLoading } = useBubbleDiscover(
    userAreas,
    excludeBubbleIds,
    isPublicBubbleMode,
  )

  // ── 버블 필터 속성에 전문 분야 동적 옵션 주입 ──
  const bubbleFilterAttributes = useMemo(() => {
    const allExpertise = [...expertiseMap.values()].flat()
    const buildOptions = (axisType: string) => {
      const unique = [...new Set(allExpertise.filter((e) => e.axisType === axisType).map((e) => e.axisValue))]
      return unique.sort().map((v) => ({ value: v, label: v }))
    }
    return HOME_BUBBLE_FILTER_ATTRIBUTES.map((attr) => {
      if (attr.key === 'expertise_area') return { ...attr, options: buildOptions('area') }
      if (attr.key === 'expertise_genre') return { ...attr, options: buildOptions('genre') }
      if (attr.key === 'expertise_wine_region') return { ...attr, options: buildOptions('wine_region') }
      if (attr.key === 'expertise_wine_variety') return { ...attr, options: buildOptions('wine_variety') }
      return attr
    }).filter((attr) => !attr.key.startsWith('expertise_') || (attr.options && attr.options.length > 0))
  }, [expertiseMap])

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

  // 거리순 소팅 시에만 위치 좌표 요청
  const userCoords = useUserCoords(currentSort === 'distance' || activeTab === 'restaurant')

  // ── 소셜 필터 상태 ──
  const [socialFilter, setSocialFilter] = useState<SocialFilterState>({ followingUserId: null, bubbleId: null })
  const socialFilterOptions = useSocialFilterOptions(user?.id ?? null)

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

  // 탭 전환 시 아직 로드 안 된 탭이면 칩 초기화 + 소셜 필터 초기화
  if (prevTab !== activeTab) {
    setPrevTab(activeTab)
    setSocialFilter({ followingUserId: null, bubbleId: null })
    if (!initializedTabs.has(activeTab)) {
      setConditionChips([])
    }
  }

  // 소셜 필터 변경 콜백
  const handleSocialFilterChange = useCallback((filter: SocialFilterState) => {
    setSocialFilter(filter)
  }, [])

  // 칩 변경 → filterRules 동기화 + 저장 + 소셜 필터 정합성
  const handleChipsChange = useCallback((chips: FilterChipItem[]) => {
    setConditionChips(chips)
    const rules = chipsToFilterRules(chips)
    setFilterRules(rules)
    saveState(activeTab, chips)

    // 보기 필터에서 following/bubble 해제 시 소셜 필터도 초기화
    const viewChip = chips.find((c) => !isAdvancedChip(c) && (c as { attribute: string }).attribute === 'view')
    if (viewChip) {
      const views = String((viewChip as { value: string }).value).split(',').map((v) => v.trim())
      setSocialFilter((prev) => ({
        followingUserId: views.includes('following') ? prev.followingUserId : null,
        bubbleId: views.includes('bubble') ? prev.bubbleId : null,
      }))
    } else {
      // view 칩이 없으면 (전체 보기) 소셜 필터 유지
    }
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
  const viewTypes: HomeViewType[] = useMemo(() => {
    const views: HomeViewType[] = []
    for (const chip of conditionChips) {
      if (isAdvancedChip(chip)) continue
      if (chip.attribute !== 'view') continue
      const vals = String(chip.value).split(',')
      for (const v of vals) {
        const trimmed = v.trim()
        if (trimmed === 'visited' || trimmed === 'tasted' || trimmed === 'bookmark' || trimmed === 'cellar' || trimmed === 'unrated' || trimmed === 'bubble' || trimmed === 'following' || trimmed === 'public') {
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

  // ── useHomeTargets: view 기반 서버 데이터 페칭 ──
  const {
    targets,
  } = useHomeTargets({
    userId: user?.id ?? null,
    tab: activeTab,
    viewTypes,
    socialFilter: (socialFilter.followingUserId || socialFilter.bubbleId) ? socialFilter : undefined,
  })

  const restaurantStats = useRestaurantStats(user?.id ?? null)
  const wineStats = useWineStats(user?.id ?? null)

  // AI 인사말 — targets 기반
  const recentRecordsForGreeting = useMemo(() => {
    return targets
      .filter((t) => t.targetType === 'restaurant' && t.latestVisitDate)
      .slice(0, 5)
      .map((t) => ({
        restaurantName: t.name,
        restaurantId: t.targetId,
        satisfaction: t.satisfaction ?? 0,
        visitDate: t.latestVisitDate ?? '',
        area: t.district ?? '',
        scene: t.latestScene ?? null,
      }))
  }, [targets])

  const weeklyRecordCount = useMemo(() => {
    const oneWeekAgo = new Date()
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)
    const cutoff = oneWeekAgo.toISOString().slice(0, 10)
    return targets.reduce((count, t) =>
      count + t.records.filter((r) => (r.visitDate ?? r.createdAt) >= cutoff).length,
    0)
  }, [targets])

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
    targetType: activeTab === 'bubble' ? 'restaurant' : activeTab,
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

  const recordTab = activeTab === 'bubble' ? 'restaurant' : activeTab
  const accentType = recordTab === 'restaurant' ? 'food' as const : 'wine' as const
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

  // 필터/검색 적용 (타겟 기반, 그룹화 불필요)
  const filteredTargets = useMemo(() => {
    let result = targets
    if (nonViewFilterRules.length > 0) {
      result = result.filter((t) =>
        matchesAllRules(t as unknown as Record<string, unknown>, nonViewFilterRules, conjunction),
      )
    }
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase()
      result = result.filter((t) =>
        t.name.toLowerCase().includes(q)
        || (t.genre ?? '').toLowerCase().includes(q)
        || (t.district ?? '').toLowerCase().includes(q)
        || (t.variety ?? '').toLowerCase().includes(q)
        || (t.region ?? '').toLowerCase().includes(q),
      )
    }
    return result
  }, [targets, nonViewFilterRules, conjunction, searchQuery])

  // 소팅
  const allSortedTargets = useMemo(() => {
    return sortHomeTargets(filteredTargets, currentSort, userCoords)
  }, [filteredTargets, currentSort, userCoords])

  // 페이지네이션: 카드 5개, 리스트/지도 10개
  const pageSize = viewMode === 'list' || viewMode === 'map' ? 10 : 5
  const [currentRecordPage, setCurrentRecordPage] = useState(1)
  const totalRecordPages = Math.max(1, Math.ceil(allSortedTargets.length / pageSize))
  const displayTargets = allSortedTargets.slice(
    (currentRecordPage - 1) * pageSize,
    currentRecordPage * pageSize,
  )

  // ── CF 기반 Nyam 점수: 미방문 아이템에 예측 점수 표시 ──
  // 전체 필터링된 대상에서 1회 배치 조회 (페이지 변경 시 재요청 방지)
  const feedCategory = activeTab === 'wine' ? 'wine' as const : 'restaurant' as const
  const allUnvisitedIds = useMemo(() =>
    filteredTargets
      .filter((t) => t.visitCount === 0 && t.satisfaction === null)
      .map((t) => t.targetId)
      .slice(0, 50),
    [filteredTargets],
  )
  const { scores: feedScores } = useFeedScores(allUnvisitedIds, feedCategory, user?.id ?? null)

  // 필터/탭/뷰모드 변경 시 페이지 리셋 (useEffect 대신 렌더 중 비교)
  const pageResetKey = `${activeTab}-${filterRules.length}-${currentSort}-${searchQuery}-${conditionChips.length}-${viewMode}`
  const [prevPageResetKey, setPrevPageResetKey] = useState(pageResetKey)
  if (prevPageResetKey !== pageResetKey) {
    setPrevPageResetKey(pageResetKey)
    setCurrentRecordPage(1)
  }

  // [FIX #1] targets에서 RecordWithTarget 호환 배열 생성 (캘린더용)
  const visitedRecords: RecordWithTarget[] = useMemo(() => {
    return targets
      .filter((t) => t.sources.includes('mine') || t.sources.includes('following'))
      .flatMap((t) =>
        t.records.map((r) => ({
          ...r,
          targetName: t.name,
          targetMeta: t.genre ?? t.variety ?? null,
          targetArea: t.district ?? t.area?.[0] ?? t.region ?? null,
          targetPhotoUrl: t.photoUrl,
          targetLat: t.lat,
          targetLng: t.lng,
          source: (t.scoreSource ?? 'mine') as RecordSource,
          genre: t.genre,
          district: t.district,
          area: t.area,
          country: t.country,
          variety: t.variety,
          region: t.region,
          wineType: t.wineType,
          vintage: t.vintage,
          priceRange: t.priceRange,
          michelinStars: t.michelinStars,
          hasBlueRibbon: t.hasBlueRibbon,
          mediaAppearances: t.mediaAppearances,
        } satisfies RecordWithTarget)),
      )
  }, [targets])

  const { days: calendarDays } = useCalendarRecords({
    records: visitedRecords,
    year: calYear,
    month: calMonth,
  })

  // 캘린더 선택 날짜의 상세 기록
  const allSortedVisitedRecords = useMemo(() =>
    [...visitedRecords].sort((a, b) =>
      (b.visitDate ?? b.createdAt).localeCompare(a.visitDate ?? a.createdAt),
    ),
    [visitedRecords],
  )

  const selectedDayRecords = useMemo(() => {
    if (!selectedDate) return []
    return allSortedVisitedRecords.filter((r) => r.visitDate?.startsWith(selectedDate))
  }, [allSortedVisitedRecords, selectedDate])

  const selectedDateLabel = useMemo(() => {
    if (!selectedDate) return ''
    const d = new Date(selectedDate)
    const weekdays = ['일', '월', '화', '수', '목', '금', '토']
    return `${d.getMonth() + 1}월 ${d.getDate()}일 (${weekdays[d.getDay()]})`
  }, [selectedDate])

  // 맵 레코드 (식당 전용 — 타겟 기반으로 중복 마커 제거)
  const mapRecords: MapRecord[] = useMemo(() => {
    if (activeTab !== 'restaurant') return []
    return displayTargets.map((t) => ({
      restaurantId: t.targetId,
      name: t.name,
      genre: t.genre ?? '',
      area: t.district ?? t.area?.[0] ?? '',
      lat: t.lat ?? 0,
      lng: t.lng ?? 0,
      score: t.satisfaction,
      distanceKm: null,
      photoUrl: t.photoUrl,
    }))
  }, [displayTargets, activeTab])

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
            accentType={recordTab}
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
              accentType={recordTab}
            />
          )}
        </div>
      )
    }

    // 리스트(list) 뷰
    if (viewMode === 'list') {
      if (displayTargets.length === 0) return renderEmptyState()
      return (
        <div className="content-detail px-4 pb-24 md:px-8">
          {displayTargets.map((target, i) => (
            <CompactListItem
              key={target.targetId}
              rank={i + 1}
              photoUrl={target.photoUrl}
              name={target.name}
              meta={[target.genre ?? target.variety, target.latestVisitDate].filter(Boolean).join(' · ')}
              score={target.satisfaction}
              axisX={target.axisX}
              axisY={target.axisY}
              accentType={recordTab}
              visitCount={target.visitCount}
              scoreSource={mapRecordSourceToScoreSource(target.scoreSource ?? undefined)}
              onClick={() =>
                router.push(
                  `/${target.targetType === 'restaurant' ? 'restaurants' : 'wines'}/${target.targetId}`,
                )
              }
            />
          ))}
          </div>
      )
    }

    // 카드(card) 뷰 — 기본
    if (displayTargets.length === 0) return renderEmptyState()
    return (
      <div className="flex flex-col gap-3 px-4 pb-24 pt-2 md:grid md:grid-cols-2 md:gap-4 md:px-8">
        {displayTargets.map((target) => {
          // [FIX #6] status 분기: 식당 vs 와인
          const status: 'visited' | 'bookmark' | 'cellar' | 'tasted' = activeTab === 'wine'
            ? (target.isCellar ? 'cellar' : (target.visitCount > 0 ? 'tasted' : 'bookmark'))
            : (target.visitCount > 0 ? 'visited' : 'bookmark')

          return activeTab === 'wine' ? (
            <WineCard
              key={target.targetId}
              id={target.latestRecordId ?? target.targetId}
              wine={{
                id: target.targetId,
                name: target.name,
                wineType: target.wineType ?? '',
                vintage: target.vintage ?? null,
                country: target.country ?? null,
                variety: target.variety ?? null,
                region: target.region ?? null,
                photoUrl: target.photoUrl,
              }}
              myRecord={{
                satisfaction: target.satisfaction,
                axisX: target.axisX,
                axisY: target.axisY,
                visitDate: target.latestVisitDate,
                purchasePrice: target.records[0]?.purchasePrice ?? null,
              }}
              latestDate={target.latestVisitDate}
              visitCount={target.visitCount}
              scoreSource={mapRecordSourceToScoreSource(target.scoreSource ?? undefined)}
            />
          ) : (
            <RecordCard
              key={target.targetId}
              id={target.latestRecordId ?? target.targetId}
              targetId={target.targetId}
              targetType={target.targetType}
              name={target.name}
              meta={[target.genre, target.district ?? target.area?.[0]].filter(Boolean).join(' · ')}
              photoUrl={target.photoUrl}
              satisfaction={target.satisfaction ?? feedScores.get(target.targetId)?.satisfaction ?? null}
              axisX={target.axisX}
              axisY={target.axisY}
              status={status}
              visitCount={target.visitCount}
              scoreSource={target.satisfaction !== null
                ? mapRecordSourceToScoreSource(target.scoreSource ?? undefined)
                : feedScores.has(target.targetId) ? 'nyam' : mapRecordSourceToScoreSource(target.scoreSource ?? undefined)}
              latestDate={target.latestVisitDate}
              distanceKm={userCoords && target.lat != null && target.lng != null
                ? haversineDistance(userCoords.lat, userCoords.lng, target.lat, target.lng)
                : null}
            />
          )
        })}
      </div>
    )
  }

  const isCalendarMode = viewMode === 'calendar'
  const isBubbleTab = activeTab === 'bubble'

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
          onSearchToggle={toggleSearch}
          isSearchOpen={isSearchOpen}
          searchQuery={searchQuery}
          onSearchQueryChange={setSearchQuery}
          onSearchClear={() => setSearchQuery('')}
          onStatsToggle={() => setIsStatsOpen(!isStatsOpen)}
          isStatsOpen={isStatsOpen}
          canShowStats={canShowStats && !isFollowingMode}
          accentType={accentType}
        />

        {/* 소팅 드롭다운 — 버블 탭 포함 */}
        {!isCalendarMode && isSortOpen && (
          isBubbleTab ? (
            <div className="relative">
              <SortDropdown<BubbleSortOption>
                currentSort={bubbleSort}
                onSortChange={(s) => { setBubbleSort(s); toggleSort() }}
                accentType="social"
                labels={HOME_BUBBLE_SORT_LABELS}
              />
            </div>
          ) : (
            <div className="relative">
              <SortDropdown
                currentSort={currentSort}
                onSortChange={handleSortChange}
                accentType={accentType}
                labels={activeTab === 'wine' ? WINE_SORT_LABELS : undefined}
              />
            </div>
          )
        )}

        {/* 조건 필터 칩 바 — 캘린더 모드에서만 숨김 */}
        {!isCalendarMode && (
          isBubbleTab ? (
            <ConditionFilterBar
              chips={bubbleConditionChips}
              onChipsChange={setBubbleConditionChips}
              attributes={bubbleFilterAttributes}
              accentType="social"
            />
          ) : (
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
              socialFollowingUsers={socialFilterOptions.followingUsers.map((u) => ({
                id: u.id,
                label: u.nickname,
                iconUrl: u.avatarUrl,
              }))}
              socialBubbles={socialFilterOptions.myBubbles.map((b) => ({
                id: b.id,
                label: b.name,
                iconName: b.icon,
                iconBgColor: b.iconBgColor,
              }))}
              socialFilter={socialFilter}
              onSocialFilterChange={handleSocialFilterChange}
            />
          )
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

        {/* 버블 탭 콘텐츠 */}
        {isBubbleTab && (() => {
          // 공개 모드 vs 내 버블
          const baseBubbles = isPublicBubbleMode ? publicBubbles : myBubbles
          const loading = isPublicBubbleMode ? publicBubblesLoading : bubblesLoading

          // 칩 필터 적용
          let filtered = baseBubbles
          for (const chip of bubbleConditionChips) {
            if (isAdvancedChip(chip)) continue
            const simpleChip = chip as { attribute: string; value: string }
            if (simpleChip.attribute === 'membership') continue // 소스 전환용이므로 스킵
            if (simpleChip.attribute === 'focus_type' && simpleChip.value !== 'all') {
              filtered = filtered.filter((b) => b.focusType === simpleChip.value)
            }
            if (simpleChip.attribute === 'role') {
              filtered = filtered.filter((b) =>
                simpleChip.value === 'owner' ? b.createdBy === user?.id : b.createdBy !== user?.id,
              )
            }
            if (simpleChip.attribute === 'member_count') {
              const min = Number(simpleChip.value)
              filtered = filtered.filter((b) => b.memberCount >= min)
            }
            if (simpleChip.attribute === 'activity') {
              const now = renderTimestamp
              const thresholds: Record<string, number> = { '1d': 86400000, '1w': 604800000, '1m': 2592000000 }
              const ms = thresholds[simpleChip.value]
              if (ms) {
                filtered = filtered.filter((b) =>
                  b.lastActivityAt ? now - new Date(b.lastActivityAt).getTime() < ms : false,
                )
              }
            }
            // 전문 분야 필터: 해당 축에서 expertise가 있는 버블만
            if (simpleChip.attribute.startsWith('expertise_')) {
              const axisType = simpleChip.attribute.replace('expertise_', '')
              filtered = filtered.filter((b) => {
                const exp = expertiseMap.get(b.id) ?? []
                return exp.some((e) => e.axisType === axisType && e.axisValue === simpleChip.value)
              })
            }
          }

          // 검색
          if (searchQuery.trim()) {
            const q = searchQuery.trim().toLowerCase()
            filtered = filtered.filter((b) =>
              b.name.toLowerCase().includes(q)
              || (b.description ?? '').toLowerCase().includes(q)
              || (b.area ?? '').toLowerCase().includes(q),
            )
          }

          // 소팅
          const sorted = [...filtered]
          switch (bubbleSort) {
            case 'activity':
              sorted.sort((a, b) => (b.lastActivityAt ?? '').localeCompare(a.lastActivityAt ?? ''))
              break
            case 'members':
              sorted.sort((a, b) => b.memberCount - a.memberCount)
              break
            case 'records':
              sorted.sort((a, b) => b.recordCount - a.recordCount)
              break
            case 'name':
              sorted.sort((a, b) => a.name.localeCompare(b.name))
              break
          }

          if (loading) {
            return (
              <div className="flex items-center justify-center py-12">
                <div className="h-6 w-6 animate-spin rounded-full border-[3px] border-[var(--accent-social)] border-t-transparent" />
              </div>
            )
          }

          if (sorted.length === 0) {
            return (
              <div className="flex flex-1 flex-col items-center justify-center px-4 py-16">
                <div
                  className="flex h-[72px] w-[72px] items-center justify-center rounded-3xl"
                  style={{ backgroundColor: 'var(--accent-social-light)' }}
                >
                  <Users size={32} style={{ color: 'var(--accent-social)' }} />
                </div>
                <p className="mt-4 text-[15px] font-semibold" style={{ color: 'var(--text)' }}>
                  {isPublicBubbleMode ? '공개 버블이 없어요' : '아직 버블이 없어요'}
                </p>
                <p className="mt-1 text-center text-[13px]" style={{ color: 'var(--text-hint)' }}>
                  {isPublicBubbleMode ? '조건을 변경해 보세요' : '버블을 만들어 맛집을 공유해보세요'}
                </p>
                {!isPublicBubbleMode && (
                  <button
                    type="button"
                    onClick={() => router.push('/bubbles/create')}
                    className="mt-4 rounded-full px-5 py-2.5 text-[13px] font-bold text-white transition-transform active:scale-95"
                    style={{ backgroundColor: 'var(--accent-social)' }}
                  >
                    첫 버블 만들기
                  </button>
                )}
              </div>
            )
          }

          return (
            <div className="flex flex-col gap-3 px-4 pb-4 pt-2 md:grid md:grid-cols-2 md:gap-4 md:px-8">
              {sorted.map((b) => {
                const bubbleExpertise = expertiseMap.get(b.id)
                const top3 = bubbleExpertise
                  ? [...bubbleExpertise].sort((a, c) => c.avgLevel - a.avgLevel).slice(0, 3).map((e) => ({ axisValue: e.axisValue, avgLevel: e.avgLevel }))
                  : undefined

                return (
                  <BubbleCard
                    key={b.id}
                    bubble={b}
                    role={b.createdBy === user?.id ? 'mine' : 'joined'}
                    isRecentlyActive={b.lastActivityAt ? renderTimestamp - new Date(b.lastActivityAt).getTime() < 86400000 : false}
                    expertise={top3}
                    onClick={() => router.push(`/bubbles/${b.id}`)}
                  />
                )
              })}
            </div>
          )
        })()}

        {/* 팔로잉 피드 */}
        {!isBubbleTab && isFollowingMode && (
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

        {/* 통계 패널 — 아이콘으로 토글 (버블/지도/팔로잉 모드에서는 숨김) */}
        {!isBubbleTab && isStatsOpen && !isFollowingMode && canShowStats && (
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

        {/* 뷰 모드별 콘텐츠 — 버블/팔로잉 모드에서는 숨김 */}
        {!isBubbleTab && !isFollowingMode && renderContent()}
      </div>

      <FabAdd
        variant={isBubbleTab ? 'social' : activeTab === 'wine' ? 'wine' : 'food'}
        onClick={() => isBubbleTab ? router.push('/bubbles/create') : router.push(`/add?type=${activeTab}`)}
      />

    </div>
  )
}
