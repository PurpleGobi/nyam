'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import type { RecordTargetType } from '@/domain/entities/record'
import type { HomeTarget } from '@/domain/entities/home-target'
import type { HomeTab } from '@/domain/entities/home-state'
import { type HomeViewType, ALL_HOME_VIEWS } from '@/domain/repositories/home-repository'
import { homeRepo } from '@/shared/di/container'

export function useHomeTargets(params: {
  userId: string | null
  tab: HomeTab
  viewTypes: HomeViewType[]
  socialFilter?: {
    followingUserId?: string | null
    bubbleId?: string | null
  }
}): {
  targets: HomeTarget[]
  isLoading: boolean
} {
  const { userId, tab, viewTypes, socialFilter } = params
  const [allTargets, setAllTargets] = useState<HomeTarget[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // 탭별 캐시 (stale-while-revalidate)
  const cacheRef = useRef<Map<string, HomeTarget[]>>(new Map())

  // viewTypes 배열의 안정적 비교를 위한 직렬화 키
  const viewTypesKey = useMemo(() => JSON.stringify(viewTypes.slice().sort()), [viewTypes])
  const socialFilterKey = useMemo(() => {
    if (!socialFilter) return ''
    return `${socialFilter.followingUserId ?? ''}:${socialFilter.bubbleId ?? ''}`
  }, [socialFilter])

  const fetchTargets = useCallback(async () => {
    if (!userId || tab === 'bubble') return
    const targetType: RecordTargetType = tab
    const views: HomeViewType[] = viewTypes.length > 0 ? viewTypes : ALL_HOME_VIEWS

    const cacheKey = `${tab}:${viewTypesKey}:${socialFilterKey}`
    const cached = cacheRef.current.get(cacheKey)

    // 즉시 탭 전환: 캐시 히트 -> 캐시 데이터 표시, 미스 -> 빈 배열
    setAllTargets(cached ?? [])
    setIsLoading(!cached)

    try {
      const sf = socialFilter ? {
        followingUserIds: socialFilter.followingUserId ? [socialFilter.followingUserId] : undefined,
        bubbleIds: socialFilter.bubbleId ? [socialFilter.bubbleId] : undefined,
      } : undefined

      const targets = await homeRepo.findHomeTargets(userId, targetType, views, sf)

      cacheRef.current.set(cacheKey, targets)
      // 캐시와 동일한 데이터면 re-render 방지
      if (!cached || targets.length !== cached.length || targets.some((t, i) => t.targetId !== cached[i]?.targetId)) {
        setAllTargets(targets)
      }
    } catch {
      if (!cached) setAllTargets([])
    } finally {
      setIsLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, tab, viewTypesKey, socialFilterKey])

  useEffect(() => {
    fetchTargets()
  }, [fetchTargets])

  return { targets: allTargets, isLoading }
}
