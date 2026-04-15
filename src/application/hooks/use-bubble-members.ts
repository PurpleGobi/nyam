'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import type { BubbleMember } from '@/domain/entities/bubble'
import type { UserProfile } from '@/domain/entities/profile'
import { bubbleRepo, profileRepo } from '@/shared/di/container'
import { getLevelTitle } from '@/domain/services/xp-calculator'

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

export interface EnrichedBubbleMember extends BubbleMember {
  nickname: string
  avatarUrl: string | null
  avatarColor: string | null
  level: number
  levelTitle: string
}

const DEFAULT_FILTERS: MemberFilters = {
  role: 'all',
  minMatch: 'all',
  minLevel: 'all',
  follow: 'all',
}

export function useBubbleMembers(bubbleId: string) {
  const [members, setMembers] = useState<EnrichedBubbleMember[]>([])
  const [filters, setFilters] = useState<MemberFilters>(DEFAULT_FILTERS)
  const [sort, setSort] = useState<MemberSortType>('match')
  const [isLoading, setIsLoading] = useState(true)

  const initialLoadDone = useRef(false)

  const fetchMembers = useCallback(async () => {
    // 최초 로딩만 스피너 표시, 이후 refetch는 백그라운드
    if (!initialLoadDone.current) setIsLoading(true)
    try {
      const result = await bubbleRepo.getMembers(bubbleId)
      const profiles = await Promise.all(
        result.data.map((m) =>
          profileRepo.getUserProfile(m.userId).catch(() => null)
        )
      )
      const enriched: EnrichedBubbleMember[] = result.data.map((m, i) => {
        const p = profiles[i]
        const level = p ? Math.max(1, Math.floor(p.totalXp / 100) + 1) : 1
        return {
          ...m,
          nickname: p?.nickname ?? m.userId.substring(0, 6),
          avatarUrl: p?.avatarUrl ?? null,
          avatarColor: p?.avatarColor ?? null,
          level,
          levelTitle: getLevelTitle(level),
        }
      })
      setMembers(enriched)
      initialLoadDone.current = true
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
      const min = Number(filters.minLevel)
      result = result.filter((m) => m.level >= min)
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
        return arr.sort((a, b) => b.level - a.level)
      case 'activity':
        return arr.sort((a, b) => b.weeklyShareCount - a.weeklyShareCount)
      default:
        return arr
    }
  }, [filtered, sort])

  /** 낙관적 업데이트: 로컬 상태만 즉시 변경 (서버 동기화는 호출자 책임) */
  const updateMemberLocal = useCallback((userId: string, patch: Partial<EnrichedBubbleMember>) => {
    setMembers((prev) => prev.map((m) => m.userId === userId ? { ...m, ...patch } : m))
  }, [])

  /** 낙관적 삭제: 로컬 상태에서 즉시 제거 */
  const removeMemberLocal = useCallback((userId: string) => {
    setMembers((prev) => prev.filter((m) => m.userId !== userId))
  }, [])

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
    updateMemberLocal,
    removeMemberLocal,
  }
}
