'use client'

import { useState, useCallback, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, Search, Loader2, Sparkles, Heart, MapPin, Send, Navigation, Trophy } from 'lucide-react'
import { DISCOVER_AREAS } from '@/domain/entities/discover'
import type { DiscoverArea } from '@/domain/entities/discover'
import { GENRE_MAJOR_CATEGORIES } from '@/domain/entities/restaurant'
import { useAuth } from '@/presentation/providers/auth-provider'
import { wishlistRepo } from '@/shared/di/container'
import { useWishlist } from '@/application/hooks/use-wishlist'
import type { ScoreBreakdown } from '@/domain/services/discover-scoring'
import { formatBreakdownText } from '@/domain/services/discover-scoring'
import { AppHeader } from '@/presentation/components/layout/app-header'
import { FabBack } from '@/presentation/components/layout/fab-back'

// ─── Types ───

interface DiscoverRestaurant {
  id: string
  name: string
  address: string
  lat: number | null
  lng: number | null
  googleRating: number | null
  googleRatingCount: number | null
  googlePlaceId: string
}

interface RankedInfo {
  googleRating: number | null
  breakdown: ScoreBreakdown
}

interface AiAnalysis {
  taste: string
  atmosphere: string
  tips: string
  priceRange: string
  recommendedDishes: string[]
  summary: string
}

interface AiRecommendation {
  answer: string
  picks: Array<{ name: string; reason: string }>
}

// ─── Chip ───

function Chip({ label, active, onClick, color }: { label: string; active: boolean; onClick: () => void; color?: string }) {
  const bg = active ? (color ?? 'var(--accent-food)') : 'var(--bg-card)'
  const fg = active ? '#FFFFFF' : 'var(--text-sub)'
  const border = active ? (color ?? 'var(--accent-food)') : 'var(--border)'
  return (
    <button
      type="button"
      onClick={onClick}
      className="shrink-0 rounded-full text-[13px] font-semibold transition-all active:scale-95"
      style={{ padding: '6px 14px', backgroundColor: bg, color: fg, border: `1.5px solid ${border}` }}
    >
      {label}
    </button>
  )
}

// ─── Main ───

