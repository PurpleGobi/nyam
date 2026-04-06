'use client'

import { useState, useEffect, useCallback } from 'react'
import { recordRepo } from '@/shared/di/container'
import type { ListStatus } from '@/domain/entities/record'

export interface UseWishlistReturn {
  isWishlisted: boolean
  isLoading: boolean
  toggle: () => Promise<void>
}

/**
 * 찜(wishlist) 토글 — lists 테이블 기반
 * status='wishlist' 항목의 존재 여부로 판단
 */
export function useWishlist(
  userId: string | null,
  targetId: string | null,
  targetType: 'restaurant' | 'wine',
): UseWishlistReturn {
  const [isWishlisted, setIsWishlisted] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (!userId || !targetId) return
    recordRepo.findListByUserAndTarget(userId, targetId, targetType).then((list) => {
      setIsWishlisted(list?.status === 'wishlist')
    })
  }, [userId, targetId, targetType])

  const toggle = useCallback(async () => {
    if (!userId || !targetId || isLoading) return
    setIsLoading(true)

    const prev = isWishlisted
    setIsWishlisted(!prev)

    try {
      if (prev) {
        // 찜 해제: list 삭제
        const list = await recordRepo.findListByUserAndTarget(userId, targetId, targetType)
        if (list && list.status === 'wishlist') {
          await recordRepo.deleteList(list.id)
        }
      } else {
        // 찜 추가
        await recordRepo.findOrCreateList(userId, targetId, targetType, 'wishlist' as ListStatus)
      }
    } catch {
      setIsWishlisted(prev)
    } finally {
      setIsLoading(false)
    }
  }, [userId, targetId, targetType, isWishlisted, isLoading])

  return { isWishlisted, isLoading, toggle }
}
