'use client'

import { useState, useCallback } from 'react'
import { bubbleRepo } from '@/shared/di/container'

interface UseCleanManualSharesReturn {
  cleanShares: (userId: string) => Promise<number>
  isLoading: boolean
}

/**
 * 수동 공유 항목 정리 hook
 * 규칙에 맞지 않는 수동 공유를 삭제
 */
export function useCleanManualShares(): UseCleanManualSharesReturn {
  const [isLoading, setIsLoading] = useState(false)

  const cleanShares = useCallback(async (userId: string): Promise<number> => {
    setIsLoading(true)
    try {
      return await bubbleRepo.cleanManualShares(userId)
    } finally {
      setIsLoading(false)
    }
  }, [])

  return { cleanShares, isLoading }
}
