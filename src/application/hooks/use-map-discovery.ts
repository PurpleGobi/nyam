'use client'

import { useState, useCallback, useMemo, useRef, useEffect } from 'react'
import type { RestaurantPrestige } from '@/domain/entities/restaurant'
import type {
  MapDiscoveryItem,
} from '@/domain/entities/map-discovery'
import type { FilterChipItem } from '@/domain/entities/condition-chip'
import { isAdvancedChip, PRESTIGE_GRADE_PREFIX, CASCADING_ALL, parseGradeSubChipKey } from '@/domain/entities/condition-chip'
import { haversineDistance } from '@/domain/services/distance'

/** bounds API 응답 아이템 */
interface BoundsRestaurant {
  id: string
  name: string
  genre: string | null
  district: string | null
  area: string[] | null
  address: string | null
  lat: number
  lng: number
  phone: string | null
  kakaoMapUrl: string | null
  prestige: RestaurantPrestige[]
  sources: string[]
  myScore: number | null
}

type MapSourceValue = 'mine' | 'following' | 'bubble'

const PAGE_SIZE = 20

export function useMapDiscovery(params: {
  userId: string | null
  targets: unknown[]
  userLat: number | null
  userLng: number | null
  mapChips?: FilterChipItem[]
  sortOption?: 'score_high' | 'name' | 'distance'
  searchQuery?: string
}): {
  pageItems: MapDiscoveryItem[]
  onMapIdle: (center: { lat: number; lng: number }, zoom: number, bounds: { north: number; south: number; east: number; west: number } | null) => void
  isNearbyLoading: boolean
  currentPage: number
  totalPages: number
  setPage: (page: number) => void
} {
  const { userLat, userLng, mapChips = [], sortOption = 'name', searchQuery = '' } = params

  const [items, setItems] = useState<MapDiscoveryItem[]>([])
  const [hasMore, setHasMore] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // --- 칩에서 필터 추출 ---
  // map_source: children-cascade 패턴 (map_source_type 칩에서 추출)
  const sourceFilter: MapSourceValue[] = useMemo(() => {
    const values: MapSourceValue[] = []
    for (const chip of mapChips) {
      if (isAdvancedChip(chip)) continue
      const attr = chip.filterKey ?? chip.attribute
      // 기존 multi-select 호환 + 새 cascade type 칩
      if (attr === 'map_source' || attr === 'map_source_type') {
        values.push(...String(chip.value).split(',').map((v) => v.trim()) as MapSourceValue[])
      }
    }
    return values
  }, [mapChips])

  // map_source grade sub-chip: source별 점수 임계값 (CASCADING_ALL이 아닌 것만)
  const sourceScoreFilter: Map<string, number> = useMemo(() => {
    const map = new Map<string, number>()
    for (const chip of mapChips) {
      if (isAdvancedChip(chip)) continue
      const parsed = parseGradeSubChipKey(chip.attribute)
      if (parsed && parsed.baseKey === 'map_source' && chip.value !== CASCADING_ALL) {
        map.set(parsed.typeValue, Number(chip.value))
      }
    }
    return map
  }, [mapChips])

  const prestigeFilter: string[] = useMemo(() => {
    const values: string[] = []
    for (const chip of mapChips) {
      if (isAdvancedChip(chip)) continue
      const attr = chip.filterKey ?? chip.attribute
      if (attr === 'prestige_type' || attr === 'prestige') {
        values.push(...String(chip.value).split(',').map((v) => v.trim()))
      }
    }
    return values
  }, [mapChips])

  // grade sub-chip에서 type→grade 매핑 추출 (CASCADING_ALL이 아닌 것만)
  const prestigeGradeFilter: Map<string, string> = useMemo(() => {
    const map = new Map<string, string>()
    for (const chip of mapChips) {
      if (isAdvancedChip(chip)) continue
      if (chip.attribute.startsWith(PRESTIGE_GRADE_PREFIX) && chip.value !== CASCADING_ALL) {
        const type = chip.attribute.slice(PRESTIGE_GRADE_PREFIX.length)
        map.set(type, String(chip.value))
      }
    }
    return map
  }, [mapChips])

  const genreFilter: string | null = useMemo(() => {
    for (const chip of mapChips) {
      if (isAdvancedChip(chip)) continue
      const attr = chip.filterKey ?? chip.attribute
      if (attr === 'genre') return String(chip.value)
    }
    return null
  }, [mapChips])

  const districtFilter: string | null = useMemo(() => {
    for (const chip of mapChips) {
      if (isAdvancedChip(chip)) continue
      const attr = chip.filterKey ?? chip.attribute
      if (attr === 'district') return String(chip.value)
    }
    return null
  }, [mapChips])

  const areaFilter: string | null = useMemo(() => {
    for (const chip of mapChips) {
      if (isAdvancedChip(chip)) continue
      const attr = chip.filterKey ?? chip.attribute
      if (attr === 'area') return String(chip.value)
    }
    return null
  }, [mapChips])

  const sourceFilterRef = useRef(sourceFilter)
  sourceFilterRef.current = sourceFilter
  const sourceScoreFilterRef = useRef(sourceScoreFilter)
  sourceScoreFilterRef.current = sourceScoreFilter
  const prestigeFilterRef = useRef(prestigeFilter)
  const prestigeGradeFilterRef = useRef(prestigeGradeFilter)
  prestigeGradeFilterRef.current = prestigeGradeFilter
  prestigeFilterRef.current = prestigeFilter
  const genreFilterRef = useRef(genreFilter)
  genreFilterRef.current = genreFilter
  const districtFilterRef = useRef(districtFilter)
  districtFilterRef.current = districtFilter
  const areaFilterRef = useRef(areaFilter)
  areaFilterRef.current = areaFilter

  // --- bounds API 호출 (모든 필터를 DB로 전달) ---
  const fetchBounds = useCallback(async (
    bounds: { north: number; south: number; east: number; west: number },
    sort: string,
    keyword: string,
    sourcesArr: MapSourceValue[],
    prestigeArr: string[],
    page: number,
  ) => {
    setIsLoading(true)
    try {
      const offset = (page - 1) * PAGE_SIZE
      const sp = new URLSearchParams({
        north: String(bounds.north),
        south: String(bounds.south),
        east: String(bounds.east),
        west: String(bounds.west),
        sort,
        limit: String(PAGE_SIZE),
        offset: String(offset),
      })
      if (keyword) sp.set('keyword', keyword)
      if (sourcesArr.length > 0) sp.set('source', sourcesArr.join(','))
      if (prestigeArr.length > 0) sp.set('prestige', prestigeArr.join(','))
      if (genreFilterRef.current) sp.set('genre', genreFilterRef.current)
      if (districtFilterRef.current) sp.set('district', districtFilterRef.current)
      if (areaFilterRef.current) sp.set('area', areaFilterRef.current)

      const res = await fetch(`/api/restaurants/bounds?${sp}`)
      if (!res.ok) {
        setIsLoading(false)
        return
      }
      const data = (await res.json()) as { restaurants: BoundsRestaurant[]; hasMore: boolean }
      setHasMore(data.hasMore)
      const mapped: MapDiscoveryItem[] = data.restaurants.map((r) => ({
        id: r.id,
        kakaoId: null,
        name: r.name,
        genre: r.genre,
        area: r.district ?? r.area?.[0] ?? null,
        lat: r.lat,
        lng: r.lng,
        distanceKm:
          userLat != null && userLng != null
            ? Math.round(haversineDistance(userLat, userLng, r.lat, r.lng) * 10) / 10
            : null,
        inNyamDb: true,
        restaurantId: r.id,
        myScore: r.myScore,
        followingScore: null,
        bubbleScore: null,
        nyamScore: null,
        googleRating: null,
        prestige: r.prestige ?? [],
        sources: (r.sources.length > 0 ? r.sources : ['mine']) as MapDiscoveryItem['sources'],
      }))
      // grade sub-chip 클라이언트 사이드 필터링 (prestige)
      const gradeMap = prestigeGradeFilterRef.current
      let filtered = gradeMap.size > 0
        ? mapped.filter((item) => {
          for (const [type, grade] of gradeMap) {
            const has = item.prestige.some((p) => p.type === type && p.grade === grade)
            if (!has) return false
          }
          return true
        })
        : mapped
      // source score sub-chip 클라이언트 사이드 필터링 (map_source_grade:mine 등)
      const scoreMap = sourceScoreFilterRef.current
      if (scoreMap.size > 0) {
        filtered = filtered.filter((item) => {
          const mineThreshold = scoreMap.get('mine')
          if (mineThreshold != null && item.myScore != null && item.myScore < mineThreshold) return false
          if (mineThreshold != null && item.myScore == null) return false
          return true
        })
      }
      setItems(filtered)
    } catch {
      // 조용히 무시
    } finally {
      setIsLoading(false)
    }
  }, [userLat, userLng])

  // --- 페이지네이션 ---
  const totalPages = hasMore ? currentPage + 1 : currentPage

  // --- refs ---
  const sortRef = useRef(sortOption)
  sortRef.current = sortOption
  const searchRef = useRef(searchQuery)
  searchRef.current = searchQuery
  const boundsRef = useRef<{ north: number; south: number; east: number; west: number } | null>(null)

  // --- 헬퍼: 현재 상태로 fetch ---
  const fetchCurrent = useCallback((page: number) => {
    if (!boundsRef.current) return
    fetchBounds(boundsRef.current, sortRef.current, searchRef.current, sourceFilterRef.current, prestigeFilterRef.current, page)
  }, [fetchBounds])

  // --- 지도 idle 핸들러 ---
  const onMapIdle = useCallback((
    _center: { lat: number; lng: number },
    _zoom: number,
    bounds: { north: number; south: number; east: number; west: number } | null,
  ) => {
    if (!bounds) return
    boundsRef.current = bounds
    setCurrentPage(1)

    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => fetchCurrent(1), 150)
  }, [fetchCurrent])

  // --- 필터/검색 변경 시 1페이지로 재검색 ---
  useEffect(() => {
    if (!boundsRef.current) return
    setCurrentPage(1)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => fetchCurrent(1), 150)
  }, [searchQuery, sourceFilter, sourceScoreFilter, prestigeFilter, prestigeGradeFilter, genreFilter, districtFilter, areaFilter, fetchCurrent])

  // --- 페이지 변경 ---
  const setPage = useCallback((page: number) => {
    setCurrentPage(page)
    fetchCurrent(page)
  }, [fetchCurrent])

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  return {
    pageItems: items,
    onMapIdle,
    isNearbyLoading: isLoading,
    currentPage,
    totalPages,
    setPage,
  }
}
