'use client'

import { useState, useCallback } from 'react'
import type { WrappedData, WrappedCategory } from '@/domain/entities/profile'
import { profileRepo } from '@/shared/di/container'

export function useWrapped(userId: string | null) {
  const [wrappedData, setWrappedData] = useState<WrappedData | null>(null)
  const [category, setCategory] = useState<WrappedCategory>('all')
  const [isLoading, setIsLoading] = useState(false)

  const loadWrapped = useCallback(async (cat: WrappedCategory) => {
    if (!userId) return
    setIsLoading(true)
    setCategory(cat)
    try {
      const data = await profileRepo.getWrappedData(userId, cat)
      setWrappedData(data)
    } finally {
      setIsLoading(false)
    }
  }, [userId])

  return { wrappedData, category, isLoading, loadWrapped }
}
