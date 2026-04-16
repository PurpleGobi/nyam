'use client'

import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import dynamic from 'next/dynamic'
import { UtensilsCrossed, Wine } from 'lucide-react'
import type { FilterRule, SortOption } from '@/domain/entities/saved-filter'
import type { RecordWithTarget, RecordSource } from '@/domain/entities/record'
import type { HomeTarget } from '@/domain/entities/home-target'
import type { HomeViewType } from '@/domain/repositories/home-repository'
import type { ScoreSource } from '@/domain/entities/score'
import { haversineDistance } from '@/domain/services/distance'
import type { FilterChipItem } from '@/domain/entities/condition-chip'
import { chipsToFilterRules, isAdvancedChip, createDefaultViewChip, createBubbleViewChip } from '@/domain/entities/condition-chip'
import { RESTAURANT_FILTER_ATTRIBUTES, WINE_FILTER_ATTRIBUTES, HOME_BUBBLE_FILTER_ATTRIBUTES, buildMapFilterAttributes } from '@/domain/entities/filter-config'
import { matchesAllRules } from '@/domain/services/filter-matcher'
import { useAuth } from '@/presentation/providers/auth-provider'
import { useHomeTargets } from '@/application/hooks/use-home-targets'
import { useHomeState } from '@/application/hooks/use-home-state'
import { useCalendarRecords } from '@/application/hooks/use-calendar-records'
import { useRestaurantStats } from '@/application/hooks/use-restaurant-stats'
import { useWineStats } from '@/application/hooks/use-wine-stats'
import { useAiGreeting } from '@/application/hooks/use-ai-greeting'
import { useSettings } from '@/application/hooks/use-settings'
import { useFeedScores } from '@/application/hooks/use-feed-scores'
import { PenLine, FolderPlus, FolderMinus } from 'lucide-react'
import { BubblePickerSheet } from '@/presentation/components/bubble/bubble-picker-sheet'
import { useToast } from '@/presentation/components/ui/toast'
import { AppHeader } from '@/presentation/components/layout/app-header'
import { FabAdd } from '@/presentation/components/layout/fab-add'
import { AiGreeting } from '@/presentation/components/home/ai-greeting'
import { HomeTabs } from '@/presentation/components/home/home-tabs'
import { RecordCard } from '@/presentation/components/home/record-card'
import { WineCard } from '@/presentation/components/home/wine-card'
import { CompactListItem } from '@/presentation/components/home/compact-list-item'
import { useMapDiscovery } from '@/application/hooks/use-map-discovery'
import { useSearch } from '@/application/hooks/use-search'
import type { MapDiscoveryItem } from '@/domain/entities/map-discovery'
import type { RestaurantSearchResult } from '@/domain/entities/search'
import { ConditionFilterBar } from '@/presentation/components/home/condition-filter-bar'
import { AdvancedFilterSheet } from '@/presentation/components/home/advanced-filter-sheet'
import { SortDropdown } from '@/presentation/components/home/sort-dropdown'
import type { BubbleSortOption } from '@/domain/entities/saved-filter'
import { useBubbleList } from '@/application/hooks/use-bubble-list'
import { useBubbleExpertise } from '@/application/hooks/use-bubble-expertise'
import { useBubbleDiscover } from '@/application/hooks/use-bubble-discover'
import { useBubbleSimilarities } from '@/application/hooks/use-bubble-similarity'
import { useFollowingFeed } from '@/application/hooks/use-following-feed'
import { useUserCoords } from '@/application/hooks/use-user-coords'
import { useSocialFilterOptions } from '@/application/hooks/use-social-filter-options'
import type { SocialFilterState } from '@/presentation/components/home/condition-filter-bar'
import { useBubbleSelectMode } from '@/presentation/hooks/use-bubble-select-mode'
import { useHomeFilterChips } from '@/presentation/hooks/use-home-filter-chips'
import { HomeStatsPanel } from '@/presentation/components/home/home-stats-panel'
import { BubbleTabContent } from '@/presentation/containers/bubble-tab-content'

// --- Heavy components: lazy-loaded (only fetched when actually rendered) ---
const CalendarView = dynamic(() => import('@/presentation/components/home/calendar-view').then(m => ({ default: m.CalendarView })), { ssr: false })
const CalendarDayDetail = dynamic(() => import('@/presentation/components/home/calendar-day-detail').then(m => ({ default: m.CalendarDayDetail })), { ssr: false })
const MapView = dynamic(() => import('@/presentation/components/home/map-view').then(m => ({ default: m.MapView })), { ssr: false })
const FollowingFeed = dynamic(() => import('@/presentation/components/home/following-feed').then(m => ({ default: m.FollowingFeed })), { ssr: false })

