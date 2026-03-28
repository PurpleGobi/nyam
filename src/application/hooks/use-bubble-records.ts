'use client'

import { useState, useEffect, useCallback } from 'react'
import type { BubbleShare } from '@/domain/entities/bubble'
import { bubbleRepo } from '@/shared/di/container'

interface BubbleRecordItem {
  shareId: string
  recordId: string
  bubbleId: string
  bubbleName: string
  sharedBy: string
  authorNickname: string
  authorAvatar: string | null
  authorAvatarColor: string | null
  authorLevel: number
  authorLevelTitle: string
  satisfaction: number | null
  comment: string | null
  scene: string | null
  visitDate: string | null
  likeCount: number
  commentCount: number
  sharedAt: string
  contentVisibility: 'rating_only' | 'rating_and_comment'
  /** 현재 뷰어가 해당 버블 멤버인지 */
  isMember: boolean
}

interface UseBubbleRecordsResult {
  records: BubbleRecordItem[]
  isLoading: boolean
  hasMore: boolean
  selectedBubbleId: string | null
  setSelectedBubbleId: (id: string | null) => void
  refresh: () => void
}

export function useBubbleRecords(
  targetId: string,
  targetType: 'restaurant' | 'wine',
  userBubbleIds: string[],
): UseBubbleRecordsResult {
  const [records, setRecords] = useState<BubbleRecordItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [selectedBubbleId, setSelectedBubbleId] = useState<string | null>(null)

  const fetch = useCallback(async () => {
    if (userBubbleIds.length === 0) return
    setIsLoading(true)
    try {
      const shares = await bubbleRepo.getSharesForTarget(targetId, targetType, userBubbleIds)
      const items: BubbleRecordItem[] = shares.map((s) => ({
        shareId: s.id,
        recordId: s.recordId,
        bubbleId: s.bubbleId,
        bubbleName: s.bubbleName ?? '',
        sharedBy: s.sharedBy,
        authorNickname: s.authorNickname ?? '',
        authorAvatar: s.authorAvatar ?? null,
        authorAvatarColor: s.authorAvatarColor ?? null,
        authorLevel: s.authorLevel ?? 1,
        authorLevelTitle: s.authorLevelTitle ?? '',
        satisfaction: s.satisfaction ?? null,
        comment: s.comment ?? null,
        scene: s.scene ?? null,
        visitDate: s.visitDate ?? null,
        likeCount: s.likeCount ?? 0,
        commentCount: s.commentCount ?? 0,
        sharedAt: s.sharedAt,
        contentVisibility: s.contentVisibility ?? 'rating_and_comment',
        isMember: userBubbleIds.includes(s.bubbleId),
      }))
      setRecords(items)
    } finally {
      setIsLoading(false)
    }
  }, [targetId, targetType, userBubbleIds])

  useEffect(() => {
    fetch()
  }, [fetch])

  const filtered = selectedBubbleId
    ? records.filter((r) => r.bubbleId === selectedBubbleId)
    : records

  return {
    records: filtered.slice(0, 5),
    isLoading,
    hasMore: filtered.length > 5,
    selectedBubbleId,
    setSelectedBubbleId,
    refresh: fetch,
  }
}
