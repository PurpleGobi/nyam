'use client'

import { useState, useCallback, useEffect } from 'react'
import type { ReactionType } from '@/domain/entities/reaction'
import { reactionRepo } from '@/shared/di/container'
import { sendNotification } from '@/application/helpers/send-notification'
import { useSocialXp } from '@/application/hooks/use-social-xp'

interface UseReactionsParams {
  targetType: string
  targetId: string
  userId: string | null
  targetOwnerId?: string | null
}

export function useReactions({
  targetType,
  targetId,
  userId,
  targetOwnerId,
}: UseReactionsParams) {
  const [counts, setCounts] = useState<Record<ReactionType, number>>({
    good: 0, bad: 0,
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

    // 낙관적 업데이트: 즉시 UI 갱신 (good↔bad 상호 배타)
    const prevCounts = { ...counts }
    const prevMyReactions = new Set(myReactions)
    const willAdd = !myReactions.has(reactionType)
    const opposite: ReactionType = reactionType === 'good' ? 'bad' : 'good'
    const hadOpposite = myReactions.has(opposite)

    setCounts((prev) => ({
      ...prev,
      [reactionType]: prev[reactionType] + (willAdd ? 1 : -1),
      ...(willAdd && hadOpposite ? { [opposite]: Math.max(0, prev[opposite] - 1) } : {}),
    }))
    setMyReactions((prev) => {
      const next = new Set(prev)
      if (willAdd) {
        next.add(reactionType)
        next.delete(opposite) // 반대쪽 해제
      } else {
        next.delete(reactionType)
      }
      return next
    })

    try {
      const result = await reactionRepo.toggle(targetType, targetId, reactionType, userId)

      // good + added → 소셜 XP (기록 작성자에게, 본인 제외)
      if (result.added && reactionType === 'good' && targetOwnerId && targetOwnerId !== userId) {
        await awardSocialXp(targetOwnerId, 'good')
      }

      // good + added → 알림: reaction_like → 기록 작성자 (본인 제외)
      if (result.added && reactionType === 'good' && targetOwnerId && targetOwnerId !== userId) {
        sendNotification({
          userId: targetOwnerId,
          type: 'reaction_like',
          title: '좋아요를 받았습니다',
          body: null,
          actionStatus: null,
          actorId: userId,
          targetType,
          targetId,
          bubbleId: null,
        }).catch(() => {})
      }
    } catch {
      // 실패 시 롤백
      setCounts(prevCounts)
      setMyReactions(prevMyReactions)
    } finally {
      setIsLoading(false)
    }
  }, [targetType, targetId, userId, isLoading, counts, myReactions, targetOwnerId, awardSocialXp])

  return { counts, myReactions, toggle, isLoading }
}
