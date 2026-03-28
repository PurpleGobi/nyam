'use client'

import { useCallback, useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import type { RecordTargetType } from '@/domain/entities/record'
import type { CreateRestaurantInput, CreateWineInput } from '@/domain/entities/register'
import { useRegister } from '@/application/hooks/use-register'
import { RecordNav } from '@/presentation/components/record/record-nav'
import { RestaurantRegisterForm } from '@/presentation/components/register/restaurant-register-form'
import { WineRegisterForm } from '@/presentation/components/register/wine-register-form'

function RegisterInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const targetType = (searchParams.get('type') ?? 'restaurant') as RecordTargetType
  const initialName = searchParams.get('name') ?? ''
  const initialProducer = searchParams.get('producer') ?? undefined
  const initialVintage = searchParams.get('vintage') ? Number(searchParams.get('vintage')) : undefined
  const initialWineType = searchParams.get('wineType') ?? undefined

  const { registerRestaurant, registerWine, isSubmitting, error } = useRegister()
  const [gps, setGps] = useState<{ lat: number; lng: number } | null>(null)

  useEffect(() => {
    if (targetType !== 'restaurant') return
    navigator.geolocation?.getCurrentPosition(
      (pos) => setGps({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {},
      { timeout: 5000 },
    )
  }, [targetType])

  const handleRestaurantSubmit = useCallback(
    async (data: CreateRestaurantInput) => {
      const result = await registerRestaurant(data)
      if (!result) return

      router.push(
        `/record?type=restaurant&targetId=${result.id}&name=${encodeURIComponent(result.name)}&meta=${encodeURIComponent([data.genre, data.area].filter(Boolean).join(' · '))}`,
      )
    },
    [router, registerRestaurant],
  )

  const handleWineSubmit = useCallback(
    async (data: CreateWineInput) => {
      const result = await registerWine(data)
      if (!result) return

      router.push(
        `/record?type=wine&targetId=${result.id}&name=${encodeURIComponent(result.name)}&meta=${encodeURIComponent([data.wineType, data.region, data.vintage].filter(Boolean).join(' · '))}`,
      )
    },
    [router, registerWine],
  )

  return (
    <div className="flex min-h-dvh flex-col bg-[var(--bg)]">
      <RecordNav
        title={targetType === 'wine' ? '와인 등록' : '식당 등록'}
        variant={targetType === 'wine' ? 'wine' : 'food'}
        onBack={() => router.back()}
        onClose={() => router.push('/')}
      />

      {error && (
        <div className="mx-4 mt-2 rounded-lg bg-[color-mix(in_srgb,var(--negative)_10%,transparent)] px-4 py-2.5 text-[13px] text-[var(--negative)]">
          {error}
        </div>
      )}

      {targetType === 'restaurant' ? (
        <RestaurantRegisterForm
          initialName={initialName}
          currentLat={gps?.lat}
          currentLng={gps?.lng}
          onSubmit={handleRestaurantSubmit}
          isLoading={isSubmitting}
          error={error}
        />
      ) : (
        <WineRegisterForm
          initialName={initialName}
          initialProducer={initialProducer}
          initialVintage={initialVintage}
          initialWineType={initialWineType}
          onSubmit={handleWineSubmit}
          isLoading={isSubmitting}
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
