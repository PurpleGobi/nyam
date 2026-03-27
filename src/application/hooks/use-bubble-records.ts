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
  satisfaction: number | null
  comment: string | null
  visitDate: string | null
  sharedAt: string
}

interface UseBubbleRecordsResult {
  records: BubbleRecordItem[]
  isLoading: boolean
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
        satisfaction: s.satisfaction ?? null,
        comment: s.comment ?? null,
        visitDate: s.visitDate ?? null,
        sharedAt: s.sharedAt,
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
    records: filtered,
    isLoading,
    selectedBubbleId,
    setSelectedBubbleId,
    refresh: fetch,
  }
}
