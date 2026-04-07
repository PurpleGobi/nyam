'use client'

import { useState, useEffect } from 'react'
import type { BubbleExpertise } from '@/domain/entities/bubble'
import { bubbleRepo } from '@/shared/di/container'

/**
 * 여러 버블의 전문성 데이터를 한번에 가져오는 훅
 * HomeContainer에서 버블 카드에 Top 3 전문 분야를 표시할 때 사용
 */
export function useBubbleExpertise(bubbleIds: string[]) {
  const [expertiseMap, setExpertiseMap] = useState<Map<string, BubbleExpertise[]>>(new Map())
  const [isLoading, setIsLoading] = useState(bubbleIds.length > 0)

  const idsKey = bubbleIds.join(',')

  useEffect(() => {
    if (bubbleIds.length === 0) return

    let cancelled = false

    bubbleRepo.getExpertiseForBubbles(bubbleIds).then((data) => {
      if (cancelled) return
      setExpertiseMap(data)
      setIsLoading(false)
    }).catch(() => {
      if (!cancelled) setIsLoading(false)
    })

    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsKey])

  return { expertiseMap, isLoading }
}

/**
 * 단일 버블의 전문성 데이터를 가져오는 훅
 * 버블 상세 페이지에서 전문 분야 섹션에 사용
 */
export function useSingleBubbleExpertise(bubbleId: string | null) {
  const [expertise, setExpertise] = useState<BubbleExpertise[]>([])
  const [isLoading, setIsLoading] = useState(!!bubbleId)

  useEffect(() => {
    if (!bubbleId) return

    let cancelled = false

    bubbleRepo.getExpertise(bubbleId).then((data) => {
      if (cancelled) return
      setExpertise(data)
      setIsLoading(false)
    }).catch(() => {
      if (!cancelled) setIsLoading(false)
    })

    return () => { cancelled = true }
  }, [bubbleId])

  return { expertise, isLoading }
}
