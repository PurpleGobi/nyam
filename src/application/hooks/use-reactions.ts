'use client'

import { useState, useCallback, useEffect } from 'react'
import type { ReactionType } from '@/domain/entities/reaction'
import { reactionRepo, bookmarkRepo, notificationRepo } from '@/shared/di/container'
import { useSocialXp } from '@/application/hooks/use-social-xp'

interface UseReactionsParams {
  targetType: string
  targetId: string
  userId: string | null
  targetOwnerId?: string | null
  /** bookmark 리액션 시 찜할 대상 정보 (식당/와인) */
  bookmarkTarget?: {
    targetId: string
    targetType: 'restaurant' | 'wine'
  } | null
}

export function useReactions({
  targetType,
  targetId,
  userId,
  targetOwnerId,
  bookmarkTarget,
}: UseReactionsParams) {
  const [counts, setCounts] = useState<Record<ReactionType, number>>({
    like: 0, bookmark: 0, want: 0, check: 0, fire: 0,
  })
  const [myReactions, setMyReactions] = useState<Set<ReactionType>>(new Set())
  const [isLoading, setIsLoading] = useState(false)
  const { awardSocialXp } = useSocialXp()

  const loadBatch = useCallback(async () => {
    const [reactionCounts, reactions] = await Promise.all([
      reactionRepo.getCountsByTarget(targetType, targetId),
      reactionRepo.getByTarget(targetType, targetId),
    ])
    setCounts(reactionCounts)
    if (userId) {
      const mine = new Set<ReactionType>(
        reactions.filter((r) => r.userId === userId).map((r) => r.reactionType),
      )
      setMyReactions(mine)
    }
  }, [targetType, targetId, userId])

  useEffect(() => {
    loadBatch()
  }, [loadBatch])

  const toggle = useCallback(async (reactionType: ReactionType) => {
    if (!userId || isLoading) return
    setIsLoading(true)

    // 낙관적 업데이트: 즉시 UI 갱신
    const prevCounts = { ...counts }
    const prevMyReactions = new Set(myReactions)
    const willAdd = !myReactions.has(reactionType)

    setCounts((prev) => ({
      ...prev,
      [reactionType]: prev[reactionType] + (willAdd ? 1 : -1),
    }))
    setMyReactions((prev) => {
      const next = new Set(prev)
      if (willAdd) next.add(reactionType)
      else next.delete(reactionType)
      return next
    })

    try {
      const result = await reactionRepo.toggle(targetType, targetId, reactionType, userId)

      // bookmark + added -> bookmarks INSERT
      if (result.added && reactionType === 'bookmark' && bookmarkTarget) {
        await bookmarkRepo.toggle(
          userId,
          bookmarkTarget.targetId,
          bookmarkTarget.targetType,
          'bookmark',
        )
      }

      // like + added → 소셜 XP (기록 작성자에게, 본인 제외)
      if (result.added && reactionType === 'like' && targetOwnerId && targetOwnerId !== userId) {
        await awardSocialXp(targetOwnerId, 'like')
      }

      // like/want + added → 알림: reaction_like → 기록 작성자 (본인 제외)
      if (result.added && (reactionType === 'like' || reactionType === 'want') && targetOwnerId && targetOwnerId !== userId) {
        await notificationRepo.createNotification({
          userId: targetOwnerId,
          type: 'reaction_like',
          title: reactionType === 'like' ? '좋아요를 받았습니다' : '누군가 가고싶다고 했습니다',
          body: null,
          actionStatus: null,
          actorId: userId,
          targetType,
          targetId,
          bubbleId: null,
        })
      }
    } catch {
      // 실패 시 롤백
      setCounts(prevCounts)
      setMyReactions(prevMyReactions)
    } finally {
      setIsLoading(false)
    }
  }, [targetType, targetId, userId, isLoading, counts, myReactions, targetOwnerId, bookmarkTarget, awardSocialXp])

  return { counts, myReactions, toggle, isLoading }
}
