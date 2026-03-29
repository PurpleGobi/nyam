'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import type { DiningRecord, RecordTargetType } from '@/domain/entities/record'
import type { HomeTab } from '@/domain/entities/home-state'
import type { FilterRule, SortOption } from '@/domain/entities/saved-filter'
import { recordRepo } from '@/shared/di/container'

export type HomeRecordItem = DiningRecord

const PAGE_SIZE = 20

function applyFilters(
  records: DiningRecord[],
  filters: FilterRule[],
  conjunction: 'and' | 'or',
): DiningRecord[] {
  if (filters.length === 0) return records

  return records.filter((record) => {
    const results = filters.map((rule) => {
      const val = (record as unknown as Record<string, unknown>)[rule.attribute]
      switch (rule.operator) {
        case 'eq': return val === rule.value
        case 'neq': return val !== rule.value
        case 'gt': return typeof val === 'number' && typeof rule.value === 'number' && val > rule.value
        case 'gte': return typeof val === 'number' && typeof rule.value === 'number' && val >= rule.value
        case 'lt': return typeof val === 'number' && typeof rule.value === 'number' && val < rule.value
        case 'lte': return typeof val === 'number' && typeof rule.value === 'number' && val <= rule.value
        case 'contains': return typeof val === 'string' && typeof rule.value === 'string' && val.includes(rule.value)
        case 'not_contains': return typeof val === 'string' && typeof rule.value === 'string' && !val.includes(rule.value)
        case 'is_null': return val == null
        case 'is_not_null': return val != null
        default: return true
      }
    })

    return conjunction === 'and'
      ? results.every(Boolean)
      : results.some(Boolean)
  })
}

function applySort(records: DiningRecord[], sort: SortOption): DiningRecord[] {
  const sorted = [...records]
  switch (sort) {
    case 'latest':
      return sorted.sort((a, b) => (b.latestVisitDate ?? '').localeCompare(a.latestVisitDate ?? ''))
    case 'score_high':
      return sorted.sort((a, b) => (b.avgSatisfaction ?? 0) - (a.avgSatisfaction ?? 0))
    case 'score_low':
      return sorted.sort((a, b) => (a.avgSatisfaction ?? 0) - (b.avgSatisfaction ?? 0))
    case 'name':
      return sorted.sort((a, b) => a.targetId.localeCompare(b.targetId)) // TODO: targetName 필요 (RecordWithTarget 전환 시 수정)
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
  chipId: string | null
  filters: FilterRule[]
  sort: SortOption
  conjunction: 'and' | 'or'
}): {
  records: HomeRecordItem[]
  isLoading: boolean
  totalCount: number
  loadMore: () => void
  hasMore: boolean
} {
  const { userId, tab, chipId, filters, sort, conjunction } = params
  const [allRecords, setAllRecords] = useState<DiningRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [page, setPage] = useState(1)

  const fetchRecords = useCallback(async () => {
    if (!userId) return
    setIsLoading(true)
    try {
      const targetType: RecordTargetType = tab
      const data = await recordRepo.findByUserId(userId, targetType)
      setAllRecords(data)
      setPage(1)
    } catch {
      setAllRecords([])
    } finally {
      setIsLoading(false)
    }
  }, [userId, tab])

  useEffect(() => {
    fetchRecords()
  }, [fetchRecords])

  useEffect(() => {
    setPage(1)
  }, [chipId, filters, sort])

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
