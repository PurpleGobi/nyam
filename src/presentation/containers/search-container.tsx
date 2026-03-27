'use client'

import { useCallback, useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import type { SearchResult, NearbyRestaurant } from '@/domain/entities/search'
import type { RecordTargetType } from '@/domain/entities/record'
import { useSearch } from '@/application/hooks/use-search'
import { RecordNav } from '@/presentation/components/record/record-nav'
import { SearchBar } from '@/presentation/components/search/search-bar'
import { SearchResults } from '@/presentation/components/search/search-results'
import { RecentSearches } from '@/presentation/components/search/recent-searches'
import { NearbyList } from '@/presentation/components/search/nearby-list'

function SearchInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const targetType = (searchParams.get('type') ?? 'restaurant') as RecordTargetType
  const variant = targetType === 'wine' ? 'wine' : 'restaurant'

  const [nearbyRestaurants, setNearbyRestaurants] = useState<NearbyRestaurant[]>([])
  const [nearbyLoading, setNearbyLoading] = useState(false)

  useEffect(() => {
    if (targetType !== 'restaurant') return
    if (!navigator.geolocation) return

    setNearbyLoading(true)
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const res = await fetch(
            `/api/restaurants/nearby?lat=${pos.coords.latitude}&lng=${pos.coords.longitude}&radius=2000`,
          )
          const data = await res.json()
          setNearbyRestaurants(data.restaurants ?? [])
        } catch {
          // GPS 실패 시 빈 목록
        } finally {
          setNearbyLoading(false)
        }
      },
      () => setNearbyLoading(false),
      { timeout: 5000 },
    )
  }, [targetType])

  const {
    query,
    setQuery,
    screenState,
    results,
    recentSearches,
    addRecentSearch,
    clearRecentSearches,
  } = useSearch({ targetType })

  const handleSelect = useCallback(
    (result: SearchResult) => {
      addRecentSearch(result.name)
      const meta =
        result.type === 'restaurant'
          ? [result.genre, result.area].filter(Boolean).join(' · ')
          : [result.wineType, result.region, result.vintage].filter(Boolean).join(' · ')

      router.push(
        `/record?type=${result.type}&targetId=${result.id}&name=${encodeURIComponent(result.name)}&meta=${encodeURIComponent(meta)}`,
      )
    },
    [router, addRecentSearch],
  )

  const handleRecentSelect = useCallback(
    (q: string) => {
      setQuery(q)
    },
    [setQuery],
  )

  const handleRegister = useCallback(() => {
    router.push(`/register?type=${targetType}&name=${encodeURIComponent(query)}`)
  }, [router, targetType, query])

  return (
    <div className="flex min-h-dvh flex-col bg-[var(--bg)]">
      <RecordNav
        title={targetType === 'wine' ? '와인 검색' : '식당 검색'}
        variant={targetType === 'wine' ? 'wine' : 'food'}
        onBack={() => router.back()}
        onClose={() => router.push('/')}
      />

      <div className="mt-2">
        <SearchBar
          value={query}
          onChange={setQuery}
          placeholder={targetType === 'wine' ? '와인 이름으로 검색' : '식당 이름으로 검색'}
          variant={variant}
          autoFocus
        />
      </div>

      {screenState === 'idle' && (
        <>
          <RecentSearches
            searches={recentSearches}
            onSelect={handleRecentSelect}
            onClear={clearRecentSearches}
          />
          {targetType === 'restaurant' && (
            <NearbyList
              restaurants={nearbyRestaurants}
              isLoading={nearbyLoading}
              onSelect={(restaurantId) => {
                const r = nearbyRestaurants.find((n) => n.id === restaurantId)
                if (r) {
                  router.push(
                    `/record?type=restaurant&targetId=${r.id}&name=${encodeURIComponent(r.name)}&meta=${encodeURIComponent([r.genre, r.area].filter(Boolean).join(' · '))}&from=search`,
                  )
                }
              }}
              onRegister={() => router.push(`/register?type=restaurant`)}
            />
          )}
        </>
      )}

      <SearchResults
        screenState={screenState}
        results={results}
        variant={variant}
        onSelect={handleSelect}
        onRegister={handleRegister}
      />
    </div>
  )
}

export function SearchContainer() {
  return (
    <Suspense fallback={<div className="flex min-h-dvh items-center justify-center" style={{ color: 'var(--text-hint)' }}>로딩 중...</div>}>
      <SearchInner />
    </Suspense>
  )
}
