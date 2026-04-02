'use client'

import { useState, useEffect } from 'react'
import type { Bubble } from '@/domain/entities/bubble'
import { bubbleRepo } from '@/shared/di/container'

interface BubbleDiscoverResult {
  recommended: Bubble[]
  nearby: Bubble[]
  trending: Bubble[]
  newest: Bubble[]
  isLoading: boolean
}

/**
 * 공개 버블 탐색 4탭 데이터 (추천/근처/인기/새로운)
 * enabled=true 일 때만 쿼리 실행 (시트 열릴 때)
 */
export function useBubbleDiscover(
  userAreas: string[],
  excludeIds: string[],
  enabled: boolean,
): BubbleDiscoverResult {
  const [recommended, setRecommended] = useState<Bubble[]>([])
  const [nearby, setNearby] = useState<Bubble[]>([])
  const [trending, setTrending] = useState<Bubble[]>([])
  const [newest, setNewest] = useState<Bubble[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const areasKey = userAreas.join(',')
  const excludeKey = excludeIds.join(',')

  useEffect(() => {
    if (!enabled) return

    let cancelled = false
    setIsLoading(true)

    const excludeSet = new Set(excludeIds)
    const filter = (list: Bubble[]) => list.filter((b) => !excludeSet.has(b.id))

    const nearbyQuery = userAreas.length > 0
      ? bubbleRepo.findPublic({ area: userAreas[0], sortBy: 'members', limit: 20 })
      : Promise.resolve({ data: [] as Bubble[], total: 0 })

    Promise.all([
      bubbleRepo.findPublic({ sortBy: 'activity', limit: 20 }),
      nearbyQuery,
      bubbleRepo.findPublic({ sortBy: 'members', limit: 20 }),
      bubbleRepo.findPublic({ sortBy: 'latest', limit: 20 }),
    ]).then(([recResult, nearResult, trendResult, newResult]) => {
      if (cancelled) return
      setRecommended(filter(recResult.data))
      setNearby(filter(nearResult.data))
      setTrending(filter(trendResult.data))
      setNewest(filter(newResult.data))
      setIsLoading(false)
    }).catch(() => {
      if (!cancelled) setIsLoading(false)
    })

    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, areasKey, excludeKey])

  return { recommended, nearby, trending, newest, isLoading }
}
