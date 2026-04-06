'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import type { RecordTargetType, RecordWithTarget } from '@/domain/entities/record'
import type { HomeTab } from '@/domain/entities/home-state'
import type { FilterRule, SortOption } from '@/domain/entities/saved-filter'
import { matchesAllRules } from '@/domain/services/filter-matcher'
import { recordRepo } from '@/shared/di/container'

export type ViewType = 'visited' | 'wishlist' | 'bubble' | 'following' | 'public'

const PAGE_SIZE = 20

function applyFilters(
  records: RecordWithTarget[],
  filters: FilterRule[],
  conjunction: 'and' | 'or',
): RecordWithTarget[] {
  if (filters.length === 0) return records
  return records.filter((record) =>
    matchesAllRules(record as unknown as Record<string, unknown>, filters, conjunction),
  )
}

function applySort(records: RecordWithTarget[], sort: SortOption): RecordWithTarget[] {
  const sorted = [...records]
  switch (sort) {
    case 'latest':
      return sorted.sort((a, b) => {
        const dateA = a.visitDate ?? ''
        const dateB = b.visitDate ?? ''
        if (dateA !== dateB) return dateB.localeCompare(dateA)
        return b.createdAt.localeCompare(a.createdAt)
      })
    case 'score_high':
      return sorted.sort((a, b) => (b.satisfaction ?? 0) - (a.satisfaction ?? 0))
    case 'score_low':
      return sorted.sort((a, b) => (a.satisfaction ?? 0) - (b.satisfaction ?? 0))
    case 'name':
      return sorted.sort((a, b) => a.targetName.localeCompare(b.targetName))
    case 'visit_count': {
      const visitCounts = new Map<string, number>()
      for (const r of records) {
        visitCounts.set(r.targetId, (visitCounts.get(r.targetId) ?? 0) + 1)
      }
      return sorted.sort((a, b) => (visitCounts.get(b.targetId) ?? 0) - (visitCounts.get(a.targetId) ?? 0))
    }
    default:
      return sorted
  }
}

export function useHomeRecords(params: {
  userId: string | null
  tab: HomeTab
  viewTypes: ViewType[]
  filters: FilterRule[]
  sort: SortOption
  conjunction: 'and' | 'or'
}): {
  records: RecordWithTarget[]
  isLoading: boolean
  totalCount: number
  loadMore: () => void
  hasMore: boolean
} {
  const { userId, tab, viewTypes, filters, sort, conjunction } = params
  const [allRecords, setAllRecords] = useState<RecordWithTarget[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [page, setPage] = useState(1)

  // viewTypes 배열의 안정적 비교를 위한 직렬화 키
  const viewTypesKey = useMemo(() => JSON.stringify(viewTypes.slice().sort()), [viewTypes])

  const fetchRecords = useCallback(async () => {
    if (!userId) return
    setIsLoading(true)
    try {
      const targetType: RecordTargetType = tab
      const ALL_VIEWS: ViewType[] = ['visited', 'wishlist', 'bubble', 'following', 'public']
      const views: ViewType[] = viewTypes.length > 0 ? viewTypes : ALL_VIEWS

      const promises = views.map((view) => {
        switch (view) {
          case 'visited':
            return recordRepo.findByUserIdWithTarget(userId, targetType)
          case 'wishlist':
            return recordRepo.findWishlistTargetRecords(userId, targetType)
          case 'bubble':
            return recordRepo.findBubbleSharedRecords(userId, targetType)
          case 'following':
            return recordRepo.findFollowingRecords(userId, targetType)
          case 'public':
            return recordRepo.findPublicRecords(userId, targetType)
        }
      })

      const results = await Promise.all(promises)
      const merged = results.flat()

      // record.id 기준 중복 제거
      const seen = new Map<string, RecordWithTarget>()
      for (const r of merged) {
        if (!seen.has(r.id)) seen.set(r.id, r)
      }
      const deduped = Array.from(seen.values())

      setAllRecords(deduped)
      setPage(1)
    } catch {
      setAllRecords([])
    } finally {
      setIsLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, tab, viewTypesKey])

  useEffect(() => {
    fetchRecords()
  }, [fetchRecords])

  useEffect(() => {
    setPage(1)
  }, [filters, sort])

  const processed = useMemo(() => {
    const filtered = applyFilters(allRecords, filters, conjunction)
    return applySort(filtered, sort)
  }, [allRecords, filters, sort, conjunction])

  const totalCount = processed.length
  const records = processed.slice(0, page * PAGE_SIZE)
  const hasMore = records.length < totalCount

  const loadMore = useCallback(() => {
    if (hasMore) setPage((p) => p + 1)
  }, [hasMore])

  return { records, isLoading, totalCount, loadMore, hasMore }
}
