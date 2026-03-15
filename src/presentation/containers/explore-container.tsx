'use client'

import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  Search, SearchX, AlertCircle, X, SlidersHorizontal,
  MapPin, ArrowUpDown, ChevronDown, GitCompareArrows, Check,
} from 'lucide-react'
import { useRestaurants } from '@/application/hooks/use-restaurants'
import { useFavorites } from '@/application/hooks/use-favorites'
import { useInteractionTracker } from '@/application/hooks/use-interaction-tracker'
import { RestaurantCard } from '@/presentation/components/restaurant/restaurant-card'
import { RestaurantCardSkeleton } from '@/presentation/components/restaurant/restaurant-card-skeleton'
import { ComparisonPromptSheet } from '@/presentation/components/prompt/comparison-prompt-sheet'
import { EmptyState } from '@/presentation/components/shared/empty-state'
import { Input } from '@/components/ui/input'
import { FOOD_CATEGORIES } from '@/shared/constants/categories'
import { ROUTES } from '@/shared/constants/routes'
import type { RestaurantFilter } from '@/domain/repositories/restaurant-repository'
import type { CuisineCategory, RestaurantWithSummary } from '@/domain/entities/restaurant'
import { cn } from '@/shared/utils/cn'

const categoryIdToLabel: Record<string, CuisineCategory> = {
  korean: '한식', japanese: '일식', chinese: '중식', western: '양식',
  'cafe-dessert': '카페', 'southeast-asian': '아시안', 'street-food': '분식',
  'meat-grill': '기타', seafood: '기타', 'vegetarian-healthy': '기타',
}

const REGIONS = ['전체', '강남', '홍대', '종로', '이태원', '성수', '여의도', '잠실', '신촌', '망원', '을지로', '광화문']
const SORT_OPTIONS = [
  { value: 'latest', label: '최신순' },
  { value: 'rating', label: '평점순' },
  { value: 'name', label: '이름순' },
]

