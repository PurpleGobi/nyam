'use client'

import { useState, useEffect } from 'react'
import { notificationRepo } from '@/shared/di/container'

export function useUnreadCount(userId: string | null) {
  const [count, setCount] = useState(0)
  const [isLoading, setIsLoading] = useState(!!userId)

  useEffect(() => {
    if (!userId) return
    notificationRepo.getUnreadCount(userId).then((c) => {
      setCount(c)
      setIsLoading(false)
    })

    // 30초 폴링
    const interval = setInterval(() => {
      notificationRepo.getUnreadCount(userId).then(setCount)
    }, 30000)

    return () => clearInterval(interval)
  }, [userId])

  return { count, isLoading }
}
