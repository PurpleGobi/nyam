'use client'

import { useCallback, useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import type { SearchResult, NearbyRestaurant } from '@/domain/entities/search'
import type { RecordTargetType } from '@/domain/entities/record'
import { useAuth } from '@/presentation/providers/auth-provider'
import { useSearch } from '@/application/hooks/use-search'
import { useCreateRecord } from '@/application/hooks/use-create-record'
import { RecordNav } from '@/presentation/components/record/record-nav'
import { SearchBar } from '@/presentation/components/search/search-bar'
import { SearchResults } from '@/presentation/components/search/search-results'
import { RecentSearches } from '@/presentation/components/search/recent-searches'
import { NearbyList } from '@/presentation/components/search/nearby-list'
import { SuccessScreen } from '@/presentation/components/add-flow/success-screen'

interface QuickAddSuccess {
  name: string
  meta: string
  type: RecordTargetType
  id: string
}

function SearchInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useAuth()
  const targetType = (searchParams.get('type') ?? 'restaurant') as RecordTargetType
  const variant = targetType === 'wine' ? 'wine' : 'restaurant'

  const [nearbyRestaurants, setNearbyRestaurants] = useState<NearbyRestaurant[]>([])
  const [nearbyLoading, setNearbyLoading] = useState(false)
  const [gps, setGps] = useState<{ lat: number; lng: number } | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [quickAddSuccess, setQuickAddSuccess] = useState<QuickAddSuccess | null>(null)
  const { createRecord } = useCreateRecord()

  useEffect(() => {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude }
        setGps(coords)
        if (targetType !== 'restaurant') return
        setNearbyLoading(true)
        fetch(`/api/restaurants/nearby?lat=${coords.lat}&lng=${coords.lng}&radius=2000`)
          .then((res) => res.json())
          .then((data) => setNearbyRestaurants(data.restaurants ?? []))
          .catch(() => {})
          .finally(() => setNearbyLoading(false))
      },
      () => setNearbyLoading(false),
      { enableHighAccuracy: true, timeout: 5000 },
    )
  }, [targetType])

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
    recentSearches,
    addRecentSearch,
    clearRecentSearches,
  } = useSearch({ targetType, lat: gps?.lat, lng: gps?.lng })

  const handleSelect = useCallback(
    async (result: SearchResult) => {
      addRecentSearch(query)
      const meta =
        result.type === 'restaurant'
          ? [result.genre, result.area].filter(Boolean).join(' · ')
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
        try {
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
            }),
          })
          const data = await res.json()
          if (data.id) targetId = data.id
        } catch {
          // INSERT 실패 시 외부 ID로 진행
        }
      }

      // 빠른추가: records INSERT (status='checked') → 성공 화면
      if (user) {
        try {
          await createRecord({
            userId: user.id,
            targetId,
            targetType: result.type,
            status: 'checked',
            wineStatus: result.type === 'wine' ? 'tasted' : undefined,
          })
          setQuickAddSuccess({ name: result.name, meta, type: result.type, id: targetId })
          return
        } catch {
          // 빠른추가 실패 시 기록 폼으로 폴백
        }
      }

      router.push(
        `/record?type=${result.type}&targetId=${targetId}&name=${encodeURIComponent(result.name)}&meta=${encodeURIComponent(meta)}&from=search`,
      )
    },
    [router, addRecentSearch, query, user, createRecord],
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

  // 빠른추가 성공 화면
  if (quickAddSuccess) {
    return (
      <SuccessScreen
        variant={quickAddSuccess.type === 'wine' ? 'wine' : 'food'}
        targetName={quickAddSuccess.name}
        targetMeta={quickAddSuccess.meta}
        onAddDetail={() => {
          const prefix = quickAddSuccess.type === 'wine' ? 'wines' : 'restaurants'
          router.push(`/${prefix}/${quickAddSuccess.id}`)
        }}
        onAddAnother={() => setQuickAddSuccess(null)}
        onGoHome={() => router.push('/')}
      />
    )
  }

  return (
    <div className="flex min-h-dvh flex-col bg-[var(--bg)]">
      <RecordNav
        title={targetType === 'wine' ? '와인 검색' : '식당 검색'}
        variant={targetType === 'wine' ? 'wine' : 'food'}
        onBack={() => router.back()}
        onClose={() => router.push('/')}
      />

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
                  handleSelect({
                    id: r.id,
                    type: 'restaurant',
                    name: r.name,
                    genre: r.genre,
                    area: r.area,
                    address: null,
                    distance: r.distance,
                    lat: null,
                    lng: null,
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