export function ExploreContainer() {
  const searchParams = useSearchParams()
  const situationParam = searchParams?.get('situation')

  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [selectedRegion, setSelectedRegion] = useState<string>('전체')
  const [sortBy, setSortBy] = useState<string>('latest')
  const [showFilters, setShowFilters] = useState(false)
  const [compareMode, setCompareMode] = useState(false)
  const [selectedForCompare, setSelectedForCompare] = useState<RestaurantWithSummary[]>([])
  const [showCompareSheet, setShowCompareSheet] = useState(false)

  const filter: RestaurantFilter = {
    ...(selectedCategory && categoryIdToLabel[selectedCategory]
      ? { cuisineCategory: categoryIdToLabel[selectedCategory] }
      : {}),
    ...(searchQuery.trim() ? { query: searchQuery.trim() } : {}),
    ...(selectedRegion !== '전체' ? { region: selectedRegion } : {}),
  }

  const { restaurants, isLoading, error } = useRestaurants({ filter })
  const { isFavorite, toggleFavorite } = useFavorites()
  const { trackCategoryClick, trackRegionSelect, trackSearchQuery } = useInteractionTracker()

  // Debounced search tracking (500ms)
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
    if (searchQuery.trim().length >= 2) {
      searchTimerRef.current = setTimeout(() => {
        trackSearchQuery(searchQuery.trim())
      }, 500)
    }
    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
    }
  }, [searchQuery, trackSearchQuery])

  // Sort locally
  const sortedRestaurants = useMemo(() => {
    const list = [...restaurants]
    if (sortBy === 'rating') {
      list.sort((a, b) => {
        const avgA = a.ratings.length > 0 ? a.ratings.reduce((s, r) => s + (Number(r.rating) || 0), 0) / a.ratings.length : 0
        const avgB = b.ratings.length > 0 ? b.ratings.reduce((s, r) => s + (Number(r.rating) || 0), 0) / b.ratings.length : 0
        return avgB - avgA
      })
    } else if (sortBy === 'name') {
      list.sort((a, b) => a.name.localeCompare(b.name, 'ko'))
    }
    return list
  }, [restaurants, sortBy])

  const activeFilterCount = [
    selectedCategory, selectedRegion !== '전체' ? selectedRegion : null,
  ].filter(Boolean).length

  const handleCategoryClick = useCallback((categoryId: string) => {
    setSelectedCategory(prev => prev === categoryId ? null : categoryId)
    const label = categoryIdToLabel[categoryId]
    if (label) trackCategoryClick(label)
  }, [trackCategoryClick])

  const handleFavoriteClick = useCallback((restaurantId: string) => {
    void toggleFavorite(restaurantId)
  }, [toggleFavorite])

  const clearFilters = useCallback(() => {
    setSelectedCategory(null)
    setSelectedRegion('전체')
    setSearchQuery('')
    setSortBy('latest')
  }, [])

  const toggleCompareSelect = useCallback((restaurant: RestaurantWithSummary) => {
    setSelectedForCompare(prev => {
      const exists = prev.find(r => r.id === restaurant.id)
      if (exists) return prev.filter(r => r.id !== restaurant.id)
      if (prev.length >= 5) return prev
      return [...prev, restaurant]
    })
  }, [])

  const removeFromCompare = useCallback((id: string) => {
    setSelectedForCompare(prev => prev.filter(r => r.id !== id))
  }, [])

  const isSelectedForCompare = useCallback(
    (id: string) => selectedForCompare.some(r => r.id === id),
    [selectedForCompare],
  )

  return (
    <div className="flex flex-col gap-3 px-5 pb-20">
      {/* Search bar */}
      <div className="relative">
        <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
        <Input
          placeholder="식당, 지역, 메뉴 검색..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="h-12 rounded-2xl border-neutral-200 bg-neutral-50 pl-10 pr-10 text-base placeholder:text-neutral-400 focus:bg-white"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1"
          >
            <X size={16} className="text-neutral-400" />
          </button>
        )}
      </div>

      {/* Filter bar: region + sort + filter toggle */}
      <div className="flex items-center gap-2">
        {/* Region quick select */}
        <div className="relative flex-1">
          <div className="flex gap-1.5 overflow-x-auto scrollbar-hide">
            {REGIONS.map(region => (
              <button
                key={region}
                type="button"
                onClick={() => {
                  setSelectedRegion(region)
                  if (region !== '전체') trackRegionSelect(region)
                }}
                className={cn(
                  'shrink-0 rounded-full px-3 py-1.5 text-[13px] font-medium transition-all',
                  selectedRegion === region
                    ? 'bg-orange-500 text-white shadow-sm'
                    : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200',
                )}
              >
                {region === '전체' ? (
                  <span className="flex items-center gap-1">
                    <MapPin size={12} />
                    전체
                  </span>
                ) : region}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Sort + filter + compare toggle row */}
      <div className="flex items-center justify-between">
        {/* Sort dropdown */}
        <div className="flex items-center gap-1.5">
          <ArrowUpDown size={14} className="text-neutral-500" />
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value)}
            className="appearance-none bg-transparent text-[13px] font-medium text-neutral-700 outline-none"
          >
            {SORT_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <ChevronDown size={12} className="text-neutral-400" />
        </div>

        <div className="flex items-center gap-2">
          {/* Compare toggle */}
          <button
            type="button"
            onClick={() => {
              setCompareMode(!compareMode)
              if (compareMode) setSelectedForCompare([])
            }}
            className={cn(
              'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-medium transition-all',
              compareMode
                ? 'bg-blue-50 text-blue-600'
                : 'bg-neutral-100 text-neutral-600',
            )}
          >
            <GitCompareArrows size={14} />
            비교
          </button>

          {/* Filter toggle */}
          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-medium transition-all',
              showFilters || activeFilterCount > 0
                ? 'bg-orange-50 text-orange-600'
                : 'bg-neutral-100 text-neutral-600',
            )}
          >
            <SlidersHorizontal size={14} />
            필터
            {activeFilterCount > 0 && (
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-orange-500 text-[10px] text-white">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Expandable category filter */}
      {showFilters && (
        <div className="flex flex-col gap-3 rounded-2xl bg-neutral-50 p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-neutral-700">음식 종류</span>
            {activeFilterCount > 0 && (
              <button
                type="button"
                onClick={clearFilters}
                className="text-xs text-orange-500"
              >
                초기화
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {FOOD_CATEGORIES.map(category => (
              <button
                key={category.id}
                type="button"
                onClick={() => handleCategoryClick(category.id)}
                className={cn(
                  'flex items-center gap-1.5 rounded-full border px-3 py-2 text-[13px] font-medium transition-all',
                  selectedCategory === category.id
                    ? 'border-transparent text-white shadow-sm'
                    : 'border-neutral-200 bg-white text-neutral-700',
                )}
                style={
                  selectedCategory === category.id
                    ? { backgroundColor: category.color }
                    : undefined
                }
              >
                <category.icon size={14} />
                {category.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Active filter chips */}
      {(selectedCategory || selectedRegion !== '전체' || searchQuery) && (
        <div className="flex flex-wrap gap-1.5">
          {selectedRegion !== '전체' && (
            <span className="flex items-center gap-1 rounded-full bg-orange-50 px-2.5 py-1 text-xs font-medium text-orange-700">
              <MapPin size={11} />
              {selectedRegion}
              <button type="button" onClick={() => setSelectedRegion('전체')}>
                <X size={11} />
              </button>
            </span>
          )}
          {selectedCategory && (
            <span className="flex items-center gap-1 rounded-full bg-orange-50 px-2.5 py-1 text-xs font-medium text-orange-700">
              {FOOD_CATEGORIES.find(c => c.id === selectedCategory)?.label}
              <button type="button" onClick={() => setSelectedCategory(null)}>
                <X size={11} />
              </button>
            </span>
          )}
          {searchQuery && (
            <span className="flex items-center gap-1 rounded-full bg-orange-50 px-2.5 py-1 text-xs font-medium text-orange-700">
              &ldquo;{searchQuery}&rdquo;
              <button type="button" onClick={() => setSearchQuery('')}>
                <X size={11} />
              </button>
            </span>
          )}
        </div>
      )}

      {/* Results count */}
      {!isLoading && !error && (
        <p className="text-xs text-neutral-500">
          {sortedRestaurants.length}개의 맛집
        </p>
      )}

      {/* Restaurant list */}
      {isLoading && (
        <div className="flex flex-col gap-2.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <RestaurantCardSkeleton key={i} />
          ))}
        </div>
      )}

      {error && !isLoading && (
        <div className="flex flex-col items-center gap-3 py-12">
          <AlertCircle size={48} className="text-red-400" />
          <p className="text-sm text-red-500">데이터를 불러오지 못했어요.</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-lg bg-orange-500 px-4 py-2.5 text-sm font-medium text-white"
          >
            다시 시도
          </button>
        </div>
      )}

      {!isLoading && !error && sortedRestaurants.length === 0 && (
        <EmptyState
          icon={SearchX}
          title="검색 결과가 없어요"
          description={
            searchQuery
              ? `"${searchQuery}"에 해당하는 맛집을 찾지 못했어요.`
              : '조건에 맞는 맛집이 없어요. 필터를 변경해보세요.'
          }
        />
      )}

      {!isLoading && !error && sortedRestaurants.length > 0 && (
        <div className="flex flex-col gap-2.5">
          {sortedRestaurants.map(restaurant => (
            compareMode ? (
              <button
                key={restaurant.id}
                type="button"
                onClick={() => toggleCompareSelect(restaurant)}
                className="relative text-left"
              >
                <RestaurantCard
                  restaurant={restaurant}
                  isFavorite={isFavorite(restaurant.id)}
                />
                {/* Compare selection indicator */}
                <div
                  className={cn(
                    'absolute left-2 top-2 flex h-6 w-6 items-center justify-center rounded-full border-2 transition-all',
                    isSelectedForCompare(restaurant.id)
                      ? 'border-blue-500 bg-blue-500'
                      : 'border-neutral-300 bg-white',
                  )}
                >
                  {isSelectedForCompare(restaurant.id) && (
                    <Check size={14} className="text-white" strokeWidth={3} />
                  )}
                </div>
              </button>
            ) : (
              <Link key={restaurant.id} href={`/restaurant/${restaurant.id}`}>
                <RestaurantCard
                  restaurant={restaurant}
                  isFavorite={isFavorite(restaurant.id)}
                  onFavoriteClick={handleFavoriteClick}
                />
              </Link>
            )
          ))}
        </div>
      )}

      {/* Floating compare bar */}
      {compareMode && selectedForCompare.length > 0 && (
        <div className="fixed inset-x-0 bottom-16 z-40 mx-auto max-w-lg px-4 pb-[env(safe-area-inset-bottom)]">
          <div className="flex items-center justify-between rounded-2xl bg-blue-600 px-4 py-3 shadow-lg">
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-white">
                {selectedForCompare.length}곳 선택됨
              </span>
              <span className="text-xs text-blue-200">
                {selectedForCompare.map(r => r.name).join(', ')}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShowCompareSheet(true)}
              disabled={selectedForCompare.length < 2}
              className={cn(
                'rounded-xl px-4 py-2 text-sm font-semibold transition-all',
                selectedForCompare.length >= 2
                  ? 'bg-white text-blue-600'
                  : 'bg-blue-500 text-blue-300',
              )}
            >
              비교 분석
            </button>
          </div>
        </div>
      )}

      {/* Comparison prompt sheet */}
      <ComparisonPromptSheet
        restaurants={selectedForCompare}
        onRemove={removeFromCompare}
        open={showCompareSheet}
        onOpenChange={setShowCompareSheet}
      />
    </div>
  )
}
