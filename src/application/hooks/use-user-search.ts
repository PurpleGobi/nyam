'use client'

import { useState, useEffect, useRef } from 'react'
import { bubbleRepo } from '@/shared/di/container'
import { getLevelColor } from '@/domain/services/xp-calculator'
import { profileRepo } from '@/shared/di/container'
import type { EnrichedFollowUser } from '@/application/hooks/use-follow-list-with-similarity'

const DEBOUNCE_MS = 300

/**
 * 전체 사용자 DB에서 닉네임/핸들로 실시간 검색
 * debounce 적용, 최소 2글자부터 검색
 */
export function useUserSearch(query: string, currentUserId: string | null) {
  const [results, setResults] = useState<EnrichedFollowUser[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const cancelRef = useRef(false)

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current)

    const trimmed = query.trim()
    if (trimmed.length < 2) {
      setResults([])
      setIsSearching(false)
      return
    }

    setIsSearching(true)
    cancelRef.current = false

    timerRef.current = setTimeout(async () => {
      try {
        const users = await bubbleRepo.searchUsers(trimmed, currentUserId ? [currentUserId] : [], 20)
        if (cancelRef.current) return

        // 프로필 enrichment (레벨 정보)
        const ids = users.map((u) => u.id)
        const profileMap = ids.length > 0
          ? await profileRepo.getUserProfiles(ids)
          : new Map()

        if (cancelRef.current) return

        const enriched: EnrichedFollowUser[] = users.map((u) => {
          const p = profileMap.get(u.id)
          const level = p ? Math.max(1, Math.floor(p.totalXp / 100) + 1) : 1
          return {
            userId: u.id,
            nickname: u.nickname,
            handle: u.handle,
            avatarUrl: u.avatarUrl,
            avatarColor: u.avatarColor,
            level,
            levelColor: getLevelColor(level),
            similarity: null,
            confidence: null,
          }
        })
        setResults(enriched)
      } finally {
        if (!cancelRef.current) setIsSearching(false)
      }
    }, DEBOUNCE_MS)

    return () => {
      cancelRef.current = true
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [query, currentUserId])

  return { results, isSearching }
}
