'use client'

import { useCallback } from 'react'
import { useRouter } from 'next/navigation'
import type { WineAIResult } from '@/domain/entities/camera'
import { WineConfirmCard } from '@/presentation/components/camera/wine-confirm-card'

interface WineConfirmContainerProps {
  result: WineAIResult
  onReject: () => void
}

export function WineConfirmContainer({ result, onReject }: WineConfirmContainerProps) {
  const router = useRouter()
  const top = result.candidates[0]

  const handleConfirm = useCallback(() => {
    if (!top) return
    router.push(
      `/record?type=wine&targetId=${top.wineId}&name=${encodeURIComponent(top.name)}&meta=${encodeURIComponent([top.wineType, top.region, top.vintage].filter(Boolean).join(' · '))}`,
    )
  }, [top, router])

  if (!top) return null

  return (
    <WineConfirmCard
      wineName={top.name}
      wineType={top.wineType}
      region={top.region}
      country={top.country}
      vintage={top.vintage}
      onConfirm={handleConfirm}
      onReject={onReject}
    />
  )
}
