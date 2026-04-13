'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import type { RecordTargetType } from '@/domain/entities/record'
import type { HomeTarget } from '@/domain/entities/home-target'
import type { HomeTab } from '@/domain/entities/home-state'
import { type HomeViewType, type HomeDbFilters, ALL_HOME_VIEWS } from '@/domain/repositories/home-repository'
import type { SortOption } from '@/domain/entities/saved-filter'
import { computeBubbleConfidence } from '@/domain/services/score-fallback'
import { homeRepo, predictionRepo } from '@/shared/di/container'

export function useHomeTargets(params: {
  userId: string | null
  tab: HomeTab
  viewTypes: HomeViewType[]
  socialFilter?: {
    followingUserId?: string | null
    bubbleId?: string | null
  }
  dbFilters?: HomeDbFilters
  sort?: SortOption
  limit?: number | null
  offset?: number
}): {
  targets: HomeTarget[]
  hasMore: boolean
  isLoading: boolean
} {
  const { userId, tab, viewTypes, socialFilter, dbFilters, sort, limit, offset } = params
  const [allTargets, setAllTargets] = useState<HomeTarget[]>([])
  const [hasMore, setHasMore] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  // 탭별 캐시 (stale-while-revalidate)
  const cacheRef = useRef<Map<string, HomeTarget[]>>(new Map())

  // viewTypes 배열의 안정적 비교를 위한 직렬화 키
  const viewTypesKey = useMemo(() => JSON.stringify(viewTypes.slice().sort()), [viewTypes])
  const socialFilterKey = useMemo(() => {
    if (!socialFilter) return ''
    return `${socialFilter.followingUserId ?? ''}:${socialFilter.bubbleId ?? ''}`
  }, [socialFilter])

  const dbFiltersKey = useMemo(() => JSON.stringify(dbFilters ?? {}), [dbFilters])

  const fetchTargets = useCallback(async () => {
    if (!userId || tab === 'bubble') return
    const targetType: RecordTargetType = tab
    const views: HomeViewType[] = viewTypes.length > 0 ? viewTypes : ALL_HOME_VIEWS

    const cacheKey = `${tab}:${viewTypesKey}:${socialFilterKey}:${dbFiltersKey}:${sort ?? ''}:${limit ?? ''}:${offset ?? 0}`
    const cached = cacheRef.current.get(cacheKey)

    // 즉시 탭 전환: 캐시 히트 -> 캐시 데이터 표시, 미스 -> 빈 배열
    setAllTargets(cached ?? [])
    setIsLoading(!cached)

    try {
      const sf = socialFilter ? {
        followingUserIds: socialFilter.followingUserId ? [socialFilter.followingUserId] : undefined,
        bubbleIds: socialFilter.bubbleId ? [socialFilter.bubbleId] : undefined,
      } : undefined

      const result = await homeRepo.findHomeTargets(userId, targetType, views, sf, dbFilters, sort, limit ?? null, offset ?? 0)

      // Nyam 점수 batch enrich (내 점수가 없는 target만)
      const needPrediction = result.targets.filter((t) => t.myScore === null)
      if (needPrediction.length > 0) {
        try {
          const category = targetType === 'restaurant' ? 'restaurant' : 'wine'
          const predictions = await predictionRepo.batchPredict(
            userId,
            needPrediction.map((t) => t.targetId),
            category,
          )
          for (const t of result.targets) {
            const pred = predictions.get(t.targetId)
            if (pred) {
              t.nyamScore = Math.round(pred.satisfaction)
              t.nyamConfidence = pred.confidence
            }
          }
        } catch {
          // batch predict 실패해도 기본 데이터는 표시
        }
      }

      // 버블 확신도 enrich (bubbleScore가 있는 target만)
      for (const t of result.targets) {
        if (t.bubbleScore !== null) {
          // bubble source records 수 = visitCount 기반 heuristic은 부정확
          // 여기서는 bubbleScore가 존재하면 기본 확신도 부여 (상세 페이지에서 정확한 값 표시)
          t.bubbleConfidence = computeBubbleConfidence(1) // 최소 1명 이상 기록
        }
      }

      cacheRef.current.set(cacheKey, result.targets)
      setHasMore(result.hasMore)
      // 캐시와 동일한 데이터면 re-render 방지
      if (!cached || result.targets.length !== cached.length || result.targets.some((t, i) => t.targetId !== cached[i]?.targetId)) {
        setAllTargets(result.targets)
      }
    } catch {
      if (!cached) setAllTargets([])
    } finally {
      setIsLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, tab, viewTypesKey, socialFilterKey, dbFiltersKey, sort, limit, offset])

  useEffect(() => {
    fetchTargets()
  }, [fetchTargets])

  return { targets: allTargets, hasMore, isLoading }
}
