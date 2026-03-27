'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { generateGreeting } from '@/domain/services/greeting-generator'

const SESSION_KEY = 'nyam_greeting_shown'

interface UseAiGreetingParams {
  nickname: string
  weeklyCount: number
}

export function useAiGreeting({ nickname, weeklyCount }: UseAiGreetingParams) {
  const [isVisible, setIsVisible] = useState(() => {
    if (typeof window === 'undefined') return false
    return !sessionStorage.getItem(SESSION_KEY)
  })

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const greeting = generateGreeting(new Date().getHours(), nickname, weeklyCount)

  const dismiss = useCallback(() => {
    setIsVisible(false)
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(SESSION_KEY, '1')
    }
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!isVisible) return

    timerRef.current = setTimeout(() => {
      dismiss()
    }, 5000)

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }
    }
  }, [isVisible, dismiss])

  return { greeting, isVisible, dismiss }
}
