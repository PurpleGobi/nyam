'use client'

import { useCallback, useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import type { SearchResult, NearbyRestaurant } from '@/domain/entities/search'
import type { WineSearchCandidate } from '@/infrastructure/api/gemini'
import type { RecordTargetType } from '@/domain/entities/record'
import { useSearch } from '@/application/hooks/use-search'
import { AppHeader } from '@/presentation/components/layout/app-header'
import { FabBack } from '@/presentation/components/layout/fab-back'
import { SearchBar } from '@/presentation/components/search/search-bar'
import { SearchResults } from '@/presentation/components/search/search-results'
import { NearbyList } from '@/presentation/components/search/nearby-list'

function SearchInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const targetType = (searchParams.get('type') ?? 'restaurant') as RecordTargetType
  const variant = targetType === 'wine' ? 'wine' : 'restaurant'

  const [nearbyRestaurants, setNearbyRestaurants] = useState<NearbyRestaurant[]>([])
  const [nearbyLoading, setNearbyLoading] = useState(false)
  const [gps, setGps] = useState<{ lat: number; lng: number } | null>(null)
  const [nearbyGenre, setNearbyGenre] = useState('')
  const [nearbyRadius, setNearbyRadius] = useState(500)
  const [toast, setToast] = useState<string | null>(null)

  const fetchNearby = useCallback((coords: { lat: number; lng: number }, keyword: string, radius: number) => {
    setNearbyLoading(true)
    const params = new URLSearchParams({
      lat: String(coords.lat),
      lng: String(coords.lng),
      radius: String(radius),
    })
    if (keyword) params.set('keyword', keyword)
    fetch(`/api/restaurants/nearby?${params}`)
      .then((res) => res.json())
      .then((data) => setNearbyRestaurants(data.restaurants ?? []))
      .catch(() => {})
      .finally(() => setNearbyLoading(false))
  }, [])

  useEffect(() => {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude }
        setGps(coords)
        if (targetType === 'restaurant') fetchNearby(coords, nearbyGenre, nearbyRadius)
      },
      () => setNearbyLoading(false),
      { enableHighAccuracy: true, timeout: 5000 },
    )
  }, [targetType, fetchNearby, nearbyGenre, nearbyRadius])

  const handleGenreChange = useCallback((genre: string) => {
    setNearbyGenre(genre)
    if (gps) fetchNearby(gps, genre, nearbyRadius)
  }, [gps, fetchNearby, nearbyRadius])

  const handleRadiusChange = useCallback((radius: number) => {
    setNearbyRadius(radius)
    if (gps) fetchNearby(gps, nearbyGenre, radius)
  }, [gps, fetchNearby, nearbyGenre])

  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(null), 2500)
    return () => clearTimeout(timer)
  }, [toast])

  const {
    query,
    setQuery,
    screenState,
    results,
    aiCandidates,
    isAiSearching,
    isSelectingAi,
    selectAiCandidate,
    recentSearches,
    addRecentSearch,
    clearRecentSearches,
  } = useSearch({ targetType, lat: gps?.lat, lng: gps?.lng })

  const handleSelect = useCallback(
    async (result: SearchResult) => {
      addRecentSearch(query)
      const meta =
        result.type === 'restaurant'
          ? [result.genreDisplay, result.area].filter(Boolean).join(' · ')
          : [result.wineType, result.region, result.vintage].filter(Boolean).join(' · ')

      // 기록 있음 → 토스트 + 상세 페이지 이동
      if (result.hasRecord) {
        setToast('다녀온 적 있어요')
        const detailPath = result.type === 'restaurant'
          ? `/restaurants/${result.id}`
          : `/wines/${result.id}`
        setTimeout(() => router.push(detailPath), 600)
        return
      }

      let targetId = result.id

      // 외부 API 결과 선택 → DB에 자동 INSERT
      const isExternal = targetId.startsWith('kakao_') || targetId.startsWith('naver_') || targetId.startsWith('google_')
      if (isExternal && result.type === 'restaurant') {
        const externalIds: Record<string, string> = {}
        if (targetId.startsWith('kakao_')) externalIds.kakao = targetId.replace('kakao_', '')
        else if (targetId.startsWith('naver_')) externalIds.naver = targetId.replace('naver_', '')
        else if (targetId.startsWith('google_')) externalIds.google = targetId.replace('google_', '')

        const res = await fetch('/api/restaurants', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: result.name,
            address: result.address,
            area: result.area,
            genre: result.genre,
            lat: result.lat,
            lng: result.lng,
            phone: result.phone,
            kakaoMapUrl: result.kakaoMapUrl,
            externalIds,
          }),
        })
        const data = await res.json()
        if (!data.id) {
          setToast('식당 등록에 실패했습니다')
          return
        }
        targetId = data.id
        // 기존 식당에서 반환된 genre가 있으면 사용
        if (data.genre && !result.genre) {
          result = { ...result, genre: data.genre }
        }
      }

      // genre 힌트를 sessionStorage에 저장 (기록 폼에서 프리필)
      if (result.type === 'restaurant') {
        if (result.genre) {
          try { sessionStorage.setItem('nyam_genre_hint', result.genre) } catch {}
        }
        // 기록 폼에 표시할 추가 정보
        const extra: Record<string, string> = {}
        if (result.categoryPath) extra.categoryPath = result.categoryPath
        if (result.address) extra.address = result.address
        if (result.distance !== null) {
          extra.distance = result.distance < 1000
            ? `${Math.round(result.distance)}m`
            : `${(result.distance / 1000).toFixed(1)}km`
        }
        if (Object.keys(extra).length > 0) {
          try { sessionStorage.setItem('nyam_record_extra', JSON.stringify(extra)) } catch {}
        }
      }

      router.push(
        `/record?type=${result.type}&targetId=${targetId}&name=${encodeURIComponent(result.name)}&meta=${encodeURIComponent(meta)}&from=search`,
      )
    },
    [router, addRecentSearch, query],
  )

  const handleRecentSelect = useCallback(
    (q: string) => {
      setQuery(q)
    },
    [setQuery],
  )

  const handleSelectAiCandidate = useCallback(
    async (candidate: WineSearchCandidate) => {
      addRecentSearch(query)
      const wine = await selectAiCandidate(candidate)
      if (!wine) {
        setToast('와인 정보를 가져오지 못했습니다')
        return
      }
      const meta = [
        candidate.wineType,
        candidate.region,
        candidate.vintage,
      ].filter(Boolean).join(' · ')
      router.push(
        `/record?type=wine&targetId=${wine.id}&name=${encodeURIComponent(wine.name)}&meta=${encodeURIComponent(meta)}&from=search`,
      )
    },
    [router, addRecentSearch, query, selectAiCandidate],
  )

  const handleRegister = useCallback(() => {
    router.push(`/register?type=${targetType}&name=${encodeURIComponent(query)}`)
  }, [router, targetType, query])

  return (
    <div className="content-detail flex min-h-dvh flex-col bg-[var(--bg)]">
      <AppHeader />
      <FabBack />

      {/* 토스트 알림 */}
      {toast && (
        <div className="pointer-events-none fixed inset-x-0 top-16 z-50 flex justify-center">
          <div className="rounded-full bg-[var(--text)] px-5 py-2.5 text-[13px] font-medium text-[var(--bg)]">
            {toast}
          </div>
        </div>
      )}

      <div className="mt-2">
        <SearchBar
          value={query}
          onChange={setQuery}
          placeholder={targetType === 'wine' ? '와인 이름으로 검색' : '식당 이름으로 검색'}
          variant={variant}
          autoFocus={false}
          recentSearches={recentSearches}
          onRecentSelect={handleRecentSelect}
          onRecentClear={clearRecentSearches}
        />
      </div>

      {screenState === 'idle' && (
        <>
          {targetType === 'restaurant' && (
            <NearbyList
              restaurants={nearbyRestaurants}
              isLoading={nearbyLoading}
              genre={nearbyGenre}
              radius={nearbyRadius}
              onGenreChange={handleGenreChange}
              onRadiusChange={handleRadiusChange}
              onSelect={(restaurantId) => {
                const r = nearbyRestaurants.find((n) => n.id === restaurantId)
                if (r) {
                  if (nearbyGenre) {
                    try { sessionStorage.setItem('nyam_genre_hint', nearbyGenre) } catch {}
                  }
                  handleSelect({
                    id: r.id,
                    type: 'restaurant',
                    name: r.name,
                    genre: r.genre,
                    genreDisplay: r.genre,
                    categoryPath: r.categoryPath,
                    area: r.area,
                    address: r.address,
                    distance: r.distance,
                    lat: r.lat,
                    lng: r.lng,
                    phone: null,
                    kakaoMapUrl: null,
                    hasRecord: r.hasRecord,
                  })
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
        aiCandidates={aiCandidates}
        isAiSearching={isAiSearching}
        isSelectingAi={isSelectingAi}
        onSelectAiCandidate={handleSelectAiCandidate}
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
