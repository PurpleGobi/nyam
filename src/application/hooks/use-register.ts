'use client'

import { useState, useCallback } from 'react'
import type { CreateRestaurantInput, CreateWineInput, RegisterResult } from '@/domain/entities/register'

export function useRegister() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const registerRestaurant = useCallback(async (
    input: CreateRestaurantInput,
  ): Promise<RegisterResult | null> => {
    if (!input.name.trim()) {
      setError('가게명을 입력해주세요')
      return null
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const res = await fetch('/api/restaurants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: input.name,
          address: input.address,
          area: input.area,
          genre: input.genre,
          priceRange: input.priceRange,
          lat: input.lat,
          lng: input.lng,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error === 'NAME_REQUIRED' ? '가게명을 입력해주세요' : '등록에 실패했습니다')
        return null
      }

      return data as RegisterResult
    } catch {
      setError('네트워크 오류가 발생했습니다')
      return null
    } finally {
      setIsSubmitting(false)
    }
  }, [])

  const registerWine = useCallback(async (
    input: CreateWineInput,
  ): Promise<RegisterResult | null> => {
    if (!input.name.trim()) {
      setError('와인명을 입력해주세요')
      return null
    }
    if (!input.wineType) {
      setError('와인 타입을 선택해주세요')
      return null
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const res = await fetch('/api/wines', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: input.name,
          producer: input.producer,
          wineType: input.wineType,
          vintage: input.vintage,
          region: input.region,
          country: input.country,
          variety: input.variety,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        const errorMap: Record<string, string> = {
          NAME_REQUIRED: '와인명을 입력해주세요',
          WINE_TYPE_REQUIRED: '와인 타입을 선택해주세요',
        }
        setError(errorMap[data.error] ?? '등록에 실패했습니다')
        return null
      }

      return data as RegisterResult
    } catch {
      setError('네트워크 오류가 발생했습니다')
      return null
    } finally {
      setIsSubmitting(false)
    }
  }, [])

  const reset = useCallback(() => {
    setIsSubmitting(false)
    setError(null)
  }, [])

  return { registerRestaurant, registerWine, isSubmitting, error, reset }
}
