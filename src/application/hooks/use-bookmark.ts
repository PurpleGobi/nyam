'use client'

import { useState, useEffect, useCallback } from 'react'
import { bookmarkRepo } from '@/shared/di/container'

export interface UseBookmarkReturn {
  isBookmarked: boolean
  isLoading: boolean
  toggle: () => Promise<void>
}

/**
 * 찜(bookmark) 토글 -- bookmarks 테이블 기반
 */
export function useBookmark(
  userId: string | null,
  targetId: string | null,
  targetType: 'restaurant' | 'wine',
  onBubbleSync?: (targetId: string, targetType: 'restaurant' | 'wine', isBookmarked: boolean) => void,
): UseBookmarkReturn {
  const [isBookmarked, setIsBookmarked] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (!userId || !targetId) return
    bookmarkRepo.isBookmarked(userId, targetId, targetType).then((result) => {
      setIsBookmarked(result)
    })
  }, [userId, targetId, targetType])

  const toggle = useCallback(async () => {
    if (!userId || !targetId || isLoading) return
    setIsLoading(true)

    const next = !isBookmarked
    setIsBookmarked(next)

    try {
      const result = await bookmarkRepo.toggle(userId, targetId, targetType, 'bookmark')
      setIsBookmarked(result)
      // 찜 상태 변경 후 버블 동기화 트리거
      onBubbleSync?.(targetId, targetType, result)
    } catch {
      setIsBookmarked(!next)
    } finally {
      setIsLoading(false)
    }
  }, [userId, targetId, targetType, isBookmarked, isLoading, onBubbleSync])

  return { isBookmarked, isLoading, toggle }
}
