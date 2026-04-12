'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { bookmarkRepo } from '@/shared/di/container'

export interface UseBookmarkReturn {
  isBookmarked: boolean
  isLoading: boolean
  toggle: () => Promise<void>
}

/**
 * 리스트 뷰에서 여러 아이템의 찜 토글을 관리하는 훅
 * HomeTarget.isBookmarked 초기값을 존중하고, 토글 시 로컬 오버라이드 + DB 반영
 */
export function useBookmarkMap(
  userId: string | null,
  onBubbleSync?: (targetId: string, targetType: 'restaurant' | 'wine', isBookmarked: boolean) => void,
) {
  const overrides = useRef(new Map<string, boolean>())
  const [, forceUpdate] = useState(0)

  const getIsBookmarked = useCallback((targetId: string, serverValue: boolean): boolean => {
    return overrides.current.has(targetId)
      ? (overrides.current.get(targetId) ?? serverValue)
      : serverValue
  }, [])

  const toggle = useCallback(async (targetId: string, targetType: 'restaurant' | 'wine', currentValue: boolean) => {
    if (!userId) return

    const next = !currentValue
    overrides.current.set(targetId, next)
    forceUpdate((n) => n + 1)

    try {
      const result = await bookmarkRepo.toggle(userId, targetId, targetType, 'bookmark')
      overrides.current.set(targetId, result)
      forceUpdate((n) => n + 1)
      onBubbleSync?.(targetId, targetType, result)
    } catch {
      overrides.current.set(targetId, currentValue)
      forceUpdate((n) => n + 1)
    }
  }, [userId, onBubbleSync])

  /** 여러 아이템 한번에 찜 추가 */
  const batchAdd = useCallback(async (targets: Array<{ targetId: string; targetType: 'restaurant' | 'wine' }>) => {
    if (!userId || targets.length === 0) return

    // optimistic
    for (const t of targets) {
      overrides.current.set(t.targetId, true)
    }
    forceUpdate((n) => n + 1)

    try {
      await bookmarkRepo.batchAdd(userId, targets, 'bookmark')
      for (const t of targets) {
        onBubbleSync?.(t.targetId, t.targetType, true)
      }
    } catch {
      for (const t of targets) {
        overrides.current.delete(t.targetId)
      }
      forceUpdate((n) => n + 1)
    }
  }, [userId, onBubbleSync])

  /** 여러 아이템 한번에 찜 해제 */
  const batchRemove = useCallback(async (targets: Array<{ targetId: string; targetType: 'restaurant' | 'wine' }>) => {
    if (!userId || targets.length === 0) return

    const targetIds = targets.map((t) => t.targetId)

    // optimistic
    for (const id of targetIds) {
      overrides.current.set(id, false)
    }
    forceUpdate((n) => n + 1)

    try {
      await bookmarkRepo.batchRemove(userId, targetIds, 'bookmark')
      for (const t of targets) {
        onBubbleSync?.(t.targetId, t.targetType, false)
      }
    } catch {
      for (const id of targetIds) {
        overrides.current.delete(id)
      }
      forceUpdate((n) => n + 1)
    }
  }, [userId, onBubbleSync])

  return { getIsBookmarked, toggle, batchAdd, batchRemove }
}

/**
 * 찜(bookmark) 토글 -- bookmarks 테이블 기반
 */
export function useBookmark(
  userId: string | null,
  targetId: string | null,
  targetType: 'restaurant' | 'wine',
  onBubbleSync?: (targetId: string, targetType: 'restaurant' | 'wine', isBookmarked: boolean) => void,
): UseBookmarkReturn {
  const [isBookmarked, setIsBookmarked] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (!userId || !targetId) return
    bookmarkRepo.isBookmarked(userId, targetId, targetType).then((result) => {
      setIsBookmarked(result)
    }).catch(() => {
      setIsBookmarked(false)
    })
  }, [userId, targetId, targetType])

  const toggle = useCallback(async () => {
    if (!userId || !targetId || isLoading) return
    setIsLoading(true)

    const next = !isBookmarked
    setIsBookmarked(next)

    try {
      const result = await bookmarkRepo.toggle(userId, targetId, targetType, 'bookmark')
      setIsBookmarked(result)
      // 찜 상태 변경 후 버블 동기화 트리거
      onBubbleSync?.(targetId, targetType, result)
    } catch {
      setIsBookmarked(!next)
    } finally {
      setIsLoading(false)
    }
  }, [userId, targetId, targetType, isBookmarked, isLoading, onBubbleSync])

  return { isBookmarked, isLoading, toggle }
}
