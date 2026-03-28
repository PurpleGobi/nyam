'use client'

import { useCallback, useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import type { RecordTargetType } from '@/domain/entities/record'
import type { AddFlowStep } from '@/domain/entities/add-flow'
import type { RestaurantAIResult, WineAIResult } from '@/domain/entities/camera'
import { useAuth } from '@/presentation/providers/auth-provider'
import { useAddFlow } from '@/application/hooks/use-add-flow'
import { useCameraCapture } from '@/application/hooks/use-camera-capture'
import { useCreateRecord } from '@/application/hooks/use-create-record'
import { photoRepo, imageService } from '@/shared/di/container'
import { parseExifFromBase64 } from '@/shared/utils/exif-parser'
import { RecordNav } from '@/presentation/components/record/record-nav'
import { CameraCapture } from '@/presentation/components/camera/camera-capture'
import { AIResultDisplay } from '@/presentation/components/camera/ai-result-display'
import { WineConfirmCard } from '@/presentation/components/camera/wine-confirm-card'
import { SuccessScreen } from '@/presentation/components/add-flow/success-screen'

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

  const { step, target, pushStep, setTarget, goBack: hookGoBack, reset: resetFlow } = useAddFlow({
    initialStep,
    initialTarget: searchParams.get('targetId')
      ? {
          id: searchParams.get('targetId') ?? '',
          name: searchParams.get('name') ?? '',
          type: targetType,
          meta: searchParams.get('meta') ?? '',
          isAiRecognized: false,
        }
      : null,
  })

  const { isRecognizing, result, identify, reset: resetCamera } = useCameraCapture()
  const { createRecord, isLoading: isQuickAdding } = useCreateRecord()
  const [gps, setGps] = useState<{ latitude: number; longitude: number } | null>(null)
  const [capturedImage, setCapturedImage] = useState<string | null>(null)

  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(
      (pos) => setGps({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
      () => {},
      { enableHighAccuracy: true, timeout: 5000 },
    )
  }, [])

  /** 촬영 이미지를 리사이즈 → Storage 업로드 → photo 레코드 저장 */
  const uploadCapturedPhoto = useCallback(async (recordId: string) => {
    if (!capturedImage || !user) return
    try {
      const byteString = atob(capturedImage)
      const ab = new ArrayBuffer(byteString.length)
      const ia = new Uint8Array(ab)
      for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i)
      }
      const file = new File([ab], 'camera-capture.jpg', { type: 'image/jpeg' })
      const blob = await imageService.resizeImage(file)
      const url = await imageService.uploadImage(user.id, recordId, blob, crypto.randomUUID())
      await photoRepo.savePhotos(recordId, [{ url, orderIndex: 0 }])
    } catch {
      // 사진 업로드 실패해도 record는 유지
    }
  }, [capturedImage, user])

  const goBack = useCallback(() => {
    const prev = hookGoBack()
    if (prev === null) {
      router.back()
    }
  }, [hookGoBack, router])

  const handleShelfMode = useCallback(
    async (imageBase64: string) => {
      const aiResult = await identify({
        imageBase64,
        targetType: 'wine',
        cameraMode: 'shelf',
        latitude: gps?.latitude,
        longitude: gps?.longitude,
      })
      if (!aiResult) return
      const wineResult = aiResult as WineAIResult
      if (wineResult.candidates.length === 1) {
        // 단일 후보 → wine_confirm
        pushStep('wine_confirm')
      } else {
        pushStep('search')
      }
    },
    [identify, gps, pushStep],
  )

  const handleReceiptMode = useCallback(
    async (imageBase64: string) => {
      const aiResult = await identify({
        imageBase64,
        targetType: 'wine',
        cameraMode: 'receipt',
        latitude: gps?.latitude,
        longitude: gps?.longitude,
      })
      if (!aiResult) return
      const wineResult = aiResult as WineAIResult
      if (wineResult.candidates.length === 1) {
        // 단일 후보 → wine_confirm
        pushStep('wine_confirm')
      } else {
        pushStep('search')
      }
    },
    [identify, gps, pushStep],
  )

  /** confident match → quickAdd(checked) → success, 아니면 ai_result/wine_confirm/search */
  const handleCapture = useCallback(
    async (imageBase64: string) => {
      setCapturedImage(imageBase64)

      const aiResult = await identify({
        imageBase64,
        targetType,
        latitude: gps?.latitude,
        longitude: gps?.longitude,
      })
      if (!aiResult) return

      if (targetType === 'restaurant') {
        const restResult = aiResult as RestaurantAIResult
        if (restResult.isConfidentMatch && restResult.candidates.length > 0) {
          const top = restResult.candidates[0]
          const newTarget = {
            id: top.restaurantId,
            name: top.name,
            type: 'restaurant' as const,
            meta: [top.genre, top.area].filter(Boolean).join(' · '),
            isAiRecognized: true,
          }
          setTarget(newTarget)
          // 빠른추가: checked 기록 INSERT → success
          if (user) {
            try {
              // EXIF GPS 검증 (candidate에 좌표 없으므로 GPS 존재여부만 기록)
              const exif = await parseExifFromBase64(imageBase64)
              const record = await createRecord({
                userId: user.id,
                targetId: top.restaurantId,
                targetType: 'restaurant',
                status: 'checked',
                hasExifGps: exif.hasGps,
                isExifVerified: false,
              })
              await uploadCapturedPhoto(record.id)
              pushStep('success')
              return
            } catch {
              // quickAdd 실패 → full record form으로 폴백
            }
          }
          pushStep('record')
        } else if (restResult.candidates.length > 0) {
          pushStep('ai_result')
        } else {
          pushStep('search')
        }
      } else {
        const wineResult = aiResult as WineAIResult
        if (wineResult.isConfidentMatch && wineResult.candidates.length > 0) {
          const top = wineResult.candidates[0]
          const newTarget = {
            id: top.wineId,
            name: top.name,
            type: 'wine' as const,
            meta: [top.wineType, top.region, top.vintage].filter(Boolean).join(' · '),
            isAiRecognized: true,
          }
          setTarget(newTarget)
          // 빠른추가: checked 기록 INSERT → success
          if (user) {
            try {
              // EXIF GPS 검증
              const exif = await parseExifFromBase64(imageBase64)
              const record = await createRecord({
                userId: user.id,
                targetId: top.wineId,
                targetType: 'wine',
                status: 'checked',
                wineStatus: 'tasted',
                hasExifGps: exif.hasGps,
                isExifVerified: false,
              })
              await uploadCapturedPhoto(record.id)
              pushStep('success')
              return
            } catch {
              // quickAdd 실패 → full record form으로 폴백
            }
          }
          pushStep('record')
        } else if (wineResult.candidates.length > 0) {
          pushStep('wine_confirm')
        } else {
          pushStep('search')
        }
      }
    },
    [identify, targetType, gps, pushStep, setTarget, user, createRecord, uploadCapturedPhoto],
  )

  const handleRestaurantSelect = useCallback(
    async (restaurantId: string) => {
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
      // 빠른추가 시도
      if (user && capturedImage) {
        try {
          const exif = await parseExifFromBase64(capturedImage)
          const record = await createRecord({
            userId: user.id,
            targetId: selected.restaurantId,
            targetType: 'restaurant',
            status: 'checked',
            hasExifGps: exif.hasGps,
            isExifVerified: false,
          })
          await uploadCapturedPhoto(record.id)
          pushStep('success')
          return
        } catch { /* 폴백 */ }
      }
      pushStep('record')
    },
    [result, pushStep, setTarget, user, createRecord, uploadCapturedPhoto, capturedImage],
  )

  const handleWineConfirm = useCallback(async () => {
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
    // 빠른추가 시도
    if (user && capturedImage) {
      try {
        const exif = await parseExifFromBase64(capturedImage)
        const record = await createRecord({
          userId: user.id,
          targetId: top.wineId,
          targetType: 'wine',
          status: 'checked',
          wineStatus: 'tasted',
          hasExifGps: exif.hasGps,
          isExifVerified: false,
        })
        await uploadCapturedPhoto(record.id)
        pushStep('success')
        return
      } catch { /* 폴백 */ }
    }
    pushStep('record')
  }, [result, pushStep, setTarget, user, createRecord, uploadCapturedPhoto, capturedImage])

  const handleSearchFallback = useCallback(() => {
    router.push(`/search?type=${targetType}`)
  }, [router, targetType])

  const variant = targetType === 'wine' ? 'wine' : 'food'

  // step: record → 기존 RecordFlowContainer로 위임 (target 정보를 URL params로 전달)
  if (step === 'record' && target) {
    // AI prefill 데이터 + 촬영 이미지를 sessionStorage로 전달
    if (result) {
      const aiPrefill: Record<string, unknown> = {}
      if (result.targetType === 'restaurant') {
        const r = result as RestaurantAIResult
        aiPrefill.genre = r.detectedGenre
      } else {
        const w = result as WineAIResult
        const top = w.candidates[0]
        if (top) {
          aiPrefill.wineType = top.wineType
          aiPrefill.region = top.region
          aiPrefill.vintage = top.vintage
        }
      }
      if (gps) aiPrefill.gps = gps
      try {
        sessionStorage.setItem('nyam_ai_prefill', JSON.stringify(aiPrefill))
      } catch { /* ignore */ }
    }
    // 촬영 이미지를 sessionStorage에 저장 → record-flow에서 자동 첨부
    if (capturedImage) {
      try {
        sessionStorage.setItem('nyam_captured_image', capturedImage)
      } catch { /* ignore — 용량 초과 시 무시 */ }
    }
    router.replace(
      `/record?type=${target.type}&targetId=${target.id}&name=${encodeURIComponent(target.name)}&meta=${encodeURIComponent(target.meta)}&from=${entryPath}`,
    )
    return null
  }

  return (
    <div className="content-detail flex min-h-dvh flex-col bg-[var(--bg)]">
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
            const input = document.createElement('input')
            input.type = 'file'
            input.accept = 'image/*'
            input.onchange = (e) => {
              const file = (e.target as HTMLInputElement).files?.[0]
              if (!file) return
              const reader = new FileReader()
              reader.onload = () => {
                const base64 = (reader.result as string).split(',')[1]
                handleCapture(base64)
              }
              reader.readAsDataURL(file)
            }
            input.click()
          }}
          onSearchFallback={handleSearchFallback}
          onShelfMode={targetType === 'wine' ? () => {
            const input = document.createElement('input')
            input.type = 'file'
            input.accept = 'image/*'
            input.onchange = (e) => {
              const file = (e.target as HTMLInputElement).files?.[0]
              if (!file) return
              const reader = new FileReader()
              reader.onload = () => {
                const base64 = (reader.result as string).split(',')[1]
                handleShelfMode(base64)
              }
              reader.readAsDataURL(file)
            }
            input.click()
          } : undefined}
          onReceiptMode={targetType === 'wine' ? () => {
            const input = document.createElement('input')
            input.type = 'file'
            input.accept = 'image/*'
            input.onchange = (e) => {
              const file = (e.target as HTMLInputElement).files?.[0]
              if (!file) return
              const reader = new FileReader()
              reader.onload = () => {
                const base64 = (reader.result as string).split(',')[1]
                handleReceiptMode(base64)
              }
              reader.readAsDataURL(file)
            }
            input.click()
          } : undefined}
          isRecognizing={isRecognizing || isQuickAdding}
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
            resetFlow()
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
            className="mt-2 w-full max-w-[280px] rounded-xl py-3 text-center text-[14px] font-semibold"
            style={{ backgroundColor: targetType === 'wine' ? 'var(--accent-wine)' : 'var(--accent-food)', color: '#FFFFFF' }}
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

      {step === 'success' && target && (
        <SuccessScreen
          variant={variant}
          targetName={target.name}
          targetMeta={target.meta}
          onAddDetail={() => {
            const meta = target.meta ? `&meta=${encodeURIComponent(target.meta)}` : ''
            router.push(`/record?type=${target.type}&targetId=${target.id}&name=${encodeURIComponent(target.name)}${meta}&from=camera`)
          }}
          onAddAnother={() => {
            resetFlow()
            resetCamera()
          }}
          onGoHome={() => router.push('/')}
        />
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
