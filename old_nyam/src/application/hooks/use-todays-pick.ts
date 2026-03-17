'use client'

import { useMemo, useState } from 'react'
import { useRecords } from '@/application/hooks/use-records'
import { useNearbyRecords } from '@/application/hooks/use-nearby-records'
import { useGeolocation } from '@/application/hooks/use-geolocation'
import type { TodaysPick } from '@/domain/entities/todays-pick'
import type { FoodRecord } from '@/domain/entities/record'

const TWO_MONTHS_MS = 1000 * 60 * 60 * 24 * 60
const ONE_MONTH_MS = 1000 * 60 * 60 * 24 * 30
const PLACEHOLDER_PHOTO = '/placeholder-food.svg'

interface NearbyRecord {
  id: string
  menuName: string
  category: string
  ratingOverall: number
  restaurantId: string | null
}

function buildPicks(
  records: FoodRecord[] | undefined,
  nearbyRecords: NearbyRecord[] | undefined,
  now: number,
): TodaysPick[] {
  const result: TodaysPick[] = []

  // From user's records: high-rated records not visited in 2+ months
  if (records) {
    const revisitCandidates = records.filter((r) => {
      const age = now - new Date(r.createdAt).getTime()
      return r.ratingOverall >= 4.0 && age >= TWO_MONTHS_MS
    })
    for (const r of revisitCandidates.slice(0, 2)) {
      const monthsAgo = Math.round(
        (now - new Date(r.createdAt).getTime()) / ONE_MONTH_MS,
      )
      result.push({
        id: `revisit-${r.id}`,
        type: 'revisit',
        reason: '다시 가볼 때가 됐어요',
        subtext: `${monthsAgo}개월 전 방문 · ★${r.ratingOverall.toFixed(1)}`,
        restaurantName: r.menuName,
        area: r.category,
        score: r.ratingOverall.toFixed(1),
        photoUrl: PLACEHOLDER_PHOTO,
        recordId: r.id,
        restaurantId: r.restaurantId,
      })
    }
  }

  // From nearby records
  if (nearbyRecords) {
    for (const nr of nearbyRecords.slice(0, 2)) {
      result.push({
        id: `nearby-${nr.id}`,
        type: 'dormant_regular',
        reason: '근처에 있는 맛집',
        subtext: `${nr.category} · ★${nr.ratingOverall.toFixed(1)}`,
        restaurantName: nr.menuName,
        area: nr.category,
        score: nr.ratingOverall.toFixed(1),
        photoUrl: PLACEHOLDER_PHOTO,
        recordId: nr.id,
        restaurantId: nr.restaurantId,
      })
    }
  }

  // Fallback static picks when data is sparse
  if (result.length < 2) {
    const fallbacks: TodaysPick[] = [
      {
        id: 'fallback-1',
        type: 'taste_match',
        reason: '기록을 남기면 추천이 정확해져요',
        subtext: '첫 기록을 남겨보세요',
        restaurantName: '나만의 맛집',
        area: '',
        score: '',
        photoUrl: PLACEHOLDER_PHOTO,
        recordId: null,
        restaurantId: null,
      },
      {
        id: 'fallback-2',
        type: 'new_opening',
        reason: '오늘의 한 끼를 기록해보세요',
        subtext: '기록이 쌓이면 AI가 맛집을 추천해드려요',
        restaurantName: '오늘 뭐 먹지?',
        area: '',
        score: '',
        photoUrl: PLACEHOLDER_PHOTO,
        recordId: null,
        restaurantId: null,
      },
    ]
    for (const fb of fallbacks) {
      if (result.length >= 3) break
      result.push(fb)
    }
  }

  return result
}

export function useTodaysPick(userId: string | undefined) {
  const { data: recordsResult, isLoading: recordsLoading } = useRecords(userId, 50)
  const { location } = useGeolocation()
  const { data: nearbyRecords, isLoading: nearbyLoading } = useNearbyRecords(location)

  // Stable timestamp that doesn't change across re-renders
  const [now] = useState(() => Date.now())

  const picks = useMemo(
    () => buildPicks(recordsResult?.data, nearbyRecords, now),
    [recordsResult, nearbyRecords, now],
  )

  return {
    picks,
    isLoading: recordsLoading || nearbyLoading,
  }
}
