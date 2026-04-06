'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import type { RecordTargetType, RecordWithTarget, RecordSource } from '@/domain/entities/record'
import type { HomeTab } from '@/domain/entities/home-state'
import { recordRepo } from '@/shared/di/container'

export type ViewType = 'visited' | 'bookmark' | 'bubble' | 'following' | 'public'

/** ViewType → RecordSource 매핑 ('visited' → 'mine') */
const VIEW_TO_SOURCE: Record<ViewType, RecordSource> = {
  visited: 'mine',
  bookmark: 'bookmark',
  bubble: 'bubble',
  following: 'following',
  public: 'public',
}

const ALL_VIEWS: ViewType[] = ['visited', 'bookmark', 'bubble', 'following', 'public']

export function useHomeRecords(params: {
  userId: string | null
  tab: HomeTab
  viewTypes: ViewType[]
}): {
  records: RecordWithTarget[]
  isLoading: boolean
} {
  const { userId, tab, viewTypes } = params
  const [allRecords, setAllRecords] = useState<RecordWithTarget[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // 탭별 캐시 (stale-while-revalidate)
  const cacheRef = useRef<Map<string, RecordWithTarget[]>>(new Map())

  // viewTypes 배열의 안정적 비교를 위한 직렬화 키
  const viewTypesKey = useMemo(() => JSON.stringify(viewTypes.slice().sort()), [viewTypes])

  const fetchRecords = useCallback(async () => {
    if (!userId) return
    const targetType: RecordTargetType = tab
    const views: ViewType[] = viewTypes.length > 0 ? viewTypes : ALL_VIEWS
    const sources = views.map((v) => VIEW_TO_SOURCE[v])

    const cacheKey = `${tab}:${viewTypesKey}`
    const cached = cacheRef.current.get(cacheKey)

    // 즉시 탭 전환: 캐시 히트 → 캐시 데이터 표시, 미스 → 빈 배열 (이전 탭 잔상 방지)
    setAllRecords(cached ?? [])
    setIsLoading(!cached)

    // 배경에서 최신 데이터 fetch + 팔로잉 source 태깅을 단일 흐름으로 처리 (flickering 방지)
    try {
      let deduped = await recordRepo.findHomeRecords(userId, targetType, sources)

      // 팔로잉 source 태깅 (별도 useEffect가 아닌 fetch 내 통합 — 단일 setAllRecords)
      const mineTargetIds = [...new Set(
        deduped.filter((r) => r.source === 'mine').map((r) => r.targetId),
      )]
      if (mineTargetIds.length > 0) {
        const followingIds = await recordRepo.findFollowingTargetIds(userId, mineTargetIds, tab)
        if (followingIds.size > 0) {
          deduped = deduped.map((r) =>
            r.source === 'mine' && followingIds.has(r.targetId)
              ? { ...r, source: 'following' as const }
              : r,
          )
        }
      }

      cacheRef.current.set(cacheKey, deduped)
      // 캐시와 동일한 데이터면 re-render 방지
      if (!cached || deduped.length !== cached.length || deduped.some((r, i) => r.id !== cached[i]?.id)) {
        setAllRecords(deduped)
      }
    } catch {
      if (!cached) setAllRecords([])
    } finally {
      setIsLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, tab, viewTypesKey])

  useEffect(() => {
    fetchRecords()
  }, [fetchRecords])

  return { records: allRecords, isLoading }
}