export function DiscoverContainer() {
  const router = useRouter()
  const { user } = useAuth()

  // §1 지역 (다중 선택)
  const [selectedAreas, setSelectedAreas] = useState<Set<string>>(new Set())
  const [customArea, setCustomArea] = useState('')
  const [useNearby, setUseNearby] = useState(false)
  const [gps, setGps] = useState<{ lat: number; lng: number } | null>(null)

  // §2 음식 종류 (다중 선택)
  const [selectedGenres, setSelectedGenres] = useState<Set<string>>(new Set())

  // Results
  const [restaurants, setRestaurants] = useState<DiscoverRestaurant[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)

  // AI ranking
  const [rankedMap, setRankedMap] = useState<Record<string, RankedInfo>>({})
  const [isRanking, setIsRanking] = useState(false)
  const [isRanked, setIsRanked] = useState(false)

  // AI recommend (natural language)
  const [aiQuery, setAiQuery] = useState('')
  const [isRecommending, setIsRecommending] = useState(false)
  const [recommendation, setRecommendation] = useState<AiRecommendation | null>(null)

  // Detail
  const [analyzingId, setAnalyzingId] = useState<string | null>(null)
  const [analyses, setAnalyses] = useState<Record<string, AiAnalysis>>({})
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const toggleArea = useCallback((area: string) => {
    setSelectedAreas((prev) => {
      const next = new Set(prev)
      if (next.has(area)) next.delete(area); else next.add(area)
      return next
    })
    setUseNearby(false)
    setCustomArea('')
  }, [])

  const toggleGenre = useCallback((genre: string) => {
    setSelectedGenres((prev) => {
      const next = new Set(prev)
      if (next.has(genre)) next.delete(genre); else next.add(genre)
      return next
    })
  }, [])

  // 검색 쿼리 조합
  const areaQuery = useNearby ? '' : (customArea.trim() || [...selectedAreas].join(' '))
  const genreQuery = [...selectedGenres].join(' ')
  const hasFilter = useNearby ? true : (areaQuery.length > 0)

  // GPS
  useEffect(() => {
    if (!useNearby) return
    navigator.geolocation?.getCurrentPosition(
      (pos) => setGps({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setUseNearby(false),
      { enableHighAccuracy: true, timeout: 5000 },
    )
  }, [useNearby])

  // Fetch restaurants
  const fetchRestaurants = useCallback(async () => {
    if (!hasFilter) return
    setIsLoading(true)
    setHasSearched(true)
    setIsRanked(false)
    setRankedMap({})
    setRecommendation(null)
    try {
      const params = new URLSearchParams()
      if (useNearby && gps) {
        params.set('area', '맛집')
        params.set('lat', String(gps.lat))
        params.set('lng', String(gps.lng))
      } else {
        params.set('area', areaQuery)
      }
      if (genreQuery) params.set('genre', genreQuery)
      const res = await fetch(`/api/discover/search?${params}`)
      const data = await res.json()
      setRestaurants(data.restaurants ?? [])
    } catch {
      setRestaurants([])
    } finally {
      setIsLoading(false)
    }
  }, [hasFilter, useNearby, gps, areaQuery, genreQuery])

  useEffect(() => {
    if (hasFilter) fetchRestaurants()
  }, [areaQuery, genreQuery]) // eslint-disable-line react-hooks/exhaustive-deps

  // nearby + gps ready → fetch
  useEffect(() => {
    if (useNearby && gps) fetchRestaurants()
  }, [gps]) // eslint-disable-line react-hooks/exhaustive-deps

  // AI 추천순위 받기
  const handleAiRank = useCallback(async () => {
    if (restaurants.length === 0) return
    setIsRanking(true)
    try {
      const res = await fetch('/api/discover/ai-rank', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restaurants: restaurants.slice(0, 30).map((r) => ({ name: r.name, address: r.address, googleRating: r.googleRating })),
          area: areaQuery,
        }),
      })
      const data = await res.json()
      if (data.success && data.ranked) {
        const map: Record<string, RankedInfo> = {}
        for (const r of data.ranked) {
          map[r.name] = { googleRating: r.googleRating, breakdown: r.breakdown }
        }
        setRankedMap(map)
        setIsRanked(true)
      }
    } catch {} finally {
      setIsRanking(false)
    }
  }, [restaurants, areaQuery, genreQuery])

  // AI 자연어 추천
  const handleAiRecommend = useCallback(async () => {
    if (!aiQuery.trim() || !isRanked) return
    setIsRecommending(true)
    setRecommendation(null)
    try {
      const rankedList = sortedRestaurants.slice(0, 20).map((r) => ({
        name: r.name,
        score: rankedMap[r.name]?.breakdown.total ?? 50,
        reason: rankedMap[r.name] ? formatBreakdownText(rankedMap[r.name].breakdown) : '',
      }))
      const res = await fetch('/api/discover/ai-recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: aiQuery, restaurants: rankedList, area: areaQuery }),
      })
      const data = await res.json()
      if (data.success) {
        setRecommendation({ answer: data.answer, picks: data.picks ?? [] })
      }
    } catch {} finally {
      setIsRecommending(false)
    }
  }, [aiQuery, isRanked, areaQuery]) // eslint-disable-line react-hooks/exhaustive-deps

  // Sort: ranked → score순, unranked → 원본순
  const sortedRestaurants = useMemo(() => {
    if (!isRanked) return restaurants
    return [...restaurants].sort((a, b) => {
      const sa = rankedMap[a.name]?.breakdown.total ?? 0
      const sb = rankedMap[b.name]?.breakdown.total ?? 0
      return sb - sa
    })
  }, [restaurants, rankedMap, isRanked])

  // Analyze single
  const handleAnalyze = useCallback(async (r: DiscoverRestaurant) => {
    if (analyses[r.id]) { setExpandedId(expandedId === r.id ? null : r.id); return }
    setAnalyzingId(r.id)
    setExpandedId(r.id)
    try {
      const res = await fetch('/api/discover/ai-analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ restaurantName: r.name, area: areaQuery }),
      })
      const data = await res.json()
      if (data.success) setAnalyses((prev) => ({ ...prev, [r.id]: data.analysis }))
    } catch {} finally { setAnalyzingId(null) }
  }, [analyses, expandedId])

  // Record
  const handleRecord = useCallback(async (r: DiscoverRestaurant) => {
    let targetId = r.id
    try {
      const res = await fetch('/api/restaurants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: r.name, address: r.address, lat: r.lat, lng: r.lng }),
      })
      const data = await res.json()
      if (data.id) targetId = data.id
    } catch {}
    router.push(`/record?type=restaurant&targetId=${targetId}&name=${encodeURIComponent(r.name)}&from=discover`)
  }, [router])

  const genreKeys = useMemo(() => Object.keys(GENRE_MAJOR_CATEGORIES), [])

  return (
    <div className="content-feed flex min-h-dvh flex-col bg-[var(--bg)]">
      <AppHeader />
      <FabBack />

      {/* §1 지역 */}
      <section className="px-4 pt-4 pb-2">
        <p className="mb-2" style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-sub)' }}>지역</p>
        <div className="flex flex-wrap gap-2">
          {DISCOVER_AREAS.map((area) => (
            <Chip
              key={area}
              label={area}
              active={selectedAreas.has(area) && !useNearby}
              onClick={() => toggleArea(area)}
            />
          ))}
          {/* 내 근처 */}
          <button
            type="button"
            onClick={() => { setUseNearby(!useNearby); setSelectedAreas(new Set()); setCustomArea('') }}
            className="flex shrink-0 items-center gap-1 rounded-full text-[13px] font-semibold transition-all active:scale-95"
            style={{
              padding: '6px 14px',
              backgroundColor: useNearby ? 'var(--accent-food)' : 'var(--bg-card)',
              color: useNearby ? '#FFFFFF' : 'var(--text-sub)',
              border: `1.5px solid ${useNearby ? 'var(--accent-food)' : 'var(--border)'}`,
            }}
          >
            <Navigation size={12} /> 내 근처
          </button>
        </div>
        {/* 직접 입력 */}
        <div className="mt-2">
          <input
            type="text"
            value={customArea}
            onChange={(e) => { setCustomArea(e.target.value); setSelectedAreas(new Set()); setUseNearby(false) }}
            onKeyDown={(e) => { if (e.key === 'Enter' && customArea.trim()) fetchRestaurants() }}
            placeholder="구/동 직접 입력 (예: 역삼동, 마포구)"
            className="w-full rounded-lg bg-transparent px-3 text-[13px] outline-none"
            style={{ height: '36px', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text)' }}
          />
        </div>
      </section>

      {/* §2 음식 종류 */}
      <section className="px-4 pb-3">
        <p className="mb-2" style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-sub)' }}>음식 종류</p>
        <div className="flex flex-wrap gap-2">
          {genreKeys.map((major) => (
            <Chip key={major} label={major} active={selectedGenres.has(major)} onClick={() => toggleGenre(major)} />
          ))}
        </div>
      </section>

      {/* Divider */}
      <div style={{ height: '1px', backgroundColor: 'var(--border)' }} />

      {/* AI 추천순위 버튼 */}
      {hasFilter && !isLoading && restaurants.length > 0 && !isRanked && (
        <div className="px-4 py-3">
          <button
            type="button"
            onClick={handleAiRank}
            disabled={isRanking}
            className="flex w-full items-center justify-center gap-2 rounded-xl py-3 transition-opacity"
            style={{
              backgroundColor: 'var(--accent-food)',
              color: '#FFFFFF',
              fontSize: '14px',
              fontWeight: 700,
              opacity: isRanking ? 0.6 : 1,
            }}
          >
            {isRanking ? <Loader2 size={16} className="animate-spin" /> : <Trophy size={16} />}
            {isRanking ? 'AI가 평점/수상을 분석 중...' : 'AI 추천순위 받기'}
          </button>
        </div>
      )}

      {/* AI 자연어 검색 — 랭킹 완료 후 활성화 */}
      {isRanked && (
        <div className="px-4 pb-3">
          {/* AI recommendation result */}
          {recommendation && (
            <div className="mb-3 rounded-xl p-3" style={{ backgroundColor: 'color-mix(in srgb, var(--accent-food) 8%, transparent)', border: '1px solid color-mix(in srgb, var(--accent-food) 20%, transparent)' }}>
              <p style={{ fontSize: '14px', color: 'var(--text)', lineHeight: 1.6 }}>{recommendation.answer}</p>
              {recommendation.picks.length > 0 && (
                <div className="mt-2 flex flex-col gap-1.5">
                  {recommendation.picks.map((pick) => (
                    <div key={pick.name} className="flex items-start gap-2">
                      <Sparkles size={12} className="mt-0.5 shrink-0" style={{ color: 'var(--accent-food)' }} />
                      <p style={{ fontSize: '13px', color: 'var(--text)' }}>
                        <strong>{pick.name}</strong> — {pick.reason}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          <div
            className="flex items-center gap-2 rounded-xl px-3"
            style={{ height: '44px', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}
          >
            <Sparkles size={16} style={{ color: 'var(--accent-food)' }} />
            <input
              type="text"
              value={aiQuery}
              onChange={(e) => setAiQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleAiRecommend() }}
              placeholder="AI에게 물어보세요 (예: 조용한 분위기의 파스타집)"
              className="flex-1 bg-transparent text-[13px] outline-none"
              style={{ color: 'var(--text)' }}
            />
            {aiQuery && (
              <button type="button" onClick={handleAiRecommend} disabled={isRecommending}>
                {isRecommending
                  ? <Loader2 size={16} className="animate-spin" style={{ color: 'var(--accent-food)' }} />
                  : <Send size={16} style={{ color: 'var(--accent-food)' }} />
                }
              </button>
            )}
          </div>
        </div>
      )}

      {/* Results */}
      {!hasFilter && (
        <div className="flex flex-1 flex-col items-center justify-center px-4 py-12">
          <MapPin size={36} style={{ color: 'var(--text-hint)' }} />
          <p className="mt-3" style={{ fontSize: '14px', color: 'var(--text-sub)', textAlign: 'center' }}>지역을 선택하면 맛집을 찾아드려요</p>
        </div>
      )}

      {isLoading && (
        <div className="flex flex-1 items-center justify-center py-12">
          <Loader2 size={24} className="animate-spin" style={{ color: 'var(--text-hint)' }} />
        </div>
      )}

      {hasFilter && !isLoading && hasSearched && restaurants.length === 0 && (
        <div className="flex flex-1 flex-col items-center justify-center px-4 py-12">
          <Search size={36} style={{ color: 'var(--text-hint)' }} />
          <p className="mt-3" style={{ fontSize: '14px', color: 'var(--text-sub)' }}>검색 결과가 없어요</p>
        </div>
      )}

      {hasFilter && !isLoading && sortedRestaurants.length > 0 && (
        <div className="flex flex-col gap-3 px-4 py-3">
          <p style={{ fontSize: '12px', color: 'var(--text-hint)' }}>
            {sortedRestaurants.length}개 결과{isRanked ? ' · AI 추천순' : ''}
          </p>
          {sortedRestaurants.map((r, idx) => (
            <RestaurantItem
              key={r.id}
              restaurant={r}
              rank={isRanked ? idx + 1 : null}
              rankInfo={rankedMap[r.name] ?? null}
              isExpanded={expandedId === r.id}
              isAnalyzing={analyzingId === r.id}
              analysis={analyses[r.id] ?? null}
              onAnalyze={() => handleAnalyze(r)}
              onRecord={() => handleRecord(r)}
              onToggle={() => setExpandedId(expandedId === r.id ? null : r.id)}
              userId={user?.id ?? null}
            />
          ))}
        </div>
      )}

      <div style={{ height: '80px' }} />
    </div>
  )
}

// ─── Restaurant Item ───

function RestaurantItem({
  restaurant, rank, rankInfo, isExpanded, isAnalyzing, analysis, onAnalyze, onRecord, onToggle, userId,
}: {
  restaurant: DiscoverRestaurant; rank: number | null; rankInfo: RankedInfo | null
  isExpanded: boolean; isAnalyzing: boolean; analysis: AiAnalysis | null
  onAnalyze: () => void; onRecord: () => void; onToggle: () => void; userId: string | null
}) {
  return (
    <div className="overflow-hidden rounded-xl" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
      <button type="button" onClick={onToggle} className="flex w-full items-center gap-3 px-4 py-3 text-left">
        {/* Rank badge */}
        {rank && (
          <span
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[12px] font-bold"
            style={{
              backgroundColor: rank <= 3 ? 'var(--accent-food)' : 'var(--bg-elevated)',
              color: rank <= 3 ? '#FFFFFF' : 'var(--text-sub)',
            }}
          >
            {rank}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate" style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text)' }}>{restaurant.name}</p>
            {rankInfo && (
              <span style={{ fontSize: '15px', fontWeight: 800, color: 'var(--accent-food)' }}>{rankInfo.breakdown.total}</span>
            )}
          </div>
          {restaurant.address && <p className="mt-0.5 truncate" style={{ fontSize: '12px', color: 'var(--text-sub)' }}>{restaurant.address}</p>}
          {/* Google rating (항상 표시) */}
          {!rankInfo && restaurant.googleRating && (
            <div className="mt-1">
              <RatingPill label="G" value={restaurant.googleRating} />
              {restaurant.googleRatingCount && (
                <span className="ml-1 text-[11px]" style={{ color: 'var(--text-hint)' }}>({restaurant.googleRatingCount})</span>
              )}
            </div>
          )}
          {/* Rating + Awards */}
          {rankInfo && (
            <div className="mt-1 flex flex-wrap gap-1">
              {rankInfo.googleRating && <RatingPill label="G" value={rankInfo.googleRating} score={rankInfo.breakdown.googleScore} />}
              {rankInfo.breakdown.accolades.map((a, i) => (
                <TagPill
                  key={i}
                  label={`${a.source}${a.detail ? ` ${a.detail}` : ''}`}
                  color={a.prestigeTier === 'S' ? '#EF4444' : a.prestigeTier === 'A' ? '#3B82F6' : '#059669'}
                />
              ))}
              {rankInfo.breakdown.accoladeScore > 0 && (
                <TagPill label={`수상 +${rankInfo.breakdown.accoladeScore}`} color="#8B5CF6" />
              )}
            </div>
          )}
        </div>
        <ChevronLeft size={16} style={{ color: 'var(--text-hint)', transform: isExpanded ? 'rotate(-90deg)' : 'rotate(180deg)', transition: 'transform 0.2s' }} />
      </button>

      {isExpanded && (
        <div className="border-t border-[var(--border)] px-4 py-3">
          {rankInfo && (
            <p className="mb-2" style={{ fontSize: '12px', color: 'var(--text-hint)' }}>
              점수 산출: {formatBreakdownText(rankInfo.breakdown)} = {rankInfo.breakdown.total}점
            </p>
          )}
          <div className="flex gap-2">
            <button type="button" onClick={onAnalyze} disabled={isAnalyzing}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2.5"
              style={{ fontSize: '13px', fontWeight: 600, backgroundColor: 'color-mix(in srgb, var(--accent-food) 10%, transparent)', color: 'var(--accent-food)' }}>
              {isAnalyzing ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />} AI 분석
            </button>
            <button type="button" onClick={onRecord}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2.5"
              style={{ fontSize: '13px', fontWeight: 600, backgroundColor: 'var(--accent-food)', color: '#FFFFFF' }}>
              기록하기
            </button>
            {userId && <WishlistBtn userId={userId} restaurant={restaurant} />}
          </div>

          {analysis && (
            <div className="mt-3 flex flex-col gap-2.5">
              <AnalysisRow label="한줄 평가" value={analysis.summary} />
              <AnalysisRow label="맛" value={analysis.taste} />
              <AnalysisRow label="분위기" value={analysis.atmosphere} />
              <AnalysisRow label="꿀팁" value={analysis.tips} />
              <AnalysisRow label="가격대" value={analysis.priceRange} />
              {analysis.recommendedDishes.length > 0 && (
                <div>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-sub)' }}>추천 메뉴</span>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {analysis.recommendedDishes.map((d) => (
                      <span key={d} className="rounded-full px-2.5 py-1" style={{ fontSize: '12px', fontWeight: 500, backgroundColor: 'var(--bg-elevated)', color: 'var(--text)' }}>{d}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="mt-3 flex gap-2">
            <PortalLink label="구글맵" url={`https://www.google.com/maps/place/?q=place_id:${restaurant.googlePlaceId}`} />
            <PortalLink label="네이버" url={`https://search.naver.com/search.naver?query=${encodeURIComponent(restaurant.name)}`} />
            <PortalLink label="카카오" url={`https://map.kakao.com/?q=${encodeURIComponent(restaurant.name)}`} />
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Small components ───

function RatingPill({ label, value, score }: { label: string; value: number; score?: number }) {
  return (
    <span className="rounded px-1.5 py-0.5 text-[11px] font-semibold" style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-sub)', border: '1px solid var(--border)' }}>
      {label} {value.toFixed(1)}{score != null ? ` (+${score})` : ''}
    </span>
  )
}

function TagPill({ label, color, score }: { label: string; color: string; score?: number }) {
  return (
    <span className="rounded px-1.5 py-0.5 text-[11px] font-bold" style={{ backgroundColor: `${color}15`, color, border: `1px solid ${color}30` }}>
      {label}{score != null ? ` +${score}` : ''}
    </span>
  )
}

function AnalysisRow({ label, value }: { label: string; value: string }) {
  if (!value || value === '정보 없음') return null
  return (
    <div>
      <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-sub)' }}>{label}</span>
      <p className="mt-0.5" style={{ fontSize: '13px', color: 'var(--text)', lineHeight: 1.5 }}>{value}</p>
    </div>
  )
}

function PortalLink({ label, url }: { label: string; url: string }) {
  return (
    <a href={url} target="_blank" rel="noopener noreferrer"
      className="flex-1 rounded-lg py-2 text-center"
      style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-sub)', backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
      {label}
    </a>
  )
}

function WishlistBtn({ userId, restaurant }: { userId: string; restaurant: DiscoverRestaurant }) {
  const [dbId, setDbId] = useState<string | null>(restaurant.id.startsWith('google_') ? null : restaurant.id)
  const { isWishlisted, toggle } = useWishlist(userId, dbId ?? '__none__', 'restaurant', wishlistRepo)

  const handleToggle = useCallback(async () => {
    if (!dbId) {
      try {
        const res = await fetch('/api/restaurants', { method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: restaurant.name, address: restaurant.address, lat: restaurant.lat, lng: restaurant.lng }) })
        const data = await res.json()
        if (data.id) setDbId(data.id)
      } catch {}
      return
    }
    toggle()
  }, [dbId, toggle, restaurant])

  useEffect(() => {
    if (dbId && !isWishlisted && dbId !== restaurant.id) toggle()
  }, [dbId]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <button type="button" onClick={handleToggle} className="flex items-center justify-center rounded-lg"
      style={{ width: '44px', backgroundColor: isWishlisted ? 'color-mix(in srgb, var(--negative) 10%, transparent)' : 'var(--bg-elevated)', border: `1px solid ${isWishlisted ? 'var(--negative)' : 'var(--border)'}` }}>
      <Heart size={16} fill={isWishlisted ? 'var(--negative)' : 'none'} style={{ color: isWishlisted ? 'var(--negative)' : 'var(--text-hint)' }} />
    </button>
  )
}
