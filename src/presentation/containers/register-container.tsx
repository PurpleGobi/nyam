'use client'

import { useState, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import type { RecordTargetType } from '@/domain/entities/record'
import { RecordNav } from '@/presentation/components/record/record-nav'
import { RestaurantRegisterForm } from '@/presentation/components/register/restaurant-register-form'
import { WineRegisterForm } from '@/presentation/components/register/wine-register-form'

function RegisterInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const targetType = (searchParams.get('type') ?? 'restaurant') as RecordTargetType
  const initialName = searchParams.get('name') ?? ''

  const [isLoading, setIsLoading] = useState(false)

  const handleRestaurantSubmit = useCallback(
    async (data: { name: string; genre?: string; area?: string }) => {
      setIsLoading(true)
      try {
        const response = await fetch('/api/restaurants', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        })
        const result = await response.json()

        router.push(
          `/record?type=restaurant&targetId=${result.id}&name=${encodeURIComponent(result.name)}&meta=${encodeURIComponent([data.genre, data.area].filter(Boolean).join(' · '))}`,
        )
      } finally {
        setIsLoading(false)
      }
    },
    [router],
  )

  const handleWineSubmit = useCallback(
    async (data: {
      name: string
      wineType: string
      producer?: string
      vintage?: number
      region?: string
      country?: string
    }) => {
      setIsLoading(true)
      try {
        const response = await fetch('/api/wines', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        })
        const result = await response.json()

        router.push(
          `/record?type=wine&targetId=${result.id}&name=${encodeURIComponent(result.name)}&meta=${encodeURIComponent([data.wineType, data.region, data.vintage].filter(Boolean).join(' · '))}`,
        )
      } finally {
        setIsLoading(false)
      }
    },
    [router],
  )

  return (
    <div className="flex min-h-dvh flex-col bg-[var(--bg)]">
      <RecordNav
        title={targetType === 'wine' ? '와인 등록' : '식당 등록'}
        variant={targetType === 'wine' ? 'wine' : 'food'}
        onBack={() => router.back()}
        onClose={() => router.push('/')}
      />

      {targetType === 'restaurant' ? (
        <RestaurantRegisterForm
          initialName={initialName}
          onSubmit={handleRestaurantSubmit}
          isLoading={isLoading}
        />
      ) : (
        <WineRegisterForm
          initialName={initialName}
          onSubmit={handleWineSubmit}
          isLoading={isLoading}
        />
      )}
    </div>
  )
}

export function RegisterContainer() {
  return (
    <Suspense fallback={<div className="flex min-h-dvh items-center justify-center" style={{ color: 'var(--text-hint)' }}>로딩 중...</div>}>
      <RegisterInner />
    </Suspense>
  )
}
