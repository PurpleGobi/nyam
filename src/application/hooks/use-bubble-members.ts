'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import type { BubbleMember } from '@/domain/entities/bubble'
import { bubbleRepo } from '@/shared/di/container'

export type MemberRoleFilter = 'all' | 'admin' | 'member'
export type MemberMatchFilter = 'all' | '80' | '60'
export type MemberLevelFilter = 'all' | '7' | '5' | '3'
export type MemberFollowFilter = 'all' | 'following' | 'follower'
export type MemberSortType = 'match' | 'records' | 'level' | 'activity'

export interface MemberFilters {
  role: MemberRoleFilter
  minMatch: MemberMatchFilter
  minLevel: MemberLevelFilter
  follow: MemberFollowFilter
}

const DEFAULT_FILTERS: MemberFilters = {
  role: 'all',
  minMatch: 'all',
  minLevel: 'all',
  follow: 'all',
}

export function useBubbleMembers(bubbleId: string) {
  const [members, setMembers] = useState<BubbleMember[]>([])
  const [filters, setFilters] = useState<MemberFilters>(DEFAULT_FILTERS)
  const [sort, setSort] = useState<MemberSortType>('match')
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

  const activeMembers = useMemo(() => members.filter((m) => m.status === 'active'), [members])
  const pendingMembers = useMemo(() => members.filter((m) => m.status === 'pending'), [members])

  // 필터 적용
  const filtered = useMemo(() => {
    let result = [...activeMembers]

    if (filters.role !== 'all') {
      if (filters.role === 'admin') {
        result = result.filter((m) => m.role === 'owner' || m.role === 'admin')
      } else {
        result = result.filter((m) => m.role === 'member')
      }
    }

    if (filters.minMatch !== 'all') {
      const min = Number(filters.minMatch)
      result = result.filter((m) => (m.tasteMatchPct ?? 0) >= min)
    }

    if (filters.minLevel !== 'all') {
      // 레벨 필터는 현재 BubbleMember에 레벨 필드가 없으므로 추후 확장
      // 지금은 패스
    }

    return result
  }, [activeMembers, filters])

  // 정렬
  const sorted = useMemo(() => {
    const arr = [...filtered]
    switch (sort) {
      case 'match':
        return arr.sort((a, b) => (b.tasteMatchPct ?? 0) - (a.tasteMatchPct ?? 0))
      case 'records':
        return arr.sort((a, b) => b.memberUniqueTargetCount - a.memberUniqueTargetCount)
      case 'level':
        return arr.sort((a, b) => (b.avgSatisfaction ?? 0) - (a.avgSatisfaction ?? 0))
      case 'activity':
        return arr.sort((a, b) => b.weeklyShareCount - a.weeklyShareCount)
      default:
        return arr
    }
  }, [filtered, sort])

  return {
    members: sorted,
    activeMembers,
    pendingMembers,
    filters,
    setFilters,
    sort,
    setSort,
    isLoading,
    refetch: fetchMembers,
  }
}
