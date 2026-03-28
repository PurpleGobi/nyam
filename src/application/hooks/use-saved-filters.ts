'use client'

import { useState, useEffect, useCallback } from 'react'
import type { SavedFilter, FilterRule } from '@/domain/entities/saved-filter'
import { savedFilterRepo } from '@/shared/di/container'

const RESTAURANT_PRESETS: { name: string; rules: FilterRule[] }[] = [
  { name: '방문', rules: [{ attribute: 'status', operator: 'eq', value: 'visited' }] },
  { name: '찜', rules: [{ attribute: 'status', operator: 'eq', value: 'wishlist' }] },
  { name: '팔로잉', rules: [{ attribute: 'status', operator: 'eq', value: 'following' }] },
]

const WINE_PRESETS: { name: string; rules: FilterRule[] }[] = [
  { name: '시음', rules: [{ attribute: 'wine_status', operator: 'eq', value: 'tasted' }] },
  { name: '찜', rules: [{ attribute: 'wine_status', operator: 'eq', value: 'wishlist' }] },
  { name: '셀러', rules: [{ attribute: 'wine_status', operator: 'eq', value: 'cellar' }] },
]

export function useSavedFilters(userId: string | null, targetType: string) {
  const [filters, setFilters] = useState<SavedFilter[]>([])
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (!userId) return
    let cancelled = false

    const load = async () => {
      setIsLoading(true)
      try {
        let loaded = await savedFilterRepo.getByUser(userId, targetType)
        if (cancelled) return

        // 기본 프리셋 자동 생성 (최초 진입 시)
        if (loaded.length === 0) {
          const presets = targetType === 'restaurant' ? RESTAURANT_PRESETS : WINE_PRESETS
          const created = await Promise.all(
            presets.map((p) => savedFilterRepo.create({ userId, name: p.name, targetType, rules: p.rules }))
          )
          if (cancelled) return
          loaded = created
        }

        setFilters(loaded)

        // 각 필터칩 카운트 집계
        const entries = await Promise.all(
          loaded.map(async (f) => {
            const count = await savedFilterRepo.getRecordCount(userId, targetType, f.rules)
            return [f.id, count] as const
          })
        )
        if (!cancelled) {
          setCounts(Object.fromEntries(entries))
        }
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [userId, targetType])

  const createFilter = useCallback(async (name: string, rules: FilterRule[], sortBy?: string) => {
    if (!userId) return
    const filter = await savedFilterRepo.create({ userId, name, targetType, rules, sortBy })
    setFilters((prev) => [...prev, filter])
  }, [userId, targetType])

  const deleteFilter = useCallback(async (filterId: string) => {
    await savedFilterRepo.delete(filterId)
    setFilters((prev) => prev.filter((f) => f.id !== filterId))
    setCounts((prev) => {
      const next = { ...prev }
      delete next[filterId]
      return next
    })
  }, [])

  const reorderFilters = useCallback(async (ids: string[]) => {
    await savedFilterRepo.reorder(ids)
    setFilters((prev) => {
      const map = new Map(prev.map((f) => [f.id, f]))
      return ids.map((id) => map.get(id)).filter((f): f is SavedFilter => f !== undefined)
    })
  }, [])

  return { filters, counts, isLoading, createFilter, deleteFilter, reorderFilters }
}
