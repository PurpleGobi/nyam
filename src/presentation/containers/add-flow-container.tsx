'use client'

import { useCallback, useEffect, useMemo, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import type { RecordTargetType } from '@/domain/entities/record'
import type { AddFlowStep } from '@/domain/entities/add-flow'
import type { RestaurantAIResult, WineAIResult } from '@/domain/entities/camera'
import { useAuth } from '@/presentation/providers/auth-provider'
import { useAddFlow } from '@/application/hooks/use-add-flow'
import { useCameraCapture } from '@/application/hooks/use-camera-capture'
import { useCreateRecord } from '@/application/hooks/use-create-record'
import { useBubbleAutoSync } from '@/application/hooks/use-bubble-auto-sync'
import { useBubbleItems } from '@/application/hooks/use-bubble-items'
import { usePhotoManagement } from '@/application/hooks/use-photo-management'
import { todayInTz, detectBrowserTimezone } from '@/shared/utils/date-format'
import { extractExifFromFile } from '@/shared/utils/exif-parser'
import { AppHeader } from '@/presentation/components/layout/app-header'
import { FabBack } from '@/presentation/components/layout/fab-back'
import { BubblePickerSheet } from '@/presentation/components/bubble/bubble-picker-sheet'
import { CameraCapture } from '@/presentation/components/camera/camera-capture'
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
  const { syncRecordToAllBubbles } = useBubbleAutoSync(user?.id ?? null)
  const { bubblesWithStatus, isLoading: isBubblesLoading, toggleItem: toggleBubbleItem } = useBubbleItems(
    user?.id ?? null,
    target?.id ?? null,
    targetType,
  )
  const { savePhotos: savePhotoRecords, deleteImage, resizeAndUploadImage } = usePhotoManagement()
  const [gps, setGps] = useState<{ latitude: number; longitude: number } | null>(null)
  // Phase 1 업로드 상태: 사진은 즉시 업로드, 기록 미완료 시 삭제
  const [tempPhotoUrl, setTempPhotoUrl] = useState<string | null>(null)
  const [tempExif, setTempExif] = useState<{ lat: number | null; lng: number | null; capturedAt: string | null }>({ lat: null, lng: null, capturedAt: null })
  const [recordCompleted, setRecordCompleted] = useState(false)
  const [showAddToBubble, setShowAddToBubble] = useState(false)
  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(
      (pos) => {
        setGps({ latitude: pos.coords.latitude, longitude: pos.coords.longitude })
      },
      () => {},
      { enableHighAccuracy: true, timeout: 5000 },
    )
  }, [])

  // Cleanup: 기록 미완료 시 임시 업로드 삭제
  useEffect(() => {
    const url = tempPhotoUrl
    const completed = recordCompleted
    return () => {
      if (url && !completed) {
        deleteImage(url).catch(() => {})
      }
    }
  }, [tempPhotoUrl, recordCompleted, deleteImage])


  /** Phase 1에서 이미 업로드된 사진을 record에 연결 */
  const uploadCapturedPhoto = useCallback(async (recordId: string) => {
    if (!tempPhotoUrl) return
    try {
      await savePhotoRecords(recordId, [{
        url: tempPhotoUrl,
        orderIndex: 0,
        exifLat: tempExif.lat,
        exifLng: tempExif.lng,
        capturedAt: tempExif.capturedAt,
      }])
      setRecordCompleted(true)
    } catch {
      // DB 저장 실패해도 record는 유지
    }
  }, [tempPhotoUrl, tempExif, savePhotoRecords])

  const goBack = useCallback(() => {
    const prev = hookGoBack()
    if (prev === null) {
      router.back()
    }
  }, [hookGoBack, router])

  /** File → resizeImage → Storage 업로드 → URL 반환 */
  const uploadFile = useCallback(async (file: File): Promise<string | null> => {
    if (!user) return null
    try {
      const fileId = crypto.randomUUID()
      return await resizeAndUploadImage(file, user.id, 'pending', fileId)
    } catch {
      return null
    }
  }, [user, resizeAndUploadImage])

  const handleShelfMode = useCallback(
    async (file: File) => {
      const url = await uploadFile(file)
      if (url) setTempPhotoUrl(url)
    },
    [uploadFile],
  )

  const handleReceiptMode = useCallback(
    async (file: File) => {
      const url = await uploadFile(file)
      if (url) setTempPhotoUrl(url)
    },
    [uploadFile],
  )

  /** 카메라/앨범 캡처 → 1단계: EXIF GPS 추출 + resize+upload → 2단계: API 호출 */
  const handleCapture = useCallback(
    async (file: File) => {
      // ── 0단계: EXIF GPS 추출 (1~5ms, 리사이즈 전 원본에서) ──
      const exif = await extractExifFromFile(file)
      const photoGps = exif.gps
        ? { latitude: exif.gps.latitude, longitude: exif.gps.longitude }
        : null

      // EXIF 데이터 보관
      setTempExif({
        lat: photoGps?.latitude ?? null,
        lng: photoGps?.longitude ?? null,
        capturedAt: exif.capturedAt,
      })

      // ── 1단계: resizeImage → Storage 업로드 → URL ──
      const photoUrl = await uploadFile(file)
      if (!photoUrl) {
        pushStep('search')
        return
      }
      setTempPhotoUrl(photoUrl)

      // GPS 우선순위: EXIF GPS > navigator GPS
      const coords = photoGps ?? gps

      // ── 2단계: 와인은 AI 라벨 인식 ──
      if (targetType === 'wine') {
        const aiResult = await identify({
          imageUrl: photoUrl,
          targetType: 'wine',
        })

        if (aiResult?.targetType === 'wine') {
          const wineResult = aiResult as WineAIResult
          const top = wineResult.candidates[0]
          if (top) {
            setTarget({
              id: top.wineId,
              name: top.name,
              type: 'wine',
              meta: [top.wineType, top.region, top.vintage ? String(top.vintage) : null].filter(Boolean).join(' · '),
              isAiRecognized: true,
            })
            try {
              sessionStorage.setItem('nyam_ai_prefill', JSON.stringify({
                wineType: top.wineType,
                region: top.region,
                vintage: top.vintage,
              }))
            } catch {}
            pushStep('record')
            return
          }
        }

        pushStep('search')
        return
      }

      // ── 식당: EXIF GPS로 /search 페이지 라우팅 (AI 호출 불필요) ──
      if (targetType === 'restaurant') {
        const searchParams = new URLSearchParams({ type: 'restaurant' })
        if (coords) {
          searchParams.set('lat', String(coords.latitude))
          searchParams.set('lng', String(coords.longitude))
        }
        router.push(`/search?${searchParams.toString()}`)
        return
      }
    },
    [identify, targetType, gps, pushStep, setTarget, uploadFile, router],
  )

  const handleSearchFallback = useCallback(() => {
    router.push(`/search?type=${targetType}`)
  }, [router, targetType])

  const variant = targetType === 'wine' ? 'wine' : 'food'

  // step: record → 기존 RecordFlowContainer로 위임 (target 정보를 URL params로 전달)
  const shouldRedirectToRecord = step === 'record' && target
  useEffect(() => {
    if (!shouldRedirectToRecord || !target) return
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
      try { sessionStorage.setItem('nyam_ai_prefill', JSON.stringify(aiPrefill)) } catch {}
    }
    if (tempPhotoUrl) {
      try { sessionStorage.setItem('nyam_captured_photo_url', tempPhotoUrl) } catch {}
    }
    router.replace(
      `/record?type=${target.type}&targetId=${target.id}&name=${encodeURIComponent(target.name)}&meta=${encodeURIComponent(target.meta)}&from=${entryPath}`,
    )
  }, [shouldRedirectToRecord, target, result, gps, tempPhotoUrl, router, entryPath])

  if (shouldRedirectToRecord) return null

  return (
    <div className="content-detail flex min-h-dvh flex-col bg-[var(--bg)]">
      <AppHeader />
      <FabBack onClick={goBack} />

      {step === 'camera' && (
        <CameraCapture
          targetType={targetType}
          onCapture={handleCapture}
          previewUrl={tempPhotoUrl}
          onAlbumSelect={() => {
            const input = document.createElement('input')
            input.type = 'file'
            input.accept = 'image/*'
            input.style.display = 'none'
            document.body.appendChild(input)
            input.onchange = (e) => {
              const file = (e.target as HTMLInputElement).files?.[0]
              document.body.removeChild(input)
              if (!file) return
              handleCapture(file)
            }
            input.click()
          }}
          onSearchFallback={handleSearchFallback}
          onShelfMode={targetType === 'wine' ? () => {
            const input = document.createElement('input')
            input.type = 'file'
            input.accept = 'image/*'
            input.style.display = 'none'
            document.body.appendChild(input)
            input.onchange = (e) => {
              const file = (e.target as HTMLInputElement).files?.[0]
              document.body.removeChild(input)
              if (!file) return
              handleShelfMode(file)
            }
            input.click()
          } : undefined}
          onReceiptMode={targetType === 'wine' ? () => {
            const input = document.createElement('input')
            input.type = 'file'
            input.accept = 'image/*'
            input.style.display = 'none'
            document.body.appendChild(input)
            input.onchange = (e) => {
              const file = (e.target as HTMLInputElement).files?.[0]
              document.body.removeChild(input)
              if (!file) return
              handleReceiptMode(file)
            }
            input.click()
          } : undefined}
          isRecognizing={isRecognizing || isQuickAdding}
        />
      )}

      {step === 'search' && (
        <div className="flex flex-1 flex-col">
          <div className="flex flex-col items-center gap-3 px-6 py-6">
            <p className="text-[15px] text-[var(--text)]">
              {targetType === 'wine' ? '와인을 찾지 못했어요' : '식당을 찾지 못했어요'}
            </p>
            <div className="flex w-full max-w-[320px] gap-2">
              <button
                type="button"
                onClick={handleSearchFallback}
                className="flex-1 rounded-xl py-3 text-center text-[14px] font-semibold"
                style={{ backgroundColor: targetType === 'wine' ? 'var(--accent-wine)' : 'var(--accent-food)', color: 'var(--primary-foreground)' }}
              >
                이름으로 검색
              </button>
              <button
                type="button"
                onClick={() => router.push(`/register?type=${targetType}`)}
                className="flex-1 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] py-3 text-center text-[14px] font-medium text-[var(--text)]"
              >
                직접 등록
              </button>
            </div>
          </div>

        </div>
      )}

      {step === 'success' && target && (
        <>
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
            onGoHome={() => router.replace('/')}
          />

          {/* 리스트에 추가 버튼 */}
          <div className="flex justify-center pb-6">
            <button
              type="button"
              onClick={() => setShowAddToBubble(true)}
              className="flex items-center gap-1.5 rounded-full px-5 py-2.5 text-[13px] font-semibold transition-opacity active:opacity-70"
              style={{
                backgroundColor: 'var(--accent-social)',
                color: 'var(--primary-foreground)',
              }}
            >
              리스트에 추가
            </button>
          </div>
        </>
      )}

      <BubblePickerSheet
        isOpen={showAddToBubble}
        onClose={() => setShowAddToBubble(false)}
        bubbles={bubblesWithStatus.map((b) => ({
          id: b.bubbleId,
          name: b.bubbleName,
          icon: b.bubbleIcon,
          iconBgColor: b.bubbleIconBgColor,
        }))}
        onSelect={(bubbleId) => toggleBubbleItem(bubbleId, true)}
        isLoading={isBubblesLoading}
      />
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
