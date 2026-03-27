'use client'

import { useState, useEffect, useCallback } from 'react'
import { wishlistRepo } from '@/shared/di/container'

export function useWishlist(
  userId: string | null,
  targetId: string,
  targetType: 'restaurant' | 'wine',
) {
  const [isWishlisted, setIsWishlisted] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (!userId) return
    wishlistRepo.isWishlisted(userId, targetId, targetType).then(setIsWishlisted)
  }, [userId, targetId, targetType])

  const toggle = useCallback(async () => {
    if (!userId || isLoading) return
    setIsLoading(true)
    try {
      if (isWishlisted) {
        await wishlistRepo.remove(userId, targetId, targetType)
        setIsWishlisted(false)
      } else {
        await wishlistRepo.add(userId, targetId, targetType)
        setIsWishlisted(true)
      }
    } finally {
      setIsLoading(false)
    }
  }, [userId, targetId, targetType, isWishlisted, isLoading])

  return { isWishlisted, isLoading, toggle }
}
