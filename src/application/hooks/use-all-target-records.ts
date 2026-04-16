'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { bubbleRepo, profileRepo } from '@/shared/di/container'
import { restaurantRepo, wineRepo } from '@/shared/di/container'
import { getLevelTitle } from '@/domain/services/xp-calculator'
import type { DiningRecord } from '@/domain/entities/record'
import type { RecordPhoto } from '@/domain/entities/record-photo'

// ─── Types ───

export type RecordSource = 'bubble' | 'following' | 'public'

export interface AllRecordItem {
  id: string
  source: RecordSource
  authorId: string
  authorNickname: string
  authorAvatar: string | null
  authorAvatarColor: string | null
  authorLevel: number
  authorLevelTitle: string
  satisfaction: number | null
  axisX: number | null
  axisY: number | null
  comment: string | null
  scene: string | null
  visitDate: string | null
  photos: RecordPhoto[]
}

export type SourceFilter = 'mine' | 'all' | RecordSource

// ─── Hook ───

interface UseAllTargetRecordsParams {
  targetId: string
  targetType: 'restaurant' | 'wine'
  userId: string | null
  userBubbleIds: string[]
}

export function useAllTargetRecords({
  targetId,
  targetType,
  userId,
  userBubbleIds,
}: UseAllTargetRecordsParams) {
  const [bubbleItems, setBubbleItems] = useState<AllRecordItem[]>([])
  const [followingItems, setFollowingItems] = useState<AllRecordItem[]>([])
  const [publicItems, setPublicItems] = useState<AllRecordItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all')

  const bubbleIdsRef = useRef(userBubbleIds)
  bubbleIdsRef.current = userBubbleIds
  const bubbleIdsKey = userBubbleIds.join(',')

  const fetchAll = useCallback(async () => {
    if (!userId) return
    setIsLoading(true)
    try {
      const repo = targetType === 'restaurant' ? restaurantRepo : wineRepo

      // 3소스 병렬 fetch
      const [bubbleResult, followingResult, publicResult] = await Promise.allSettled([
        bubbleIdsRef.current.length > 0
          ? bubbleRepo.getSharesForTarget(targetId, targetType, bubbleIdsRef.current)
          : Promise.resolve([]),
        repo.findFollowingRecordsByTarget(targetId, userId),
        repo.findPublicRecordsByTarget(targetId, userId),
      ])

      // 버블: 이미 author 정보 포함 (내 기록 제외)
      const shares = bubbleResult.status === 'fulfilled' ? bubbleResult.value : []
      const bItemsRaw: AllRecordItem[] = shares
        .filter((s) => s.sharedBy !== userId)
        .map((s) => ({
          id: s.recordId,
          source: 'bubble' as const,
          authorId: s.sharedBy,
          authorNickname: s.authorNickname ?? '',
          authorAvatar: s.authorAvatar ?? null,
          authorAvatarColor: s.authorAvatarColor ?? null,
          authorLevel: s.authorLevel ?? 1,
          authorLevelTitle: s.authorLevelTitle ?? '',
          satisfaction: s.satisfaction ?? null,
          axisX: s.axisX ?? null,
          axisY: s.axisY ?? null,
          comment: s.comment ?? null,
          scene: s.scene ?? null,
          visitDate: s.visitDate ?? null,
          photos: [],
        }))
      // 같은 기록이 여러 버블에 공유된 경우 중복 제거
      const seenRecordIds = new Set<string>()
      const bItems = bItemsRaw.filter((item) => {
        if (seenRecordIds.has(item.id)) return false
        seenRecordIds.add(item.id)
        return true
      })

      // 팔로잉 + 공개: DiningRecord → author 정보 enrichment 필요
      const fRecords = followingResult.status === 'fulfilled' ? followingResult.value : []
      const pRecords = publicResult.status === 'fulfilled' ? publicResult.value : []

      // 유니크 userId 수집 → 프로필 batch fetch
      const allRecords = [...fRecords, ...pRecords]
      const uniqueUserIds = [...new Set(allRecords.map((r) => r.userId).filter((id) => id !== userId))]

      const profileMap = new Map<string, { nickname: string; avatarUrl: string | null; avatarColor: string | null; totalXp: number }>()
      if (uniqueUserIds.length > 0) {
        const profiles = await Promise.allSettled(
          uniqueUserIds.map((uid) => profileRepo.getUserProfile(uid))
        )
        profiles.forEach((result, i) => {
          if (result.status === 'fulfilled') {
            const p = result.value
            profileMap.set(uniqueUserIds[i], {
              nickname: p.nickname,
              avatarUrl: p.avatarUrl,
              avatarColor: p.avatarColor,
              totalXp: p.totalXp,
            })
          }
        })
      }

      const enrichRecord = (r: DiningRecord, source: RecordSource): AllRecordItem => {
        const p = profileMap.get(r.userId)
        const level = p ? Math.max(1, Math.floor(p.totalXp / 100) + 1) : 1
        return {
          id: r.id,
          source,
          authorId: r.userId,
          authorNickname: p?.nickname ?? '',
          authorAvatar: p?.avatarUrl ?? null,
          authorAvatarColor: p?.avatarColor ?? null,
          authorLevel: level,
          authorLevelTitle: getLevelTitle(level),
          satisfaction: r.satisfaction,
          axisX: r.axisX,
          axisY: r.axisY,
          comment: r.comment,
          scene: r.scene,
          visitDate: r.visitDate,
          photos: [],
        }
      }

      const fItems = fRecords.filter((r) => r.userId !== userId).map((r) => enrichRecord(r, 'following'))
      const pItems = pRecords.filter((r) => r.userId !== userId).map((r) => enrichRecord(r, 'public'))

      // 모든 기록의 사진 일괄 조회
      const allItems = [...bItems, ...fItems, ...pItems]
      const allRecordIds = [...new Set(allItems.map((item) => item.id).filter(Boolean))]
      if (allRecordIds.length > 0) {
        const photoMap = await repo.findRecordPhotos(allRecordIds)
        for (const item of allItems) {
          const photos = photoMap.get(item.id)
          if (photos) item.photos = photos.filter((p) => p.isPublic)
        }
      }

      setBubbleItems(bItems)
      setFollowingItems(fItems)
      setPublicItems(pItems)
    } finally {
      setIsLoading(false)
    }
  }, [targetId, targetType, userId])

  useEffect(() => {
    fetchAll()
  }, [fetchAll, bubbleIdsKey])

  // 소스별 필터 + 중복 제거 (같은 recordId가 여러 소스에 존재 가능)
  const records = useMemo(() => {
    let items: AllRecordItem[]
    switch (sourceFilter) {
      case 'mine':
        items = []
        break
      case 'bubble':
        items = bubbleItems
        break
      case 'following':
        items = followingItems
        break
      case 'public':
        items = publicItems
        break
      default: {
        // 전체: 중복 제거 (bubble > following > public 우선)
        const seen = new Set<string>()
        items = []
        for (const item of [...bubbleItems, ...followingItems, ...publicItems]) {
          if (!seen.has(item.id)) {
            seen.add(item.id)
            items.push(item)
          }
        }
      }
    }
    return items.slice(0, 10)
  }, [sourceFilter, bubbleItems, followingItems, publicItems])

  const sourceCounts = useMemo(() => ({
    bubble: bubbleItems.length,
    following: followingItems.length,
    public: publicItems.length,
    all: new Set([...bubbleItems, ...followingItems, ...publicItems].map((i) => i.id)).size,
  }), [bubbleItems, followingItems, publicItems])

  return {
    records,
    isLoading,
    sourceFilter,
    setSourceFilter,
    sourceCounts,
    hasMore: sourceCounts.all > 10,
  }
}
