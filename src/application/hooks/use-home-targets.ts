'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import type { RecordTargetType } from '@/domain/entities/record'
import type { HomeTarget } from '@/domain/entities/home-target'
import type { HomeTab } from '@/domain/entities/home-state'
import { type HomeDbFilters, ALL_HOME_VIEWS } from '@/domain/repositories/home-repository'
import type { SortOption } from '@/domain/entities/saved-filter'
import { computeBubbleConfidence } from '@/domain/services/score-fallback'
import { homeRepo, predictionRepo } from '@/shared/di/container'

export function useHomeTargets(params: {
  userId: string | null
  tab: HomeTab
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
  const { userId, tab, socialFilter, dbFilters, sort, limit, offset } = params
  const [allTargets, setAllTargets] = useState<HomeTarget[]>([])
  const [hasMore, setHasMore] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  // 탭별 캐시 (stale-while-revalidate)
  const cacheRef = useRef<Map<string, HomeTarget[]>>(new Map())
  const prevTabRef = useRef(tab)

  const socialFilterKey = useMemo(() => {
    if (!socialFilter) return ''
    return `${socialFilter.followingUserId ?? ''}:${socialFilter.bubbleId ?? ''}`
  }, [socialFilter])

  const dbFiltersKey = useMemo(() => JSON.stringify(dbFilters ?? {}), [dbFilters])

  const fetchTargets = useCallback(async () => {
    if (!userId || tab === 'bubble') return
    const targetType: RecordTargetType = tab
    // 항상 ALL views fetch — view 칩 변경은 클라이언트 필터링으로 처리 (서버 왕복 0ms)
    const views = ALL_HOME_VIEWS

    const cacheKey = `${tab}:${socialFilterKey}:${dbFiltersKey}:${sort ?? ''}:${limit ?? ''}:${offset ?? 0}`
    const cached = cacheRef.current.get(cacheKey)

    // 탭 전환 → 즉시 클리어 (잔상 방지), 같은 탭 내 필터 변경 → 이전 데이터 유지
    const tabChanged = prevTabRef.current !== tab
    prevTabRef.current = tab

    if (cached) {
      setAllTargets(cached)
      setIsLoading(false)
    } else if (tabChanged) {
      setAllTargets([])
      setIsLoading(true)
    } else {
      setIsLoading(true)
    }

    try {
      const sf = socialFilter ? {
        followingUserIds: socialFilter.followingUserId ? [socialFilter.followingUserId] : undefined,
        bubbleIds: socialFilter.bubbleId ? [socialFilter.bubbleId] : undefined,
      } : undefined

      const result = await homeRepo.findHomeTargets(userId, targetType, views, sf, dbFilters, sort, limit ?? null, offset ?? 0)

      // 버블 확신도 enrich (bubbleScore가 있는 target만)
      for (const t of result.targets) {
        if (t.bubbleScore !== null) {
          t.bubbleConfidence = computeBubbleConfidence(1)
        }
      }

      cacheRef.current.set(cacheKey, result.targets)
      setHasMore(result.hasMore)
      setAllTargets(result.targets)

      // Nyam 점수 batch enrich — 논블로킹 (targets 먼저 표시, 예측 점수는 async)
      const needPrediction = result.targets.filter((t) => t.myScore === null)
      if (needPrediction.length > 0) {
        const category = targetType === 'restaurant' ? 'restaurant' : 'wine'
        predictionRepo.batchPredict(
          userId,
          needPrediction.map((t) => t.targetId),
          category,
        ).then((predictions) => {
          if (predictions.size === 0) return
          setAllTargets((prev) => {
            const updated = prev.map((t) => {
              const pred = predictions.get(t.targetId)
              if (!pred) return t
              return { ...t, nyamScore: Math.round(pred.satisfaction), nyamConfidence: pred.confidence }
            })
            // 캐시도 갱신
            cacheRef.current.set(cacheKey, updated)
            return updated
          })
        }).catch(() => {
          // batch predict 실패해도 기본 데이터는 이미 표시됨
        })
      }
    } catch {
      if (!cached) setAllTargets([])
    } finally {
      setIsLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, tab, socialFilterKey, dbFiltersKey, sort, limit, offset])

  useEffect(() => {
    fetchTargets()
  }, [fetchTargets])

  return { targets: allTargets, hasMore, isLoading }
}
