'use client'

import { useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import type { CameraMode } from '@/domain/entities/record'
import type { RestaurantAIResult, WineAIResult } from '@/domain/entities/camera'
import { useCameraCapture } from '@/application/hooks/use-camera-capture'
import { RecordNav } from '@/presentation/components/record/record-nav'
import { CameraCapture } from '@/presentation/components/camera/camera-capture'
import { AIResultDisplay } from '@/presentation/components/camera/ai-result-display'
import { WineConfirmCard } from '@/presentation/components/camera/wine-confirm-card'

interface CameraContainerProps {
  targetType: 'restaurant' | 'wine'
}

type CameraStep = 'capture' | 'recognizing' | 'result' | 'wine-confirm'

export function CameraContainer({ targetType }: CameraContainerProps) {
  const router = useRouter()
  const { isRecognizing, result, error, identify, reset } = useCameraCapture()
  const [step, setStep] = useState<CameraStep>('capture')
  const [cameraMode, setCameraMode] = useState<CameraMode>('individual')
  const albumInputRef = useRef<HTMLInputElement>(null)

  const handleCapture = useCallback(
    async (imageBase64: string) => {
      setStep('recognizing')

      const aiResult = await identify({
        imageBase64,
        targetType,
        cameraMode: targetType === 'wine' ? cameraMode : undefined,
      })

      if (!aiResult) {
        setStep('capture')
        return
      }

      if (targetType === 'restaurant') {
        const restResult = aiResult as RestaurantAIResult
        if (restResult.isConfidentMatch && restResult.candidates.length > 0) {
          const top = restResult.candidates[0]
          router.push(
            `/record?type=restaurant&targetId=${top.restaurantId}&name=${encodeURIComponent(top.name)}&meta=${encodeURIComponent([top.genre, top.area].filter(Boolean).join(' · '))}`,
          )
        } else {
          setStep('result')
        }
      } else {
        const wineResult = aiResult as WineAIResult
        if (wineResult.isConfidentMatch && wineResult.candidates.length > 0) {
          const top = wineResult.candidates[0]
          router.push(
            `/record?type=wine&targetId=${top.wineId}&name=${encodeURIComponent(top.name)}&meta=${encodeURIComponent([top.wineType, top.region, top.vintage].filter(Boolean).join(' · '))}`,
          )
        } else if (wineResult.candidates.length > 0) {
          setStep('wine-confirm')
        } else {
          setStep('result')
        }
      }
    },
    [identify, targetType, cameraMode, router],
  )

  const handleAlbumSelect = useCallback(() => {
    albumInputRef.current?.click()
  }, [])

  const handleAlbumFile = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return
      const reader = new FileReader()
      reader.onload = () => {
        const base64 = (reader.result as string).split(',')[1]
        handleCapture(base64)
      }
      reader.readAsDataURL(file)
      e.target.value = ''
    },
    [handleCapture],
  )

  const handleSearchFallback = useCallback(() => {
    router.push(`/search?type=${targetType}`)
  }, [router, targetType])

  const handleRestaurantSelect = useCallback(
    (restaurantId: string) => {
      if (result?.targetType !== 'restaurant') return
      const restResult = result as RestaurantAIResult
      const selected = restResult.candidates.find((c) => c.restaurantId === restaurantId)
      if (!selected) return
      router.push(
        `/record?type=restaurant&targetId=${selected.restaurantId}&name=${encodeURIComponent(selected.name)}&meta=${encodeURIComponent([selected.genre, selected.area].filter(Boolean).join(' · '))}`,
      )
    },
    [result, router],
  )

  const handleWineConfirm = useCallback(() => {
    if (result?.targetType !== 'wine') return
    const wineResult = result as WineAIResult
    const top = wineResult.candidates[0]
    if (!top) return
    router.push(
      `/record?type=wine&targetId=${top.wineId}&name=${encodeURIComponent(top.name)}&meta=${encodeURIComponent([top.wineType, top.region, top.vintage].filter(Boolean).join(' · '))}`,
    )
  }, [result, router])

  const handleWineReject = useCallback(() => {
    reset()
    setStep('capture')
  }, [reset])

  const variant = targetType === 'wine' ? 'wine' : 'food'

  return (
    <div className="flex min-h-dvh flex-col bg-[var(--bg)]">
      <RecordNav
        title={targetType === 'wine' ? '와인 추가' : '식당 추가'}
        variant={variant}
        onBack={() => router.back()}
        onClose={() => router.push('/')}
      />

      <input
        ref={albumInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleAlbumFile}
      />

      {error && (
        <div className="mx-4 mt-2 rounded-lg bg-[color-mix(in_srgb,var(--negative)_10%,transparent)] px-4 py-3 text-[13px] text-[var(--negative)]">
          {error}
        </div>
      )}

      {(step === 'capture' || step === 'recognizing') && (
        <CameraCapture
          targetType={targetType}
          onCapture={handleCapture}
          onAlbumSelect={handleAlbumSelect}
          onSearchFallback={handleSearchFallback}
          onShelfMode={targetType === 'wine' ? () => setCameraMode('shelf') : undefined}
          onReceiptMode={targetType === 'wine' ? () => setCameraMode('receipt') : undefined}
          isRecognizing={isRecognizing}
        />
      )}

      {step === 'result' && result?.targetType === 'restaurant' && (
        <AIResultDisplay
          candidates={(result as RestaurantAIResult).candidates}
          detectedGenre={(result as RestaurantAIResult).detectedGenre}
          onSelect={handleRestaurantSelect}
          onSearchFallback={handleSearchFallback}
        />
      )}

      {step === 'result' && result?.targetType === 'wine' && (
        <div className="flex flex-col items-center gap-3 px-6 py-8">
          <p className="text-[15px] text-[var(--text)]">와인을 찾지 못했어요</p>
          <button
            type="button"
            onClick={handleSearchFallback}
            className="mt-2 w-full max-w-[280px] rounded-xl bg-[var(--accent-wine)] py-3 text-center text-[14px] font-semibold"
            style={{ color: '#FFFFFF' }}
          >
            이름으로 검색
          </button>
          <button
            type="button"
            onClick={() => router.push('/register?type=wine')}
            className="w-full max-w-[280px] rounded-xl border border-[var(--border)] bg-[var(--bg-card)] py-3 text-center text-[14px] font-medium text-[var(--text)]"
          >
            직접 등록
          </button>
        </div>
      )}

      {step === 'wine-confirm' && result?.targetType === 'wine' && (result as WineAIResult).candidates.length > 0 && (
        <WineConfirmCard
          wineName={(result as WineAIResult).candidates[0].name}
          wineType={(result as WineAIResult).candidates[0].wineType}
          region={(result as WineAIResult).candidates[0].region}
          country={(result as WineAIResult).candidates[0].country}
          vintage={(result as WineAIResult).candidates[0].vintage}
          onConfirm={handleWineConfirm}
          onReject={handleWineReject}
        />
      )}
    </div>
  )
}
