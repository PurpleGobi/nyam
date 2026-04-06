'use client'

import { useState, useEffect, useCallback } from 'react'
import { recordRepo } from '@/shared/di/container'

export interface UseBookmarkReturn {
  isBookmarked: boolean
  isLoading: boolean
  toggle: () => Promise<void>
}

/**
 * 찜(bookmark) 토글 — lists.is_bookmarked 기반
 * status와 독립적으로 동작: 방문 기록이 있어도 찜 가능
 */
export function useBookmark(
  userId: string | null,
  targetId: string | null,
  targetType: 'restaurant' | 'wine',
): UseBookmarkReturn {
  const [isBookmarked, setIsBookmarked] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (!userId || !targetId) return
    recordRepo.findListByUserAndTarget(userId, targetId, targetType).then((list) => {
      setIsBookmarked(list?.isBookmarked ?? false)
    })
  }, [userId, targetId, targetType])

  const toggle = useCallback(async () => {
    if (!userId || !targetId || isLoading) return
    setIsLoading(true)

    const next = !isBookmarked
    setIsBookmarked(next)

    try {
      await recordRepo.toggleBookmark(userId, targetId, targetType, next)
    } catch {
      setIsBookmarked(!next)
    } finally {
      setIsLoading(false)
    }
  }, [userId, targetId, targetType, isBookmarked, isLoading])

  return { isBookmarked, isLoading, toggle }
}
