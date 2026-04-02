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
import { useBubbleAutoSync } from '@/application/hooks/use-bubble-auto-sync'
import { photoRepo, imageService } from '@/shared/di/container'
import { todayInTz, detectBrowserTimezone } from '@/shared/utils/date-format'
import { extractExifFromFile } from '@/shared/utils/exif-parser'
import { AppHeader } from '@/presentation/components/layout/app-header'
import { FabBack } from '@/presentation/components/layout/fab-back'
import { CameraCapture } from '@/presentation/components/camera/camera-capture'
import { AIResultDisplay } from '@/presentation/components/camera/ai-result-display'
import { SuccessScreen } from '@/presentation/components/add-flow/success-screen'
import { NearbyList } from '@/presentation/components/search/nearby-list'
import type { NearbyRestaurant } from '@/domain/entities/search'

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
  const [gps, setGps] = useState<{ latitude: number; longitude: number } | null>(null)
  // Phase 1 업로드 상태: 사진은 즉시 업로드, 기록 미완료 시 삭제
  const [tempPhotoUrl, setTempPhotoUrl] = useState<string | null>(null)
  const [tempExif, setTempExif] = useState<{ lat: number | null; lng: number | null; capturedAt: string | null }>({ lat: null, lng: null, capturedAt: null })
  const [recordCompleted, setRecordCompleted] = useState(false)
  const [nearbyRestaurants, setNearbyRestaurants] = useState<NearbyRestaurant[]>([])
  const [nearbyLoading, setNearbyLoading] = useState(false)
  const [nearbyGenre, setNearbyGenre] = useState('')

  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(
      (pos) => {
        const coords = { latitude: pos.coords.latitude, longitude: pos.coords.longitude }
        setGps(coords)
        // 근처 식당 미리 로드
        if (targetType === 'restaurant') {
          setNearbyLoading(true)
          fetch(`/api/restaurants/nearby?lat=${coords.latitude}&lng=${coords.longitude}&radius=500`)
            .then((res) => res.json())
            .then((data) => setNearbyRestaurants(data.restaurants ?? []))
            .catch(() => {})
            .finally(() => setNearbyLoading(false))
        }
      },
      () => {},
      { enableHighAccuracy: true, timeout: 5000 },
    )
  }, [targetType])

  // Cleanup: 기록 미완료 시 임시 업로드 삭제
  useEffect(() => {
    const url = tempPhotoUrl
    const completed = recordCompleted
    return () => {
      if (url && !completed) {
        imageService.deleteImage(url).catch(() => {})
      }
    }
  }, [tempPhotoUrl, recordCompleted])

  const [nearbyRadius, setNearbyRadius] = useState(500)

  const fetchNearby = useCallback((keyword: string, radius: number = 500) => {
    if (!gps) return
    setNearbyLoading(true)
    const params = new URLSearchParams({
      lat: String(gps.latitude),
      lng: String(gps.longitude),
      radius: String(radius),
    })
    if (keyword) params.set('keyword', keyword)
    fetch(`/api/restaurants/nearby?${params}`)
      .then((res) => res.json())
      .then((data) => setNearbyRestaurants(data.restaurants ?? []))
      .catch(() => {})
      .finally(() => setNearbyLoading(false))
  }, [gps])

  /** Phase 1에서 이미 업로드된 사진을 record에 연결 */
  const uploadCapturedPhoto = useCallback(async (recordId: string) => {
    if (!tempPhotoUrl) return
    try {
      await photoRepo.savePhotos(recordId, [{
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
  }, [tempPhotoUrl, tempExif])

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
      const resizedBlob = await imageService.resizeImage(file)
      const fileId = crypto.randomUUID()
      return await imageService.uploadImage(user.id, 'pending', resizedBlob, fileId)
    } catch {
      return null
    }
  }, [user])

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

      // ── 식당: GPS 100m 내 근처 식당 검색 ──
      const aiResult = await identify({
        imageUrl: photoUrl,
        targetType,
        latitude: coords?.latitude,
        longitude: coords?.longitude,
      })

      if (targetType === 'restaurant') {
        const restResult = aiResult as RestaurantAIResult | null
        if (restResult && restResult.candidates.length > 0) {
          pushStep('ai_result')
        } else {
          pushStep('search')
        }
      }
    },
    [identify, targetType, gps, pushStep, setTarget, uploadFile],
  )

  const handleRestaurantSelect = useCallback(
    async (restaurantId: string) => {
      if (result?.targetType !== 'restaurant') return
      const restResult = result as RestaurantAIResult
      const selected = restResult.candidates.find((c) => c.restaurantId === restaurantId)
      if (!selected) return

      let targetId = selected.restaurantId

      // 카카오 ID → DB에 식당 등록
      if (targetId.startsWith('kakao_')) {
        try {
          const res = await fetch('/api/restaurants', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: selected.name,
              area: selected.area,
              genre: selected.genre,
            }),
          })
          const data = await res.json()
          if (data.id) targetId = data.id
        } catch {}
      }

      if (targetId.startsWith('kakao_')) {
        pushStep('search')
        return
      }

      setTarget({
        id: targetId,
        name: selected.name,
        type: 'restaurant',
        meta: [selected.genre, selected.area].filter(Boolean).join(' · '),
        isAiRecognized: true,
      })
      try {
        const restResult = result as RestaurantAIResult
        sessionStorage.setItem('nyam_ai_prefill', JSON.stringify({
          genre: restResult?.detectedGenre ?? selected.genre,
          foodType: selected.genre,
        }))
      } catch {}
      pushStep('record')
    },
    [result, pushStep, setTarget, user, createRecord, uploadCapturedPhoto],
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

      {step === 'ai_result' && result?.targetType === 'restaurant' && (
        <AIResultDisplay
          candidates={(result as RestaurantAIResult).candidates}
          detectedGenre={(result as RestaurantAIResult).detectedGenre}
          onSelect={handleRestaurantSelect}
          onSearchFallback={handleSearchFallback}
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
                style={{ backgroundColor: targetType === 'wine' ? 'var(--accent-wine)' : 'var(--accent-food)', color: '#FFFFFF' }}
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

          {targetType === 'restaurant' && (
            <NearbyList
              restaurants={nearbyRestaurants}
              isLoading={nearbyLoading}
              genre={nearbyGenre}
              radius={nearbyRadius}
              onGenreChange={(g) => {
                setNearbyGenre(g)
                fetchNearby(g, nearbyRadius)
              }}
              onRadiusChange={(r) => {
                setNearbyRadius(r)
                fetchNearby(nearbyGenre, r)
              }}
              onSelect={async (restaurantId) => {
                const r = nearbyRestaurants.find((n) => n.id === restaurantId)
                if (!r) return
                // 외부 식당 → DB 등록
                const res = await fetch('/api/restaurants', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    name: r.name,
                    address: r.address,
                    area: r.area,
                    genre: r.genre,
                    lat: r.lat,
                    lng: r.lng,
                  }),
                })
                const data = await res.json()
                const targetId = data.id ?? r.id
                const meta = [r.genre, r.area].filter(Boolean).join(' · ')
                setTarget({
                  id: targetId,
                  name: r.name,
                  type: 'restaurant',
                  meta,
                  isAiRecognized: false,
                })
                pushStep('record')
              }}
              onRegister={() => router.push(`/register?type=restaurant`)}
            />
          )}
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
          onGoHome={() => router.replace('/')}
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
