'use client'

import { useState, useCallback } from 'react'

interface RegisterResult {
  id: string
  name: string
  type: 'restaurant' | 'wine'
  isExisting: boolean
}

export function useRegister() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const registerRestaurant = useCallback(async (data: { name: string; genre?: string; area?: string }): Promise<RegisterResult | null> => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/restaurants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error('등록 실패')
      return await res.json()
    } catch (err) {
      setError(err instanceof Error ? err.message : '등록에 실패했습니다')
      return null
    } finally {
      setIsLoading(false)
    }
  }, [])

  const registerWine = useCallback(async (data: {
    name: string; wineType: string; producer?: string; vintage?: number; region?: string; country?: string
  }): Promise<RegisterResult | null> => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/wines', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error('등록 실패')
      return await res.json()
    } catch (err) {
      setError(err instanceof Error ? err.message : '등록에 실패했습니다')
      return null
    } finally {
      setIsLoading(false)
    }
  }, [])

  return { registerRestaurant, registerWine, isLoading, error }
}
