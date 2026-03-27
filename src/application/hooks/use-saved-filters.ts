'use client'

import { useState, useEffect, useCallback } from 'react'
import type { SavedFilter, FilterRule } from '@/domain/entities/saved-filter'
import { savedFilterRepo } from '@/shared/di/container'

export function useSavedFilters(userId: string | null, targetType: string) {
  const [filters, setFilters] = useState<SavedFilter[]>([])
  const [counts, setCounts] = useState<Record<string, number>>({})

  useEffect(() => {
    if (!userId) return
    savedFilterRepo.getByUser(userId, targetType).then(setFilters)
  }, [userId, targetType])

  const createFilter = useCallback(async (name: string, rules: FilterRule[], sortBy?: string) => {
    if (!userId) return
    const filter = await savedFilterRepo.create({ userId, name, targetType, rules, sortBy })
    setFilters((prev) => [...prev, filter])
  }, [userId, targetType])

  const deleteFilter = useCallback(async (filterId: string) => {
    await savedFilterRepo.delete(filterId)
    setFilters((prev) => prev.filter((f) => f.id !== filterId))
  }, [])

  return { filters, counts, createFilter, deleteFilter }
}
