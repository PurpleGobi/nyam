'use client'

import { useState, useEffect, useCallback } from 'react'
import type { WishlistRepository } from '@/domain/repositories/wishlist-repository'

export interface UseWishlistReturn {
  isWishlisted: boolean
  isLoading: boolean
  toggle: () => Promise<void>
}

export function useWishlist(
  userId: string | null,
  targetId: string,
  targetType: 'restaurant' | 'wine',
  repo: WishlistRepository,
): UseWishlistReturn {
  const [isWishlisted, setIsWishlisted] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (!userId) return
    repo.isWishlisted(userId, targetId, targetType).then(setIsWishlisted)
  }, [userId, targetId, targetType, repo])

  const toggle = useCallback(async () => {
    if (!userId || isLoading) return
    setIsLoading(true)

    const prev = isWishlisted
    setIsWishlisted(!prev)

    try {
      if (prev) {
        await repo.remove(userId, targetId, targetType)
      } else {
        await repo.add({ userId, targetId, targetType, source: 'direct' })
      }
    } catch {
      setIsWishlisted(prev)
    } finally {
      setIsLoading(false)
    }
  }, [userId, targetId, targetType, isWishlisted, isLoading, repo])

  return { isWishlisted, isLoading, toggle }
}
