'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import type { NudgeDisplay } from '@/domain/entities/nudge'
import type { NudgeCandidate } from '@/domain/services/nudge-priority'
import { selectTopNudge } from '@/domain/services/nudge-priority'
import { nudgeRepo } from '@/shared/di/container'

/**
 * 넛지 후보 생성 (Phase 1)
 * - photo: 최근 기록 기반 시뮬레이션 (Phase 1)
 * - unrated: status='checked' 레코드 존재
 * - time: 식사 후 시간대 (12:30~14:00, 19:00~21:00)
 */
function buildCandidates(
  hasUnratedRecords: boolean,
  hasRecentRecords: boolean,
): NudgeCandidate[] {
  const candidates: NudgeCandidate[] = []
  const now = new Date()
  const hour = now.getHours()
  const min = now.getMinutes()
  const timeVal = hour + min / 60

  // Phase 1: 최근 기록 기반 사진 넛지 시뮬레이션
  if (hasRecentRecords) {
    candidates.push({
      type: 'photo',
      priority: 1,
      data: {
        targetId: null,
        icon: 'camera',
        title: '사진이 있으신가요?',
        subtitle: '식사 사진으로 기록해보세요',
        actionLabel: '기록',
        actionHref: '/add?type=restaurant',
      },
    })
  }

  if (hasUnratedRecords) {
    candidates.push({
      type: 'unrated',
      priority: 2,
      data: {
        targetId: null,
        icon: 'star',
        title: '미평가 기록',
        subtitle: '평가를 완성해보세요',
        actionLabel: '평가하기',
        actionHref: '/home',
      },
    })
  }

  if ((timeVal >= 12.5 && timeVal < 14) || (timeVal >= 19 && timeVal < 21)) {
    candidates.push({
      type: 'meal_time',
      priority: 3,
      data: {
        targetId: null,
        icon: 'utensils',
        title: '식사 시간',
        subtitle: '방금 먹은 거 기록해볼까요?',
        actionLabel: '기록',
        actionHref: '/record/new',
      },
    })
  }

  return candidates
}

interface UseNudgeParams {
  userId: string | null
  hasUnratedRecords: boolean
  hasRecentRecords: boolean
}

export function useNudge({ userId, hasUnratedRecords, hasRecentRecords }: UseNudgeParams) {
  const [nudge, setNudge] = useState<NudgeDisplay | null>(null)
  const [isVisible, setIsVisible] = useState(false)
  const [isDismissing, setIsDismissing] = useState(false)
  const fetchedRef = useRef(false)
  const nudgeIdRef = useRef<string | null>(null)

  useEffect(() => {
    if (!userId || fetchedRef.current) return
    fetchedRef.current = true

    let cancelled = false

    async function load() {
      try {
        const [fatigue, history] = await Promise.all([
          nudgeRepo.getFatigue(userId as string),
          nudgeRepo.getRecentHistory(userId as string, 24),
        ])

        if (cancelled) return

        const candidates = buildCandidates(hasUnratedRecords, hasRecentRecords)
        const top = selectTopNudge(candidates, fatigue, history)
        setNudge(top)
        setIsVisible(top !== null)
      } catch {
        // 넛지 로드 실패 시 조용히 무시
      }
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [userId, hasUnratedRecords, hasRecentRecords])

  /** 소멸 애니메이션 시작 (외부에서 호출 가능 — AI 인사 동기화용) */
  const startDismiss = useCallback(() => {
    if (!isVisible || isDismissing) return
    setIsDismissing(true)
    setTimeout(() => setIsVisible(false), 600)
  }, [isVisible, isDismissing])

  const router = useRouter()

  const handleAction = useCallback(() => {
    setIsDismissing(true)
    setTimeout(() => setIsVisible(false), 600)

    if (nudge?.actionHref) {
      router.push(nudge.actionHref)
    }

    if (nudgeIdRef.current && userId) {
      nudgeRepo.updateStatus(nudgeIdRef.current, 'acted').catch(() => {})
    }
  }, [userId, nudge, router])

  const handleDismiss = useCallback(() => {
    setIsDismissing(true)
    setTimeout(() => setIsVisible(false), 600)

    if (userId) {
      nudgeRepo.incrementFatigue(userId).catch(() => {})
      if (nudgeIdRef.current) {
        nudgeRepo.updateStatus(nudgeIdRef.current, 'dismissed').catch(() => {})
      }
    }
  }, [userId])

  return { nudge, isVisible, isDismissing, startDismiss, handleAction, handleDismiss }
}
