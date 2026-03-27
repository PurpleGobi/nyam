'use client'

import { useState, useEffect, useCallback } from 'react'
import type { BubbleMember } from '@/domain/entities/bubble'
import { bubbleRepo } from '@/shared/di/container'

export function useBubbleMembers(bubbleId: string) {
  const [members, setMembers] = useState<BubbleMember[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchMembers = useCallback(async () => {
    setIsLoading(true)
    try {
      const data = await bubbleRepo.getMembers(bubbleId)
      setMembers(data)
    } finally {
      setIsLoading(false)
    }
  }, [bubbleId])

  useEffect(() => {
    fetchMembers()
  }, [fetchMembers])

  const activeMembers = members.filter((m) => m.status === 'active')
  const pendingMembers = members.filter((m) => m.status === 'pending')

  return { members, activeMembers, pendingMembers, isLoading, refetch: fetchMembers }
}
