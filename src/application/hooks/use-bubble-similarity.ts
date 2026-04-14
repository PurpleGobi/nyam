'use client'

// src/application/hooks/use-bubble-similarity.ts
// R3: domain 인터페이스에만 의존. infrastructure 직접 사용 금지.

import { useState, useEffect, useMemo } from 'react'
import { similarityRepo } from '@/shared/di/container'
import type { BubbleSimilarityResult } from '@/domain/repositories/similarity-repository'

/**
 * 여러 버블의 적합도를 일괄 조회.
 * restaurant + wine 양쪽 모두 조회하여 데이터가 있는 쪽을 사용.
 * 둘 다 있으면 신뢰도 가중 병합.
 */
export function useBubbleSimilarities(
  userId: string | null,
  bubbleIds: string[],
): Map<string, BubbleSimilarityResult> {
  const [resultMap, setResultMap] = useState<Map<string, BubbleSimilarityResult>>(new Map())
  const idsKey = useMemo(() => bubbleIds.join(','), [bubbleIds])

  useEffect(() => {
    if (!userId || bubbleIds.length === 0) return

    let cancelled = false

    async function load() {
      const [restaurantResults, wineResults] = await Promise.all([
        similarityRepo.getBubbleSimilarities(userId as string, bubbleIds, 'restaurant'),
        similarityRepo.getBubbleSimilarities(userId as string, bubbleIds, 'wine'),
      ])
      if (cancelled) return

      const rMap = new Map<string, BubbleSimilarityResult>()
      for (const r of restaurantResults) rMap.set(r.bubbleId, r)

      const wMap = new Map<string, BubbleSimilarityResult>()
      for (const r of wineResults) wMap.set(r.bubbleId, r)

      const merged = new Map<string, BubbleSimilarityResult>()
      const allIds = new Set([...rMap.keys(), ...wMap.keys()])

      for (const id of allIds) {
        const r = rMap.get(id)
        const w = wMap.get(id)

        if (r && w) {
          const totalConf = r.avgConfidence * r.matchedMembers + w.avgConfidence * w.matchedMembers
          const totalMatched = r.matchedMembers + w.matchedMembers
          merged.set(id, {
            bubbleId: id,
            similarity: totalConf > 0
              ? (r.similarity * r.avgConfidence * r.matchedMembers + w.similarity * w.avgConfidence * w.matchedMembers) / totalConf
              : (r.similarity + w.similarity) / 2,
            avgConfidence: totalMatched > 0 ? totalConf / totalMatched : 0,
            matchedMembers: Math.max(r.matchedMembers, w.matchedMembers),
            totalMembers: Math.max(r.totalMembers, w.totalMembers),
          })
        } else {
          merged.set(id, (r ?? w) as BubbleSimilarityResult)
        }
      }

      setResultMap(merged)
    }

    load()
    return () => { cancelled = true }
  }, [userId, idsKey])

  return resultMap
}