function mapRecordSourceToScoreSource(source?: RecordSource): ScoreSource | undefined {
  if (!source) return undefined
  const map: Record<string, ScoreSource> = {
    mine: 'mine',
    bubble: 'bubble',
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

/** 지도뷰 소팅 옵션 (점수 높은순 디폴트, 점수 낮은순 제거) */
const MAP_SORT_LABELS: Partial<Record<SortOption, string>> = {
  score_high: '점수 높은순',
  name: '이름순',
  distance: '거리순',
}

/** 버블탭 소팅 옵션 */
const HOME_BUBBLE_SORT_LABELS: Record<BubbleSortOption, string> = {
  records: '기록 많은 순',
  members: '회원 많은 순',
  weekly_activity: '활동량 많은 순',
  activity: '최근 활동 순',
  name: '이름 순',
}

const MEAL_TIME_LABELS: Record<string, string> = {
  breakfast: '아침',
  lunch: '점심',
  dinner: '저녁',
  snack: '간식',
}

export function HomeContainer() {
  const { user } = useAuth()
  const { showToast } = useToast()
  const router = useRouter()
  const searchParams = useSearchParams()
  const activeBubbleIdParam = searchParams.get('bubbleId')
  const tabParam = searchParams.get('tab') as 'restaurant' | 'wine' | 'bubble' | null
  const [activeBubbleId, setActiveBubbleId] = useState<string | null>(activeBubbleIdParam)
  const { settings } = useSettings()
  const [renderTimestamp] = useState(() => Date.now())

  // ── 버블 선택 모드 (추출된 hook) ──
  const {
    isBubbleSelectMode,
    isBubbleRemoveMode,
    bubbleSelectIds,
    showBubblePicker,
    startBubbleSelect,
    startBubbleRemove,
    stopBubbleSelect,
    toggleBubbleSelectItem,
    openBubblePicker,
    closeBubblePicker,
    batchAddToBubble,
    batchRemoveFromBubble,
  } = useBubbleSelectMode({ userId: user?.id ?? null })

  const [homeRefreshKey, setHomeRefreshKey] = useState(0)
  const [bubbleRefreshKey, setBubbleRefreshKey] = useState(0)
  const refreshBubbles = useCallback(() => setBubbleRefreshKey((k) => k + 1), [])

  // 페이지 포커스 복귀 시 버블 데이터 자동 갱신 (상세→홈 복귀 등)
  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') refreshBubbles()
    }
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => document.removeEventListener('visibilitychange', onVisibilityChange)
  }, [refreshBubbles])

  // 탭+필터 sticky 영역 ref → 지도 stickyTop 동적 계산
  const stickyBarRef = useRef<HTMLDivElement>(null)
  const [mapStickyTop, setMapStickyTop] = useState('126px')
  useEffect(() => {
    const el = stickyBarRef.current
    if (!el) return
    const update = () => {
      const top = parseFloat(getComputedStyle(el).top) || 0
      setMapStickyTop(`${top + el.offsetHeight}px`)
    }
    update()
    const observer = new ResizeObserver(update)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])
  const { bubbles: myBubbles, pendingBubbleIds, isLoading: bubblesLoading } = useBubbleList(user?.id ?? null, bubbleRefreshKey)

  // ── 버블 전문성 ──
  const bubbleIds = useMemo(() => myBubbles.map((b) => b.id), [myBubbles])
  const { expertiseMap } = useBubbleExpertise(bubbleIds, bubbleRefreshKey)
  const bubbleSimilarityMap = useBubbleSimilarities(user?.id ?? null, bubbleIds, bubbleRefreshKey)

  // ── 버블 탭 소팅 ──
  const [bubbleSort, setBubbleSort] = useState<BubbleSortOption>('records')

  // ── 버블 탭 필터 칩 ──
  const [bubbleConditionChips, _setBubbleConditionChips] = useState<FilterChipItem[]>([
    { id: 'default_bubble_type', attribute: 'bubble_type', operator: 'eq', value: 'mine', displayLabel: '나의 버블' },
  ])
  // bubble_type이 mine이 아닐 때 role 칩 자동 제거
  const setBubbleConditionChips = useCallback((chips: FilterChipItem[] | ((prev: FilterChipItem[]) => FilterChipItem[])) => {
    _setBubbleConditionChips((prev) => {
      const next = typeof chips === 'function' ? chips(prev) : chips
      const typeChip = next.find((c) => !isAdvancedChip(c) && (c as { attribute: string }).attribute === 'bubble_type')
      const typeValue = typeChip ? String((typeChip as { value: string }).value) : null
      if (typeValue !== 'mine') {
        return next.filter((c) => isAdvancedChip(c) || (c as { attribute: string }).attribute !== 'role')
      }
      return next
    })
  }, [])

  // ── 버블 종류 필터 (bubble_type 칩) ──
  const bubbleTypeChip = bubbleConditionChips.find(
    (c) => !isAdvancedChip(c) && (c as { attribute: string }).attribute === 'bubble_type',
  )
  const bubbleTypeValue = bubbleTypeChip
    ? String((bubbleTypeChip as { value: string }).value)
    : null
  const isMineOnlyMode = bubbleTypeValue === 'mine'
  const isFollowingOnlyMode = bubbleTypeValue === 'following'
  const isPublicOnlyMode = bubbleTypeValue === 'public'
  const needPublicBubbles = !isMineOnlyMode
  const userAreas = useMemo(
    () => [...new Set(myBubbles.map((b) => b.area).filter(Boolean))] as string[],
    [myBubbles],
  )
  const excludeBubbleIds = useMemo(() => myBubbles.map((b) => b.id), [myBubbles])
  const { recommended: publicBubbles, isLoading: publicBubblesLoading } = useBubbleDiscover(
    userAreas,
    excludeBubbleIds,
    needPublicBubbles,
    bubbleRefreshKey,
  )

  // ── 버블 필터 속성에 전문 분야 동적 옵션 주입 ──
  const bubbleFilterAttributes = useMemo(() => {
    const isMineSelected = bubbleTypeValue === 'mine'
    return HOME_BUBBLE_FILTER_ATTRIBUTES.filter((attr) => {
      if (attr.key === 'role') return isMineSelected
      return true
    })
  }, [bubbleTypeValue])

  const {
    activeTab, setActiveTab, viewMode, setViewMode, cycleViewMode,
    toggleMap,
    isSortOpen, toggleSort, closeSort,
    isSearchOpen, toggleSearch,
    filterRules, setFilterRules,
    conjunction, setConjunction,
    currentSort, setCurrentSort,
    searchQuery, setSearchQuery,
  } = useHomeState({
    initialTab: tabParam ?? (activeBubbleId ? 'restaurant' : (settings?.prefHomeTab && settings.prefHomeTab !== 'last' ? settings.prefHomeTab as 'restaurant' | 'wine' : undefined)),
    initialViewMode: settings?.prefViewMode && settings.prefViewMode !== 'last' ? settings.prefViewMode as 'card' | 'list' | 'calendar' : undefined,
    initialSort: activeBubbleId ? 'distance' : undefined,
  })

  // 거리순 소팅 시에만 위치 좌표 요청
  const userCoords = useUserCoords(currentSort === 'distance' || activeTab === 'restaurant')

  // ── 소셜 필터 상태 ──
  const [socialFilter, setSocialFilter] = useState<SocialFilterState>(() => ({
    followingUserId: null,
    bubbleId: activeBubbleId ?? null,
  }))
  const [socialFilterReady, setSocialFilterReady] = useState(false)
  useEffect(() => {
    const timer = setTimeout(() => setSocialFilterReady(true), 100)
    return () => clearTimeout(timer)
  }, [])
  const socialFilterOptions = useSocialFilterOptions(user?.id ?? null, socialFilterReady)

  // ── 지도 필터 속성 ──
  const mapFilterAttributes = useMemo(
    () => buildMapFilterAttributes(
      socialFilterOptions.followingUsers.map((u) => ({ id: u.id, nickname: u.nickname, handle: u.handle })),
      socialFilterOptions.myBubbles.map((b) => ({ id: b.id, name: b.name })),
    ),
    [socialFilterOptions.followingUsers, socialFilterOptions.myBubbles],
  )

  // ── 조건 칩 (추출된 hook) ──
  const {
    conditionChips,
    setConditionChips,
    mapConditionChips,
    setMapConditionChips,
    isAdvancedOpen,
    setIsAdvancedOpen,
    handleChipsChange,
    handleAdvancedApply,
    handleTabTransition,
    viewTypes,
    dbFilterRules,
    jsFilterRules,
    homeDbFilters,
  } = useHomeFilterChips({
    userId: user?.id ?? null,
    activeTab,
    activeBubbleId,
    activeBubbleIdParam,
    setFilterRules,
    setActiveBubbleId,
    setSocialFilter,
  })

  // 탭 전환 처리
  handleTabTransition(activeBubbleId)

  // 소셜 필터 변경 콜백
  const handleSocialFilterChange = useCallback((filter: SocialFilterState) => {
    setSocialFilter(filter)
  }, [])

  // ── DB 페이지네이션 조건 ──
  const pageSize = viewMode === 'list' || viewMode === 'map' ? 10 : 5
  const [currentRecordPage, setCurrentRecordPage] = useState(1)
  const useDbPagination = currentSort === 'name' && jsFilterRules.length === 0 && !searchQuery.trim()
  const dbLimit = useDbPagination ? pageSize : null
  const dbOffset = useDbPagination ? (currentRecordPage - 1) * pageSize : 0

  // ── useHomeTargets ──
  const {
    targets: allViewTargets,
    hasMore,
  } = useHomeTargets({
    userId: user?.id ?? null,
    tab: activeTab,
    socialFilter: (socialFilter.followingUserId || socialFilter.bubbleId) ? socialFilter : undefined,
    dbFilters: homeDbFilters,
    sort: currentSort,
    limit: dbLimit,
    offset: dbOffset,
    refreshKey: homeRefreshKey,
  })

  // view 칩 기반 클라이언트 필터링
  const targets = useMemo(() => {
    if (viewTypes.length === 0) return allViewTargets
    return allViewTargets.filter((t) => t.sources.some((s) => viewTypes.includes(s as typeof viewTypes[number])))
  }, [allViewTargets, viewTypes])

  // P2: stats는 패널 열릴 때만 fetch
  const [isStatsOpen, setIsStatsOpen] = useState(false)
  const canShowStatsButton = targets.length >= 1
  const restaurantStats = useRestaurantStats(user?.id ?? null, isStatsOpen && activeTab === 'restaurant')
  const wineStats = useWineStats(user?.id ?? null, isStatsOpen && activeTab === 'wine')

  // AI 인사말
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

  const canShowStats = canShowStatsButton

  const totalCountries = useMemo(() => {
    const countries = new Set(restaurantStats.cityStats.map((c) => c.country))
    return countries.size
  }, [restaurantStats.cityStats])

  const handleSortChange = useCallback((sort: SortOption) => {
    setCurrentSort(sort)
    toggleSort()
  }, [setCurrentSort, toggleSort])

  const handleLogoReset = useCallback(() => {
    setActiveTab('restaurant')
    setViewMode('card')
    setActiveBubbleId(null)
    setSocialFilter({ followingUserId: null, bubbleId: null })
    const defaultChips = [createDefaultViewChip()]
    setConditionChips(defaultChips)
    setFilterRules(chipsToFilterRules(defaultChips))
    setCurrentSort('latest')
    setSearchQuery('')
  }, [setActiveTab, setViewMode, setFilterRules, setCurrentSort, setSearchQuery, setConditionChips])

  // 필터/검색 적용
  const filteredTargets = useMemo(() => {
    let result = targets
    if (jsFilterRules.length > 0) {
      result = result.filter((t) =>
        matchesAllRules(t as unknown as Record<string, unknown>, jsFilterRules, conjunction),
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
  }, [targets, jsFilterRules, conjunction, searchQuery])

  // 소팅
  const allSortedTargets = useMemo(() => {
    return sortHomeTargets(filteredTargets, currentSort, userCoords)
  }, [filteredTargets, currentSort, userCoords])

  // 페이지네이션
  const totalRecordPages = useDbPagination
    ? currentRecordPage + (hasMore ? 1 : 0)
    : Math.max(1, Math.ceil(allSortedTargets.length / pageSize))
  const displayTargets = useDbPagination
    ? allSortedTargets
    : allSortedTargets.slice(
        (currentRecordPage - 1) * pageSize,
        currentRecordPage * pageSize,
      )

  // ── CF 기반 Nyam 점수 ──
  const feedCategory = activeTab === 'wine' ? 'wine' as const : 'restaurant' as const
  const allUnvisitedIds = useMemo(() =>
    filteredTargets
      .filter((t) => t.visitCount === 0 && t.satisfaction === null)
      .map((t) => t.targetId)
      .slice(0, 50),
    [filteredTargets],
  )
  const { scores: feedScores } = useFeedScores(allUnvisitedIds, feedCategory, user?.id ?? null)

  // 필터/탭/뷰모드 변경 시 페이지 리셋
  const pageResetKey = `${activeTab}-${dbFilterRules.length}-${jsFilterRules.length}-${currentSort}-${searchQuery}-${conditionChips.length}-${viewMode}`
  const [prevPageResetKey, setPrevPageResetKey] = useState(pageResetKey)
  if (prevPageResetKey !== pageResetKey) {
    setPrevPageResetKey(pageResetKey)
    setCurrentRecordPage(1)
  }

  // 캘린더용 RecordWithTarget 배열
  const visitedRecords: RecordWithTarget[] = useMemo(() => {
    const seen = new Set<string>()
    return targets
      .filter((t) => t.sources.includes('mine') || t.sources.includes('following'))
      .flatMap((t) =>
        t.records
          .filter((r) => {
            if (seen.has(r.id)) return false
            seen.add(r.id)
            return true
          })
          .map((r) => ({
            ...r,
            targetName: t.name,
            targetMeta: t.genre ?? t.variety ?? null,
            targetArea: t.district ?? t.area?.[0] ?? t.region ?? null,
            targetPhotoUrl: t.photoUrl,
            targetPhotos: t.allPhotos,
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
            prestige: t.prestige ?? null,
          } satisfies RecordWithTarget)),
      )
  }, [targets])

  const { days: calendarDays } = useCalendarRecords({
    records: visitedRecords,
    year: calYear,
    month: calMonth,
  })

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

  // 지도 뷰 데이터
  const mapDiscovery = useMapDiscovery({
    userId: user?.id ?? null,
    targets: activeTab === 'restaurant' ? targets : [],
    userLat: userCoords?.lat ?? null,
    userLng: userCoords?.lng ?? null,
    mapChips: mapConditionChips,
    sortOption: (viewMode === 'map' ? currentSort : 'score_high') as 'score_high' | 'name' | 'distance',
    searchQuery: '',
  })

  // 지도뷰 전체 DB 검색
  const mapSearch = useSearch({
    targetType: 'restaurant',
    lat: userCoords?.lat,
    lng: userCoords?.lng,
    initialQuery: '',
  })

  useEffect(() => {
    if (viewMode === 'map') {
      mapSearch.setQuery(searchQuery)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, viewMode])

  // 검색 결과 → MapDiscoveryItem 변환
  const mapSearchItems: MapDiscoveryItem[] = useMemo(() => {
    if (!searchQuery.trim()) return []
    return mapSearch.results
      .filter((r): r is RestaurantSearchResult & { lat: number; lng: number } =>
        r.type === 'restaurant' && r.lat != null && r.lng != null)
      .map((r) => ({
        id: r.id,
        kakaoId: r.id.startsWith('kakao_') ? r.id.replace('kakao_', '') : null,
        name: r.name,
        genre: r.genre,
        area: r.area,
        lat: r.lat,
        lng: r.lng,
        distanceKm: null,
        inNyamDb: !r.id.startsWith('kakao_') && !r.id.startsWith('naver_') && !r.id.startsWith('google_'),
        restaurantId: r.id.startsWith('kakao_') || r.id.startsWith('naver_') || r.id.startsWith('google_') ? null : r.id,
        myScore: r.myScore ?? null,
        followingScore: null,
        bubbleScore: null,
        nyamScore: null,
        googleRating: null,
        prestige: r.prestige ?? [],
        sources: [] as MapDiscoveryItem['sources'],
      }))
  }, [mapSearch.results, searchQuery])

  const isMapSearchMode = viewMode === 'map' && searchQuery.trim().length > 0
  const isMapSearchModeRef = useRef(isMapSearchMode)
  isMapSearchModeRef.current = isMapSearchMode
  const mapSearchSuppressIdleRef = useRef(false)
  const [mapSearchSelectedId, setMapSearchSelectedId] = useState<string | null>(null)
  const lastMapIdleRef = useRef<{ center: { lat: number; lng: number }; zoom: number; bounds: { north: number; south: number; east: number; west: number } | null } | null>(null)

  // 빈 상태
  const renderEmptyState = () => (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-16">
      {activeTab === 'restaurant' ? (
        <UtensilsCrossed size={48} style={{ color: 'var(--text-hint)' }} />
      ) : (
        <Wine size={48} style={{ color: 'var(--text-hint)' }} />
      )}
      <p className="mt-4 text-[15px] font-semibold text-[var(--text)]">
        {activeTab === 'restaurant' ? '첫 식당을 기록해 보세요' : '첫 와인을 기록해 보세요'}
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
      return (
        <MapView
          items={isMapSearchMode ? mapSearchItems : mapDiscovery.pageItems}
          onMapIdle={(center, zoom, bounds) => {
            if (isMapSearchModeRef.current) {
              lastMapIdleRef.current = { center, zoom, bounds }
              if (mapSearchSuppressIdleRef.current) {
                mapSearchSuppressIdleRef.current = false
              }
              return
            }
            lastMapIdleRef.current = { center, zoom, bounds }
            mapDiscovery.onMapIdle(center, zoom, bounds)
          }}
          onItemSelect={() => {
            if (isMapSearchModeRef.current) mapSearchSuppressIdleRef.current = true
          }}
          onItemNavigate={(item) => {
            if (item.inNyamDb && item.restaurantId) {
              router.push(`/restaurants/${item.restaurantId}`)
            } else {
              const params = new URLSearchParams({
                name: item.name,
                lat: String(item.lat),
                lng: String(item.lng),
                ...(item.kakaoId ? { kakaoId: item.kakaoId } : {}),
                ...(item.genre ? { genre: item.genre } : {}),
              })
              router.push(`/search?${params}`)
            }
          }}
          isNearbyLoading={isMapSearchMode ? mapSearch.screenState === 'searching' : mapDiscovery.isNearbyLoading}
          currentPage={isMapSearchMode ? 1 : mapDiscovery.currentPage}
          totalPages={isMapSearchMode ? 1 : mapDiscovery.totalPages}
          onPageChange={mapDiscovery.setPage}
          userLat={userCoords?.lat}
          userLng={userCoords?.lng}
          splitLayout
          disablePanOnSelect={!isMapSearchMode}
          externalSelectedId={isMapSearchMode ? mapSearchSelectedId : undefined}
          onExternalSelect={isMapSearchMode ? (id) => {
            setMapSearchSelectedId(id)
            mapSearchSuppressIdleRef.current = true
          } : undefined}
          isBubbleSelecting={isBubbleSelectMode}
          bubbleSelectIds={bubbleSelectIds}
          onBubbleSelectToggle={toggleBubbleSelectItem}
        />
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
                privateNote: r.privateNote,
                photos: r.targetPhotos.length > 0 ? r.targetPhotos : (r.targetPhotoUrl ? [r.targetPhotoUrl] : []),
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
              prestige={target.prestige ?? []}
              memberBubbles={target.memberBubbles.map((b) => ({ bubbleId: b.bubbleId, bubbleName: b.bubbleName }))}
              isSelecting={isBubbleSelectMode}
              isSelected={bubbleSelectIds.has(target.targetId)}
              onSelectToggle={() => toggleBubbleSelectItem(target.targetId)}
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
          const status: 'visited' | 'tasted' = activeTab === 'wine'
            ? 'tasted'
            : 'visited'

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
              isSelecting={isBubbleSelectMode}
              isSelected={bubbleSelectIds.has(target.targetId)}
              onSelectToggle={() => toggleBubbleSelectItem(target.targetId)}
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
              latestDate={target.latestVisitDate}
              distanceKm={userCoords && target.lat != null && target.lng != null
                ? haversineDistance(userCoords.lat, userCoords.lng, target.lat, target.lng)
                : null}
              prestige={target.prestige ?? []}
              sharedBubbles={target.memberBubbles.map((b) => ({
                bubbleId: b.bubbleId,
                bubbleName: b.bubbleName,
                bubbleIcon: b.bubbleIcon,
              }))}
              isSelecting={isBubbleSelectMode}
              isSelected={bubbleSelectIds.has(target.targetId)}
              onSelectToggle={() => toggleBubbleSelectItem(target.targetId)}
            />
          )
        })}
      </div>
    )
  }

  const isCalendarMode = viewMode === 'calendar'
  const isBubbleTab = activeTab === 'bubble'
  const isMapMode = viewMode === 'map' && activeTab === 'restaurant'

  return (
    <div className={`content-feed flex flex-col bg-[var(--bg)] ${isMapMode ? 'h-dvh overflow-hidden' : 'min-h-dvh'}`}>
      <AppHeader onLogoClick={handleLogoReset} />

      <div className="flex min-h-0 flex-1 flex-col">
        {isGreetingVisible && (
          <div className="pt-2">
            <AiGreeting
              greeting={greeting}
              isDismissing={isGreetingDismissing}
              onDismiss={dismissGreeting}
            />
          </div>
        )}

        <div ref={stickyBarRef} style={{ position: isMapMode ? 'relative' : 'sticky', top: isMapMode ? undefined : '46px', zIndex: 80, backgroundColor: 'var(--bg)', flexShrink: 0 }}>
        <HomeTabs
          activeTab={activeTab}
          viewMode={viewMode}
          onTabChange={setActiveTab}
          onViewCycle={cycleViewMode}
          onMapToggle={toggleMap}
          onSortToggle={toggleSort}
          isSortOpen={isSortOpen}
          onSearchToggle={() => {
            toggleSearch()
            setSearchQuery('')
            setMapSearchSelectedId(null)
            if (lastMapIdleRef.current) {
              const { center, zoom, bounds } = lastMapIdleRef.current
              mapDiscovery.onMapIdle(center, zoom, bounds)
            }
          }}
          isSearchOpen={isSearchOpen}
          searchQuery={searchQuery}
          onSearchQueryChange={setSearchQuery}
          onSearchClear={() => {
            setSearchQuery('')
            setMapSearchSelectedId(null)
            if (lastMapIdleRef.current) {
              const { center, zoom, bounds } = lastMapIdleRef.current
              mapDiscovery.onMapIdle(center, zoom, bounds)
            }
          }}
          onStatsToggle={() => setIsStatsOpen(!isStatsOpen)}
          isStatsOpen={isStatsOpen}
          canShowStats={canShowStats && !isFollowingMode}
          accentType={accentType}
        />

        {/* 소팅 드롭다운 — 버블 탭 포함 */}
        {!isCalendarMode && !isStatsOpen && isSortOpen && (
          isBubbleTab ? (
            <div className="relative">
              <SortDropdown<BubbleSortOption>
                currentSort={bubbleSort}
                onSortChange={(s) => { setBubbleSort(s); closeSort() }}
                onClose={closeSort}
                accentType="social"
                labels={HOME_BUBBLE_SORT_LABELS}
              />
            </div>
          ) : (
            <div className="relative">
              <SortDropdown
                currentSort={currentSort}
                onSortChange={handleSortChange}
                onClose={closeSort}
                accentType={accentType}
                labels={
                  viewMode === 'map' && activeTab === 'restaurant'
                    ? MAP_SORT_LABELS
                    : activeTab === 'wine'
                      ? WINE_SORT_LABELS
                      : undefined
                }
              />
            </div>
          )
        )}

        {/* 조건 필터 칩 바 */}
        {!isCalendarMode && !isStatsOpen && (
          isBubbleTab ? (
            <ConditionFilterBar
              chips={bubbleConditionChips}
              onChipsChange={setBubbleConditionChips}
              attributes={bubbleFilterAttributes}
              accentType="social"
            />
          ) : viewMode === 'map' && activeTab === 'restaurant' ? (
            <ConditionFilterBar
              chips={mapConditionChips}
              onChipsChange={setMapConditionChips}
              attributes={mapFilterAttributes}
              accentType="food"
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
        {isBubbleTab && (
          <BubbleTabContent
            userId={user?.id}
            myBubbles={myBubbles}
            publicBubbles={publicBubbles}
            bubblesLoading={bubblesLoading}
            publicBubblesLoading={publicBubblesLoading}
            pendingBubbleIds={pendingBubbleIds}
            expertiseMap={expertiseMap}
            bubbleSimilarityMap={bubbleSimilarityMap}
            bubbleSort={bubbleSort}
            bubbleConditionChips={bubbleConditionChips}
            searchQuery={searchQuery}
            viewMode={viewMode}
            isMineOnlyMode={isMineOnlyMode}
            isFollowingOnlyMode={isFollowingOnlyMode}
            isPublicOnlyMode={isPublicOnlyMode}
            refreshBubbles={refreshBubbles}
          />
        )}

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

        {/* 통계 패널 (추출된 컴포넌트) */}
        {!isBubbleTab && isStatsOpen && !isFollowingMode && canShowStats && (
          <HomeStatsPanel
            activeTab={activeTab as 'restaurant' | 'wine'}
            restaurantStats={restaurantStats}
            wineStats={wineStats}
            totalCountries={totalCountries}
          />
        )}

        {/* 뷰 모드별 콘텐츠 */}
        {!isBubbleTab && !isFollowingMode && !isStatsOpen && renderContent()}
      </div>

      <FabAdd
        variant={isBubbleTab ? 'social' : activeTab === 'wine' ? 'wine' : 'food'}
        menuItems={isBubbleTab || isBubbleSelectMode ? undefined : [
          {
            key: 'record',
            icon: <PenLine size={16} />,
            label: '기록 추가',
            onClick: () => router.push(`/add?type=${activeTab}`),
          },
          {
            key: 'bubble-add',
            icon: <FolderPlus size={16} />,
            label: '버블에 추가',
            onClick: startBubbleSelect,
          },
          {
            key: 'bubble-remove',
            icon: <FolderMinus size={16} />,
            label: '버블에서 제거',
            onClick: startBubbleRemove,
          },
        ]}
        onClick={isBubbleTab ? () => router.push('/bubbles/create') : undefined}
        selectMode={isBubbleSelectMode ? {
          label: bubbleSelectIds.size > 0
            ? (isBubbleRemoveMode ? `${bubbleSelectIds.size}개 제거` : `${bubbleSelectIds.size}개 추가`)
            : '취소',
          onClick: bubbleSelectIds.size > 0
            ? (isBubbleRemoveMode
              ? () => openBubblePicker()
              : () => openBubblePicker())
            : stopBubbleSelect,
        } : undefined}
      />

      {/* 버블 선택 시트 — 추가/제거 공용 */}
      <BubblePickerSheet
        isOpen={showBubblePicker}
        onClose={closeBubblePicker}
        title={isBubbleRemoveMode ? '어디에서 제거할까요?' : undefined}
        bubbles={(() => {
          if (isBubbleRemoveMode) {
            const selectedItems = displayTargets.filter((t) => bubbleSelectIds.has(t.targetId))
            const bubbleIdSet = new Set<string>()
            for (const t of selectedItems) {
              for (const b of t.memberBubbles) bubbleIdSet.add(b.bubbleId)
            }
            return myBubbles.filter((b) => bubbleIdSet.has(b.id))
          }
          return socialFilter.bubbleId ? myBubbles.filter((b) => b.id !== socialFilter.bubbleId) : myBubbles
        })()}
        onSelect={async (bubbleId) => {
          const selected = displayTargets.filter((t) => bubbleSelectIds.has(t.targetId))
          const bubbleName = myBubbles.find((b) => b.id === bubbleId)?.name ?? '버블'

          if (isBubbleRemoveMode) {
            const removeTargets = selected
              .filter((t) => t.memberBubbles.some((b) => b.bubbleId === bubbleId))
              .map((t) => ({ targetId: t.targetId, targetType: t.targetType }))
            if (removeTargets.length === 0) return
            await batchRemoveFromBubble(bubbleId, removeTargets)
            showToast(`${removeTargets.length}개 항목을 "${bubbleName}"에서 제거했습니다`, 3000)
          } else {
            const newTargets = selected
              .filter((t) => !t.memberBubbles.some((b) => b.bubbleId === bubbleId))
              .map((t) => ({ targetId: t.targetId, targetType: t.targetType }))
            if (newTargets.length === 0) {
              showToast(`선택한 항목이 모두 "${bubbleName}"에 이미 등록되어 있습니다`, 3000)
              return
            }
            await batchAddToBubble(bubbleId, newTargets)
            const dupCount = selected.length - newTargets.length
            const msg = dupCount > 0
              ? `${newTargets.length}개 추가 (${dupCount}개 중복 제외)`
              : `${newTargets.length}개 항목을 "${bubbleName}"에 추가했습니다`
            showToast(msg, 3000)
          }
          setHomeRefreshKey((k) => k + 1)
          refreshBubbles()
          stopBubbleSelect()
        }}
        duplicateCounts={(() => {
          if (bubbleSelectIds.size === 0 || isBubbleRemoveMode) return undefined
          const counts = new Map<string, number>()
          const selected = displayTargets.filter((t) => bubbleSelectIds.has(t.targetId))
          for (const t of selected) {
            for (const b of t.memberBubbles) {
              counts.set(b.bubbleId, (counts.get(b.bubbleId) ?? 0) + 1)
            }
          }
          return counts.size > 0 ? counts : undefined
        })()}
      />
    </div>
  )
}
