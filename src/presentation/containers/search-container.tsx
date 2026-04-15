'use client'

import { useCallback, useState, useEffect, useRef, useMemo, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import dynamic from 'next/dynamic'
import { Search, X } from 'lucide-react'
import type { SearchResult } from '@/domain/entities/search'
import type { WineSearchCandidate } from '@/infrastructure/api/ai-recognition'
import type { RecordTargetType } from '@/domain/entities/record'
import type { FilterChipItem } from '@/domain/entities/condition-chip'
import type { MapDiscoveryItem } from '@/domain/entities/map-discovery'
import { MAP_FILTER_ATTRIBUTES } from '@/domain/entities/filter-config'
import { useSearch } from '@/application/hooks/use-search'
import { useMapDiscovery } from '@/application/hooks/use-map-discovery'
import { useAuth } from '@/presentation/providers/auth-provider'
import { AppHeader } from '@/presentation/components/layout/app-header'
import { FabBack } from '@/presentation/components/layout/fab-back'
import { SearchBar } from '@/presentation/components/search/search-bar'
import { SearchResults } from '@/presentation/components/search/search-results'
import { ConditionFilterBar } from '@/presentation/components/home/condition-filter-bar'

const MapView = dynamic(() => import('@/presentation/components/home/map-view').then(m => ({ default: m.MapView })), { ssr: false })

function SearchInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useAuth()
  const targetType = (searchParams.get('type') ?? 'restaurant') as RecordTargetType
  const variant = targetType === 'wine' ? 'wine' : 'restaurant'

  // URL params에 lat/lng가 있으면 (사진 EXIF GPS) 우선 사용
  const paramLat = searchParams.get('lat')
  const paramLng = searchParams.get('lng')
  const hasParamGps = paramLat != null && paramLng != null

  const [gps, setGps] = useState<{ lat: number; lng: number } | null>(
    hasParamGps ? { lat: Number(paramLat), lng: Number(paramLng) } : null,
  )
  const [toast, setToast] = useState<string | null>(null)
  const [mapChips, setMapChips] = useState<FilterChipItem[]>([])

  const filterBarRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // URL에서 이미 GPS를 받았으면 navigator 호출 스킵
    if (hasParamGps) return
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGps({ lat: pos.coords.latitude, lng: pos.coords.longitude })
      },
      () => {},
      { enableHighAccuracy: true, timeout: 5000 },
    )
  }, [hasParamGps])

  // 홈 지도뷰와 동일한 useMapDiscovery
  const mapDiscovery = useMapDiscovery({
    userId: user?.id ?? null,
    targets: [],
    userLat: gps?.lat ?? null,
    userLng: gps?.lng ?? null,
    mapChips,
    sortOption: 'distance',
  })

  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(null), 2500)
    return () => clearTimeout(timer)
  }, [toast])

  const initialQuery = searchParams.get('q') ?? ''

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
  } = useSearch({ targetType, lat: gps?.lat, lng: gps?.lng, initialQuery })

  // 검색 결과 선택 상태 (지도 연동)
  const [searchSelectedId, setSearchSelectedId] = useState<string | null>(null)

  // 텍스트 검색 후 panTo로 지도가 이동했을 때 bounds 갱신 억제
  const [suppressIdle, setSuppressIdle] = useState(false)
  // 검색 모드에서 마지막 맵 bounds 저장 (초기화 시 현재 위치에서 nearby 검색용)
  const lastMapIdleRef = useRef<{ center: { lat: number; lng: number }; zoom: number; bounds: { north: number; south: number; east: number; west: number } | null } | null>(null)

  // 검색 결과 → MapDiscoveryItem 변환 (지도 마커 표시용)
  const searchMapItems: MapDiscoveryItem[] = useMemo(() => {
    if (screenState === 'idle' || targetType !== 'restaurant') return []
    return results
      .filter((r): r is SearchResult & { type: 'restaurant'; lat: number; lng: number } =>
        r.type === 'restaurant' && r.lat != null && r.lng != null)
      .map((r) => ({
        id: r.id,
        kakaoId: r.id.startsWith('kakao_') ? r.id.replace('kakao_', '') : null,
        name: r.name,
        genre: r.genre,
        area: r.area,
        lat: r.lat,
        lng: r.lng,
        distanceKm: r.distance != null ? r.distance / 1000 : null,
        inNyamDb: !r.id.startsWith('kakao_') && !r.id.startsWith('naver_') && !r.id.startsWith('google_'),
        restaurantId: r.id.startsWith('kakao_') || r.id.startsWith('naver_') || r.id.startsWith('google_') ? null : r.id,
        myScore: null,
        followingScore: null,
        bubbleScore: null,
        nyamScore: null,
        googleRating: null,
        prestige: r.prestige ?? [],
        sources: [] as MapDiscoveryItem['sources'],
      }))
  }, [results, screenState, targetType])

  // 검색어 변경 시 선택 초기화 + 빈 문자열이면 현재 지도 위치에서 nearby 검색
  const setQueryWithReset = useCallback((q: string) => {
    setQuery(q)
    setSearchSelectedId(null)
    if (q === '' && lastMapIdleRef.current) {
      const { center, zoom, bounds } = lastMapIdleRef.current
      mapDiscovery.onMapIdle(center, zoom, bounds)
    }
  }, [setQuery, mapDiscovery])

  const handleSelect = useCallback(
    async (result: SearchResult) => {
      addRecentSearch(query)
      const meta =
        result.type === 'restaurant'
          ? [result.genreDisplay, result.area].filter(Boolean).join(' · ')
          : [result.wineType, result.region, result.vintage].filter(Boolean).join(' · ')

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

      let recordUrl = `/record?type=${result.type}&targetId=${targetId}&name=${encodeURIComponent(result.name)}&meta=${encodeURIComponent(meta)}&from=search`

      if (result.type === 'wine') {
        if (result.vintage) recordUrl += `&vintage=${result.vintage}`
        if (result.producer) recordUrl += `&producer=${encodeURIComponent(result.producer)}`
      }

      router.push(recordUrl)
    },
    [router, addRecentSearch, query],
  )

  const handleMapNavigate = useCallback((item: MapDiscoveryItem) => {
    if (item.genre) {
      try { sessionStorage.setItem('nyam_genre_hint', item.genre) } catch {}
    }
    handleSelect({
      id: item.restaurantId ?? item.id,
      type: 'restaurant',
      name: item.name,
      genre: item.genre,
      genreDisplay: item.genre,
      categoryPath: null,
      area: item.area,
      address: null,
      distance: item.distanceKm != null ? item.distanceKm * 1000 : null,
      lat: item.lat,
      lng: item.lng,
      phone: null,
      kakaoMapUrl: null,
      hasRecord: false,
      prestige: item.prestige,
    })
  }, [handleSelect])

  const handleRecentSelect = useCallback(
    (q: string) => {
      setQueryWithReset(q)
    },
    [setQueryWithReset],
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
        candidate.country,
      ].filter(Boolean).join(' · ')
      let recordUrl = `/record?type=wine&targetId=${wine.id}&name=${encodeURIComponent(wine.name)}&meta=${encodeURIComponent(meta)}&from=search`
      if (candidate.vintage) recordUrl += `&vintage=${candidate.vintage}`
      if (candidate.producer) recordUrl += `&producer=${encodeURIComponent(candidate.producer)}`
      router.push(recordUrl)
    },
    [router, addRecentSearch, query, selectAiCandidate],
  )

  const handleRegister = useCallback(() => {
    router.push(`/register?type=${targetType}&name=${encodeURIComponent(query)}`)
  }, [router, targetType, query])

  return (
    <div className="content-detail flex h-dvh flex-col overflow-hidden bg-[var(--bg)]">
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

      {targetType !== 'restaurant' && (
        <div className="mt-2">
          <SearchBar
            value={query}
            onChange={setQueryWithReset}
            placeholder="와인 이름으로 검색"
            variant={variant}
            autoFocus={false}
            recentSearches={recentSearches}
            onRecentSelect={handleRecentSelect}
            onRecentClear={clearRecentSearches}
          />
        </div>
      )}

      {targetType === 'restaurant' && (
        <div className="flex min-h-0 flex-1 flex-col py-1">
          <div ref={filterBarRef} className="flex items-center gap-2 pr-4" style={{ zIndex: 50, backgroundColor: 'var(--bg)', flexShrink: 0 }}>
            {screenState === 'idle' && (
              <div className="min-w-0 shrink-0">
                <ConditionFilterBar
                  chips={mapChips}
                  onChipsChange={setMapChips}
                  attributes={MAP_FILTER_ATTRIBUTES}
                  accentType="food"
                />
              </div>
            )}
            <div className="ml-auto flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-2.5" style={{ height: '32px', minWidth: '140px', maxWidth: '200px' }}>
              <Search size={14} className="shrink-0 text-[var(--text-hint)]" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQueryWithReset(e.target.value)}
                placeholder="식당 검색"
                className="min-w-0 flex-1 bg-transparent text-[13px] text-[var(--text)] outline-none placeholder:text-[var(--text-hint)]"
              />
              {query.length > 0 && (
                <button type="button" onClick={() => setQueryWithReset('')} className="shrink-0 text-[var(--text-hint)]">
                  <X size={12} />
                </button>
              )}
            </div>
          </div>
          <MapView
            items={screenState === 'idle' ? mapDiscovery.pageItems : searchMapItems}
            onMapIdle={(center, zoom, bounds) => {
              lastMapIdleRef.current = { center, zoom, bounds }
              if (screenState !== 'idle' && suppressIdle) {
                setSuppressIdle(false)
                return
              }
              if (screenState !== 'idle') {
                return
              }
              mapDiscovery.onMapIdle(center, zoom, bounds)
            }}
            onItemSelect={() => { if (screenState !== 'idle') setSuppressIdle(true) }}
            onItemNavigate={handleMapNavigate}
            isNearbyLoading={screenState === 'idle' && mapDiscovery.isNearbyLoading}
            currentPage={screenState === 'idle' ? mapDiscovery.currentPage : 1}
            totalPages={screenState === 'idle' ? mapDiscovery.totalPages : 1}
            onPageChange={mapDiscovery.setPage}
            userLat={gps?.lat}
            userLng={gps?.lng}
            radius={50}
            stickyTop="0px"
            splitLayout
            hideList={screenState === 'searching' || screenState === 'typing'}
            externalSelectedId={screenState !== 'idle' ? searchSelectedId : undefined}
            onExternalSelect={screenState !== 'idle' ? setSearchSelectedId : undefined}
            disablePanOnSelect={screenState === 'idle'}
            navigateOnFirstClick={screenState !== 'idle'}
            listFooter={
              <>
                {/* 검색 중 로딩 */}
                {(screenState === 'searching' || screenState === 'typing') && searchMapItems.length === 0 && (
                  <div className="flex flex-col items-center py-8">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--text-hint)] border-t-transparent" />
                    <p className="mt-3 text-[12px]" style={{ color: 'var(--text-hint)' }}>검색 중...</p>
                  </div>
                )}
                {/* 검색 결과 없음 */}
                {screenState === 'empty' && (
                  <div className="flex flex-col items-center py-8">
                    <p className="text-[13px]" style={{ color: 'var(--text-hint)' }}>검색 결과가 없습니다</p>
                  </div>
                )}
                {/* 직접 등록 버튼 */}
                <div className="px-1 pt-2 pb-4">
                  <button
                    type="button"
                    onClick={() => screenState === 'idle'
                      ? router.push('/register?type=restaurant')
                      : handleRegister()}
                    className="flex w-full items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-[var(--border)] px-4 py-3 text-[13px] text-[var(--text-hint)]"
                  >
                    목록에 없나요? 직접 등록하기
                  </button>
                </div>
              </>
            }
          />
        </div>
      )}

      {targetType !== 'restaurant' && (
        <div className="min-h-0 flex-1 overflow-y-auto">
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
      )}
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
