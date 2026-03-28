'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { generateGreeting } from '@/domain/services/greeting-generator'
import type { GreetingContext, GreetingResult } from '@/domain/services/greeting-generator'

const SESSION_KEY = 'nyam_greeting_shown'

export type { GreetingContext }

interface UseAiGreetingParams {
  recentRecords: GreetingContext['recentRecords']
  weeklyRecordCount: number
  frequentArea: string | null
}

/**
 * AI 인사말 훅
 * - 세션 첫 방문 시 1회만 생성 (sessionStorage)
 * - 5초 타이머 후 자동 dismiss
 * - dismiss(): isDismissing → 600ms 후 isVisible = false
 */
export function useAiGreeting({ recentRecords, weeklyRecordCount, frequentArea }: UseAiGreetingParams) {
  const [isVisible, setIsVisible] = useState(() => {
    if (typeof window === 'undefined') return false
    return !sessionStorage.getItem(SESSION_KEY)
  })
  const [isDismissing, setIsDismissing] = useState(false)

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const greeting: GreetingResult = useMemo(() => {
    return generateGreeting({
      currentHour: new Date().getHours(),
      recentRecords,
      weeklyRecordCount,
      frequentArea,
    })
  }, [recentRecords, weeklyRecordCount, frequentArea])

  const dismiss = useCallback(() => {
    setIsDismissing(true)
    // 600ms 애니메이션 후 완전 제거
    setTimeout(() => {
      setIsVisible(false)
      if (typeof window !== 'undefined') {
        sessionStorage.setItem(SESSION_KEY, '1')
      }
    }, 600)
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!isVisible || isDismissing) return

    timerRef.current = setTimeout(() => {
      dismiss()
    }, 5000)

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }
    }
  }, [isVisible, isDismissing, dismiss])

  return { greeting, isVisible, isDismissing, dismiss }
}
