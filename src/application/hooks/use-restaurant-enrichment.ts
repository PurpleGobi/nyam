'use client'

import { useEffect, useState } from 'react'
import type { RestaurantEnrichment } from '@/domain/entities/restaurant-enrichment'
import { needsEnrichment } from '@/domain/entities/restaurant-enrichment'
import { enrichmentRepo } from '@/shared/di/container'

/**
 * 식당 Enrichment 훅.
 * - 캐시 조회 → 없거나 만료면 Edge Function 트리거 (fire-and-forget)
 * - status가 pending/processing이면 3초 폴링
 * - done/failed가 되면 폴링 중지
 */
export function useRestaurantEnrichment(restaurantId: string | null) {
  const [enrichment, setEnrichment] = useState<RestaurantEnrichment | null>(null)
  const [isLoading, setIsLoading] = useState(!!restaurantId)

  useEffect(() => {
    if (!restaurantId) {
      setEnrichment(null)
      setIsLoading(false)
      return
    }
    let cancelled = false
    setIsLoading(true)
    ;(async () => {
      try {
        const data = await enrichmentRepo.findByRestaurantId(restaurantId)
        if (cancelled) return
        setEnrichment(data)
        if (needsEnrichment(data)) {
          enrichmentRepo.triggerEnrichment(restaurantId).catch(() => {
            /* fire-and-forget: 실패는 DB status로 감지 */
          })
        }
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [restaurantId])

  // processing/pending 상태일 때 폴링
  useEffect(() => {
    if (!restaurantId) return
    const status = enrichment?.status
    if (status !== 'processing' && status !== 'pending') return

    const interval = setInterval(async () => {
      const data = await enrichmentRepo.findByRestaurantId(restaurantId)
      setEnrichment(data)
      if (data?.status === 'done' || data?.status === 'failed') {
        clearInterval(interval)
      }
    }, 3000)
    return () => clearInterval(interval)
  }, [restaurantId, enrichment?.status])

  return { enrichment, isLoading }
}
