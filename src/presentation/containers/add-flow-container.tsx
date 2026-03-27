'use client'

import { useState, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import type { RecordTargetType } from '@/domain/entities/record'
import type { AddFlowStep, AddFlowTarget } from '@/domain/entities/add-flow'
import type { RestaurantAIResult, WineAIResult } from '@/domain/entities/camera'
import { useAuth } from '@/presentation/providers/auth-provider'
import { useCameraCapture } from '@/application/hooks/use-camera-capture'
import { RecordNav } from '@/presentation/components/record/record-nav'
import { CameraCapture } from '@/presentation/components/camera/camera-capture'
import { AIResultDisplay } from '@/presentation/components/camera/ai-result-display'
import { WineConfirmCard } from '@/presentation/components/camera/wine-confirm-card'
import { RecordFlowContainer } from '@/presentation/containers/record-flow-container'

function AddFlowInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useAuth()

  const targetType = (searchParams.get('type') ?? 'restaurant') as RecordTargetType
  const entryPath = searchParams.get('from') ?? 'camera'

  // detail_fab은 바로 record로
  const initialStep: AddFlowStep =
    entryPath === 'detail_fab' ? 'record'
      : entryPath === 'search' ? 'search'
        : 'camera'

  const [step, setStep] = useState<AddFlowStep>(initialStep)
  const [target, setTarget] = useState<AddFlowTarget | null>(
    searchParams.get('targetId')
      ? {
          id: searchParams.get('targetId') ?? '',
          name: searchParams.get('name') ?? '',
          type: targetType,
          meta: searchParams.get('meta') ?? '',
          isAiRecognized: false,
        }
      : null,
  )
  const [stepHistory, setStepHistory] = useState<AddFlowStep[]>([])

  const { isRecognizing, result, identify, reset: resetCamera } = useCameraCapture()

  const pushStep = useCallback((next: AddFlowStep) => {
    setStepHistory((prev) => [...prev, step])
    setStep(next)
  }, [step])

  const goBack = useCallback(() => {
    if (stepHistory.length > 0) {
      const prev = stepHistory[stepHistory.length - 1]
      setStepHistory((h) => h.slice(0, -1))
      setStep(prev)
    } else {
      router.back()
    }
  }, [stepHistory, router])

  const handleCapture = useCallback(
    async (imageBase64: string) => {
      const aiResult = await identify({
        imageBase64,
        targetType,
      })
      if (!aiResult) return

      if (targetType === 'restaurant') {
        const restResult = aiResult as RestaurantAIResult
        if (restResult.isConfidentMatch && restResult.candidates.length > 0) {
          const top = restResult.candidates[0]
          setTarget({
            id: top.restaurantId,
            name: top.name,
            type: 'restaurant',
            meta: [top.genre, top.area].filter(Boolean).join(' · '),
            isAiRecognized: true,
          })
          pushStep('record')
        } else {
          pushStep('ai_result')
        }
      } else {
        const wineResult = aiResult as WineAIResult
        if (wineResult.isConfidentMatch && wineResult.candidates.length > 0) {
          const top = wineResult.candidates[0]
          setTarget({
            id: top.wineId,
            name: top.name,
            type: 'wine',
            meta: [top.wineType, top.region, top.vintage].filter(Boolean).join(' · '),
            isAiRecognized: true,
          })
          pushStep('record')
        } else if (wineResult.candidates.length > 0) {
          pushStep('wine_confirm')
        } else {
          pushStep('search')
        }
      }
    },
    [identify, targetType, pushStep],
  )

  const handleRestaurantSelect = useCallback(
    (restaurantId: string) => {
      if (result?.targetType !== 'restaurant') return
      const restResult = result as RestaurantAIResult
      const selected = restResult.candidates.find((c) => c.restaurantId === restaurantId)
      if (!selected) return
      setTarget({
        id: selected.restaurantId,
        name: selected.name,
        type: 'restaurant',
        meta: [selected.genre, selected.area].filter(Boolean).join(' · '),
        isAiRecognized: true,
      })
      pushStep('record')
    },
    [result, pushStep],
  )

  const handleWineConfirm = useCallback(() => {
    if (result?.targetType !== 'wine') return
    const wineResult = result as WineAIResult
    const top = wineResult.candidates[0]
    if (!top) return
    setTarget({
      id: top.wineId,
      name: top.name,
      type: 'wine',
      meta: [top.wineType, top.region, top.vintage].filter(Boolean).join(' · '),
      isAiRecognized: true,
    })
    pushStep('record')
  }, [result, pushStep])

  const handleSearchFallback = useCallback(() => {
    router.push(`/search?type=${targetType}`)
  }, [router, targetType])

  const variant = targetType === 'wine' ? 'wine' : 'food'

  // step: record → 기존 RecordFlowContainer로 위임 (target 정보를 URL params로 전달)
  if (step === 'record' && target) {
    router.replace(
      `/record?type=${target.type}&targetId=${target.id}&name=${encodeURIComponent(target.name)}&meta=${encodeURIComponent(target.meta)}&from=${entryPath}`,
    )
    return null
  }

  return (
    <div className="flex min-h-dvh flex-col bg-[var(--bg)]">
      <RecordNav
        title={targetType === 'wine' ? '와인 추가' : '식당 추가'}
        variant={variant}
        onBack={goBack}
        onClose={() => router.push('/')}
      />

      {step === 'camera' && (
        <CameraCapture
          targetType={targetType}
          onCapture={handleCapture}
          onAlbumSelect={() => {
            // camera-capture 내부 input이 처리
          }}
          onSearchFallback={handleSearchFallback}
          isRecognizing={isRecognizing}
        />
      )}

      {step === 'ai_result' && result?.targetType === 'restaurant' && (
        <AIResultDisplay
          candidates={(result as RestaurantAIResult).candidates}
          detectedGenre={(result as RestaurantAIResult).detectedGenre}
          onSelect={handleRestaurantSelect}
          onSearchFallback={handleSearchFallback}
        />
      )}

      {step === 'wine_confirm' && result?.targetType === 'wine' && (result as WineAIResult).candidates.length > 0 && (
        <WineConfirmCard
          wineName={(result as WineAIResult).candidates[0].name}
          wineType={(result as WineAIResult).candidates[0].wineType}
          region={(result as WineAIResult).candidates[0].region}
          country={(result as WineAIResult).candidates[0].country}
          vintage={(result as WineAIResult).candidates[0].vintage}
          onConfirm={handleWineConfirm}
          onReject={() => {
            resetCamera()
            setStep('camera')
          }}
        />
      )}

      {step === 'search' && (
        <div className="flex flex-col items-center gap-3 px-6 py-8">
          <p className="text-[15px] text-[var(--text)]">
            {targetType === 'wine' ? '와인을 찾지 못했어요' : '식당을 찾지 못했어요'}
          </p>
          <button
            type="button"
            onClick={handleSearchFallback}
            className="mt-2 w-full max-w-[280px] rounded-xl py-3 text-center text-[14px] font-semibold text-white"
            style={{ backgroundColor: targetType === 'wine' ? 'var(--accent-wine)' : 'var(--accent-food)' }}
          >
            이름으로 검색
          </button>
          <button
            type="button"
            onClick={() => router.push(`/register?type=${targetType}`)}
            className="w-full max-w-[280px] rounded-xl border border-[var(--border)] bg-[var(--bg-card)] py-3 text-center text-[14px] font-medium text-[var(--text)]"
          >
            직접 등록
          </button>
        </div>
      )}
    </div>
  )
}

export function AddFlowContainer() {
  return (
    <Suspense fallback={<div className="flex min-h-dvh items-center justify-center" style={{ color: 'var(--text-hint)' }}>로딩 중...</div>}>
      <AddFlowInner />
    </Suspense>
  )
}
