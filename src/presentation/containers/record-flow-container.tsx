'use client'

import { useState, useCallback, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import type { RecordTargetType, CreateRecordInput, DiningRecord } from '@/domain/entities/record'
import type { PriceReview } from '@/domain/entities/wine'
import type { QuadrantReferencePoint } from '@/domain/entities/quadrant'
import type { AddFlowEntryPath } from '@/domain/entities/add-flow'
import { useAuth } from '@/presentation/providers/auth-provider'
import { useCreateRecord } from '@/application/hooks/use-create-record'
import { usePhotoUpload } from '@/application/hooks/use-photo-upload'
import { extractExifFromFile } from '@/shared/utils/exif-parser'
import { todayInTz, detectBrowserTimezone } from '@/shared/utils/date-format'
import { validateExifGps } from '@/domain/services/exif-validator'
import { useXpAward } from '@/application/hooks/use-xp-award'
import { useXp } from '@/application/hooks/use-xp'
import { photoRepo, recordRepo, xpRepo, imageService, restaurantRepo, wineRepo, bubbleRepo } from '@/shared/di/container'
import { PHOTO_CONSTANTS } from '@/domain/entities/record-photo'
import { AppHeader } from '@/presentation/components/layout/app-header'
import { FabBack } from '@/presentation/components/layout/fab-back'
import { DeleteConfirmModal } from '@/presentation/components/record/delete-confirm-modal'
import { useBubbleAutoSync } from '@/application/hooks/use-bubble-auto-sync'
import { useSettings } from '@/application/hooks/use-settings'
import { PhotoPicker } from '@/presentation/components/record/photo-picker'
import { RestaurantRecordForm } from '@/presentation/components/record/restaurant-record-form'
import { WineRecordForm } from '@/presentation/components/record/wine-record-form'
import { useToast } from '@/presentation/components/ui/toast'

interface RecordFlowState {
  targetType: RecordTargetType
  targetId: string
  targetName: string
  targetMeta: string
}

function RecordFlowInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useAuth()
  const { showToast } = useToast()
  const { createRecord, isLoading: isRecordLoading } = useCreateRecord()
  const { photos, initExistingPhotos, addFiles, removePhoto, replacePhoto, reorderPhotos, togglePublic, uploadAll, isUploading } = usePhotoUpload()
  const { syncRecordToAllBubbles } = useBubbleAutoSync(user?.id ?? null)
  const { awardXp } = useXpAward()
  const { thresholds } = useXp(user?.id ?? null)

  const targetType = (searchParams.get('type') ?? 'restaurant') as RecordTargetType
  const entryPath = (searchParams.get('from') ?? 'camera') as AddFlowEntryPath
  const editRecordId = searchParams.get('edit')
  const targetLat = searchParams.get('lat') ? Number(searchParams.get('lat')) : null
  const targetLng = searchParams.get('lng') ? Number(searchParams.get('lng')) : null

  const [state, setState] = useState<RecordFlowState>({
    targetType,
    targetId: searchParams.get('targetId') ?? '',
    targetName: searchParams.get('name') ?? '',
    targetMeta: searchParams.get('meta') ?? '',
  })

  const [editingRecord, setEditingRecord] = useState<DiningRecord | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [genreHint, setGenreHint] = useState<string | null>(null)
  const [recordExtra, setRecordExtra] = useState<{ categoryPath?: string; address?: string; distance?: string } | null>(null)

  // sessionStorage에서 장르 힌트 + 추가 정보 읽기
  useEffect(() => {
    try {
      const hint = sessionStorage.getItem('nyam_genre_hint')
      if (hint) {
        setGenreHint(hint)
        sessionStorage.removeItem('nyam_genre_hint')
      }
    } catch {}
    try {
      const extra = sessionStorage.getItem('nyam_record_extra')
      if (extra) {
        setRecordExtra(JSON.parse(extra))
        sessionStorage.removeItem('nyam_record_extra')
      }
    } catch {}
  }, [])

  const { settings } = useSettings()
  const [referenceRecords, setReferenceRecords] = useState<QuadrantReferencePoint[]>([])
  const [recentCompanions, setRecentCompanions] = useState<string[]>([])
  const [wineData, setWineData] = useState<{
    wineType?: string; region?: string; subRegion?: string; appellation?: string
    country?: string; variety?: string; grapeVarieties?: Array<{ name: string; pct: number }>
    producer?: string; vintage?: number; abv?: number
    bodyLevel?: number; acidityLevel?: number; sweetnessLevel?: number
    classification?: string; servingTemp?: string; decanting?: string
    referencePriceMin?: number; referencePriceMax?: number; drinkingWindowStart?: number; drinkingWindowEnd?: number
    vivinoRating?: number; criticScores?: { RP?: number; WS?: number; JR?: number; JH?: number }
    tastingNotes?: string
    foodPairings?: string[]
    priceReview?: PriceReview
    aromaPrimary?: string[]
    aromaSecondary?: string[]
    aromaTertiary?: string[]
    balance?: number
    finish?: number
    intensity?: number
  } | null>(null)
  const [isEditLoading, setIsEditLoading] = useState(!!editRecordId)
  const isLoading = isRecordLoading || isUploading

  const isEditMode = !!editRecordId

  // 수정 모드: 기존 기록 + 사진 + 대상(식당/와인) 정보 로드
  useEffect(() => {
    if (!editRecordId) return
    let cancelled = false
    const recordIdToLoad = editRecordId

    async function loadRecord() {
      try {
        const [record, existingPhotos] = await Promise.all([
          recordRepo.findById(recordIdToLoad),
          photoRepo.getPhotosByRecordId(recordIdToLoad),
        ])
        if (cancelled || !record) return
        setEditingRecord(record)

        // 대상(식당/와인) 정보 로드 → target.genre, state.targetName/Meta 반영
        let targetName = ''
        let targetMeta = ''
        if (record.targetType === 'restaurant') {
          const restaurant = await restaurantRepo.findById(record.targetId)
          if (restaurant) {
            targetName = restaurant.name
            targetMeta = [restaurant.genre, restaurant.area].filter(Boolean).join(' · ')
          }
        } else {
          const wine = await wineRepo.findById(record.targetId)
          if (wine) {
            targetName = wine.name
            targetMeta = [wine.wineType, wine.region, wine.country].filter(Boolean).join(' · ')
          }
        }

        setState((prev) => ({
          ...prev,
          targetId: record.targetId,
          targetType: record.targetType,
          targetName: targetName || prev.targetName,
          targetMeta: targetMeta || prev.targetMeta,
        }))
        // 기존 사진을 PhotoPicker에 표시
        if (existingPhotos.length > 0) {
          initExistingPhotos(
            existingPhotos.map((p) => ({
              id: p.id,
              url: p.url,
              orderIndex: p.orderIndex,
              isPublic: p.isPublic,
            })),
          )
        }
      } finally {
        if (!cancelled) setIsEditLoading(false)
      }
    }
    loadRecord()
    return () => { cancelled = true }
  }, [editRecordId, initExistingPhotos])

  // 와인 타입일 때 wines 테이블에서 메타 자동 채움
  useEffect(() => {
    if (targetType !== 'wine' || !state.targetId) return
    let cancelled = false
    async function loadWine() {
      try {
        const wine = await wineRepo.findById(state.targetId)
        if (cancelled || !wine) return
        // 품종: variety가 있으면 그대로, 없으면 grape_varieties에서 비중 최고 선택
        let bestVariety = wine.variety ?? undefined
        if (!bestVariety && wine.grapeVarieties.length > 0) {
          const sorted = [...wine.grapeVarieties].sort((a, b) => b.pct - a.pct)
          bestVariety = sorted[0].name
        }

        setWineData({
          wineType: wine.wineType,
          region: wine.region ?? undefined,
          subRegion: wine.subRegion ?? undefined,
          appellation: wine.appellation ?? undefined,
          country: wine.country ?? undefined,
          variety: bestVariety,
          grapeVarieties: wine.grapeVarieties.length > 0 ? wine.grapeVarieties : undefined,
          producer: wine.producer ?? undefined,
          vintage: wine.vintage ?? undefined,
          abv: wine.abv ?? undefined,
          bodyLevel: wine.bodyLevel ?? undefined,
          acidityLevel: wine.acidityLevel ?? undefined,
          sweetnessLevel: wine.sweetnessLevel ?? undefined,
          classification: wine.classification ?? undefined,
          servingTemp: wine.servingTemp ?? undefined,
          decanting: wine.decanting ?? undefined,
          referencePriceMin: wine.referencePriceMin ?? undefined,
          referencePriceMax: wine.referencePriceMax ?? undefined,
          drinkingWindowStart: wine.drinkingWindowStart ?? undefined,
          drinkingWindowEnd: wine.drinkingWindowEnd ?? undefined,
          vivinoRating: wine.vivinoRating ?? undefined,
          criticScores: wine.criticScores ?? undefined,
          tastingNotes: wine.tastingNotes ?? undefined,
          foodPairings: wine.foodPairings.length > 0 ? wine.foodPairings : undefined,
          priceReview: wine.priceReview ?? undefined,
        })

        // AI 향/품질 평가 로드 (신규 기록 시에만, 편집 시에는 기존 기록값 사용)
        if (!editRecordId) {
          try {
            const aiRes = await fetch('/api/wines/detail-ai', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ name: wine.name, producer: wine.producer, vintage: wine.vintage }),
            })
            const aiData = await aiRes.json()
            if (!cancelled && aiData.success && aiData.wine) {
              setWineData((prev) => prev ? {
                ...prev,
                aromaPrimary: aiData.wine.aromaPrimary?.length > 0 ? aiData.wine.aromaPrimary : undefined,
                aromaSecondary: aiData.wine.aromaSecondary?.length > 0 ? aiData.wine.aromaSecondary : undefined,
                aromaTertiary: aiData.wine.aromaTertiary?.length > 0 ? aiData.wine.aromaTertiary : undefined,
                balance: aiData.wine.balance ?? undefined,
                finish: aiData.wine.finish ?? undefined,
                intensity: aiData.wine.intensity ?? undefined,
              } : prev)
            }
          } catch {
            // AI 조회 실패 시 무시 — 사용자가 직접 입력
          }
        }
      } catch {
        // 조회 실패 시 URL param 폴백
      }
    }
    loadWine()
    return () => { cancelled = true }
  }, [targetType, state.targetId, editRecordId])

  // 이전 기록 참조 점 로드
  const userId = user?.id
  useEffect(() => {
    if (!userId || !state.targetId) return
    let cancelled = false

    async function loadPreviousRecords() {
      try {
        const records = await recordRepo.findByUserAndTarget(userId!, state.targetId)
        if (cancelled) return
        const refs: QuadrantReferencePoint[] = records
          .filter((r) => r.axisX !== null && r.axisY !== null && r.id !== editRecordId)
          .slice(0, 12)
          .map((r) => ({
            x: r.axisX ?? 50,
            y: r.axisY ?? 50,
            satisfaction: r.satisfaction ?? 50,
            name: r.visitDate ?? '',
            score: r.satisfaction ?? 50,
          }))
        setReferenceRecords(refs)
      } catch {
        // 참조 점 로드 실패 시 무시 — 핵심 기능 아님
      }
    }
    loadPreviousRecords()
    return () => { cancelled = true }
  }, [userId, state.targetId, editRecordId])

  // 최근 동행자 목록 로드 (전체 기록에서 추출)
  useEffect(() => {
    if (!userId) return
    let cancelled = false

    async function loadRecentCompanions() {
      try {
        const records = await recordRepo.findByUserId(userId!)
        if (cancelled) return
        const freq = new Map<string, number>()
        for (const r of records) {
          if (r.companions) {
            for (const name of r.companions) {
              freq.set(name, (freq.get(name) ?? 0) + 1)
            }
          }
        }
        const sorted = [...freq.entries()]
          .sort((a, b) => b[1] - a[1])
          .map(([name]) => name)
          .slice(0, 10)
        setRecentCompanions(sorted)
      } catch {
        // 최근 동행자 로드 실패 시 무시
      }
    }
    loadRecentCompanions()
    return () => { cancelled = true }
  }, [userId])

  // sessionStorage에서 촬영 사진 URL + AI prefill 읽기
  const [aiPrefill, setAiPrefill] = useState<{ genre?: string; foodType?: string } | null>(null)

  useEffect(() => {
    if (isEditMode) return
    try {
      const photoUrl = sessionStorage.getItem('nyam_captured_photo_url')
      if (photoUrl) {
        sessionStorage.removeItem('nyam_captured_photo_url')
        fetch(photoUrl).then((res) => res.blob()).then((blob) => {
          const file = new File([blob], 'camera-capture.webp', { type: blob.type || 'image/webp' })
          addFiles([file])
        }).catch(() => {})
      }
    } catch {}
    try {
      const prefillStr = sessionStorage.getItem('nyam_ai_prefill')
      if (prefillStr) {
        sessionStorage.removeItem('nyam_ai_prefill')
        const prefill = JSON.parse(prefillStr)
        setAiPrefill(prefill)
      }
    } catch {}
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSave = useCallback(
    async (formData: { targetId: string; targetType: RecordTargetType; [key: string]: unknown }) => {
      if (!user) return
      try {
        let savedRecord: DiningRecord

        if (isEditMode && editRecordId) {
          // 수정 모드: UPDATE — 모든 필드가 record 레벨에 직접 존재
          const updateData: Partial<DiningRecord> = {
            axisX: formData.axisX as number | undefined ?? null,
            axisY: formData.axisY as number | undefined ?? null,
            satisfaction: formData.satisfaction as number | undefined ?? null,
            scene: (formData.scene as string) ?? null,
            comment: (formData.comment as string) ?? null,
            companions: (formData.companions as string[]) ?? null,
            companionCount: formData.companionCount as number | undefined ?? null,
            privateNote: (formData.privateNote as string) ?? null,
            totalPrice: (formData.totalPrice as number) ?? null,
            purchasePrice: (formData.purchasePrice as number) ?? null,
            aromaPrimary: (formData.aromaPrimary as string[]) ?? [],
            aromaSecondary: (formData.aromaSecondary as string[]) ?? [],
            aromaTertiary: (formData.aromaTertiary as string[]) ?? [],
            complexity: (formData.complexity as number) ?? null,
            finish: (formData.finish as number) ?? null,
            balance: (formData.balance as number) ?? null,
            intensity: (formData.intensity as number) ?? null,
            autoScore: (formData.autoScore as number) ?? null,
            mealTime: (formData.mealTime as DiningRecord['mealTime']) ?? null,
            visitDate: (formData.visitDate as string) ?? todayInTz(settings?.prefTimezone ?? detectBrowserTimezone()),
            menuTags: (formData.menuTags as string[]) ?? null,
            pairingCategories: formData.pairingCategories as DiningRecord['pairingCategories'],
            linkedWineId: formData.linkedWineId as string | undefined,
            linkedRestaurantId: formData.linkedRestaurantId as string | undefined,
          }
          savedRecord = await recordRepo.update(editRecordId, updateData)

          // 수정 모드 사진 처리
          const dbPhotos = await photoRepo.getPhotosByRecordId(editRecordId)
          const dbIds = new Set(dbPhotos.map((p) => p.id))
          const currentIds = new Set(photos.map((p) => p.id))

          // 1. 유저가 삭제한 기존 사진 → DB + Storage 삭제
          for (const dp of dbPhotos) {
            if (!currentIds.has(dp.id)) {
              await imageService.deleteImage(dp.url).catch(() => {})
              await photoRepo.deletePhoto(dp.id)
            }
          }

          // 2. 크롭 편집된 기존 사진 → 기존 Storage/DB 삭제
          for (const p of photos) {
            if (dbIds.has(p.id) && p.status === 'pending') {
              const dbPhoto = dbPhotos.find((dp) => dp.id === p.id)
              if (dbPhoto) {
                await imageService.deleteImage(dbPhoto.url).catch(() => {})
                await photoRepo.deletePhoto(p.id)
              }
            }
          }

          // 3. pending 사진 업로드 (uploadAll — 신규 등록과 동일 경로)
          const hasPending = photos.some((p) => p.status === 'pending')
          if (hasPending) {
            const uploadResults = await uploadAll(user.id, editRecordId)
            // uploadAll은 이미 uploaded인 것도 포함하여 전체를 반환
            // DB에 이미 있는 URL은 제외하고 새로 업로드된 것만 저장
            const existingUrls = new Set(dbPhotos.map((p) => p.url))
            const newResults = uploadResults.filter((r) => !existingUrls.has(r.url))
            if (newResults.length > 0) {
              await photoRepo.savePhotos(editRecordId, newResults)
            }
          }

          // 수정 모드에서도 식당 가격대 업데이트
          if (formData.targetType === 'restaurant' && formData.priceRange != null) {
            await fetch('/api/restaurants', {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ id: formData.targetId, priceRange: formData.priceRange }),
            }).catch(() => {})
          }
        } else {
          // 신규 모드: INSERT
          let hasExifGps = false
          let isExifVerified = false

          if (photos.length > 0 && photos[0].file) {
            const exifData = await extractExifFromFile(photos[0].file)
            hasExifGps = exifData.hasGps

            if (exifData.gps && targetLat !== null && targetLng !== null) {
              const validation = validateExifGps(
                exifData.gps,
                targetLat,
                targetLng,
                exifData.capturedAt,
              )
              isExifVerified = validation.isWithinRadius
            }
          }

          const input: CreateRecordInput = {
            userId: user.id,
            targetId: formData.targetId,
            targetType: formData.targetType,
            listStatus: formData.targetType === 'wine' ? 'tasted' : 'visited',
            menuTags: formData.menuTags as string[] | undefined,
            linkedWineId: formData.linkedWineId as string | undefined,
            linkedRestaurantId: formData.linkedRestaurantId as string | undefined,
            pairingCategories: formData.pairingCategories as CreateRecordInput['pairingCategories'],
            axisX: (formData.axisX as number) ?? null,
            axisY: (formData.axisY as number) ?? null,
            satisfaction: (formData.satisfaction as number) ?? null,
            comment: (formData.comment as string) ?? null,
            privateNote: (formData.privateNote as string) ?? null,
            scene: (formData.scene as string) ?? null,
            mealTime: (formData.mealTime as CreateRecordInput['mealTime']) ?? null,
            companions: (formData.companions as string[]) ?? null,
            companionCount: (formData.companionCount as number) ?? null,
            totalPrice: (formData.totalPrice as number) ?? null,
            purchasePrice: (formData.purchasePrice as number) ?? null,
            visitDate: (formData.visitDate as string) ?? todayInTz(settings?.prefTimezone ?? detectBrowserTimezone()),
            aromaPrimary: (formData.aromaPrimary as string[]) ?? [],
            aromaSecondary: (formData.aromaSecondary as string[]) ?? [],
            aromaTertiary: (formData.aromaTertiary as string[]) ?? [],
            complexity: (formData.complexity as number) ?? null,
            finish: (formData.finish as number) ?? null,
            balance: (formData.balance as number) ?? null,
            intensity: (formData.intensity as number) ?? null,
            autoScore: (formData.autoScore as number) ?? null,
            hasExifGps,
            isExifVerified,
          }
          savedRecord = await createRecord(input)

          // 선택한 장르/가격대가 있으면 식당 업데이트
          if (formData.targetType === 'restaurant' && (formData.genre || formData.priceRange != null)) {
            const patch: Record<string, unknown> = { id: formData.targetId }
            if (formData.genre) patch.genre = formData.genre
            if (formData.priceRange != null) patch.priceRange = formData.priceRange
            await fetch('/api/restaurants', {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(patch),
            }).catch(() => {})
          }

          // 와인 메타 업데이트 (빈티지, 산지, 품종)
          if (formData.wineMetaUpdate && formData.targetType === 'wine') {
            const meta = formData.wineMetaUpdate as Record<string, unknown>
            fetch('/api/wines', {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ id: formData.targetId, ...meta }),
            }).catch(() => {})
          }

          // 사진 업로드 (신규 모드에서만)
          if (photos.length > 0) {
            try {
              const uploadedPhotos = await uploadAll(user.id, savedRecord.id)
              if (uploadedPhotos.length > 0) {
                await photoRepo.savePhotos(savedRecord.id, uploadedPhotos)
              }
            } catch {
              showToast('사진 업로드에 실패했습니다. 상세 페이지에서 다시 추가할 수 있습니다.')
            }
          }
        }

        // ── XP 적립 ──
        if (thresholds.length > 0) {
          let area: string | null = null
          let genre: string | null = null
          let region: string | null = null
          let variety: string | null = null

          if (savedRecord.targetType === 'restaurant') {
            const restaurant = await restaurantRepo.findById(savedRecord.targetId)
            area = restaurant?.area?.[0] ?? null
            genre = restaurant?.genre ?? null
          } else {
            const wine = await wineRepo.findById(savedRecord.targetId)
            region = wine?.region ?? null
            // 품종: variety 또는 grape_varieties 비중 최고
            if (wine?.variety) {
              variety = wine.variety
            } else if (wine && wine.grapeVarieties.length > 0) {
              const sorted = [...wine.grapeVarieties].sort((a, b) => b.pct - a.pct)
              variety = sorted[0].name
            }
          }

          const previousXp = isEditMode ? (editingRecord?.recordQualityXp ?? 0) : undefined
          awardXp(
            user.id, savedRecord,
            area, genre, region, variety,
            thresholds, previousXp,
          ).catch(() => {})
        }

        // 버블 자동 공유 동기화 (신규/수정 모두) + 토스트
        syncRecordToAllBubbles(savedRecord as unknown as { id: string; targetId: string; targetType: 'restaurant' | 'wine' } & Record<string, unknown>)
          .then((syncResult) => {
            if (syncResult.sharedTo.length > 0) {
              const names = syncResult.sharedTo.map((b) => b.bubbleName).join(', ')
              showToast(`${names}에 공유됨`)
            }
          })
          .catch(() => {})

        // 수정 완료 후 → 식당/와인 상세 페이지로 이동
        if (isEditMode) {
          const prefix = state.targetType === 'wine' ? 'wines' : 'restaurants'
          router.replace(`/${prefix}/${state.targetId}`)
          return
        }

        // 신규 기록 + from=detail → 상세 페이지로 직귀 (순환 네비게이션)
        if (!isEditMode && entryPath === 'detail' && state.targetId) {
          const prefix = state.targetType === 'wine' ? 'wines' : 'restaurants'
          router.replace(`/${prefix}/${state.targetId}`)
          return
        }

        // 신규 기록 완료 → 토스트 + 홈 이동
        showToast('기록이 추가되었습니다')
        router.replace('/')
      } catch {
        // useCreateRecord 내부에서 error state 처리
      }
    },
    [user, createRecord, photos, uploadAll, entryPath, targetLat, targetLng, isEditMode, editRecordId, editingRecord, router, state.targetId, state.targetType, syncRecordToAllBubbles, awardXp, thresholds, settings?.prefTimezone],
  )

  const handleBack = useCallback(() => router.back(), [router])
  const handleDelete = useCallback(async () => {
    if (!editRecordId || !user) return
    setIsDeleting(true)
    try {
      // 삭제 전 정보 수집 (CASCADE 삭제 대비)
      const [histories, shares] = await Promise.all([
        xpRepo.getHistoriesByRecord(editRecordId),
        bubbleRepo.getRecordShares(editRecordId).catch(() => []),
      ])

      await recordRepo.delete(editRecordId)

      // XP 차감 (best-effort: 레코드는 이미 삭제됨)
      try {
        if (histories.length > 0) {
          let totalXpToDeduct = 0
          for (const h of histories) totalXpToDeduct += h.xpAmount
          await xpRepo.updateUserTotalXp(user.id, -totalXpToDeduct)
          await xpRepo.deleteByRecordId(editRecordId)
        }
      } catch {
        // CASCADE로 이미 삭제된 경우 무시
      }

      setShowDeleteConfirm(false)
      showToast('기록이 삭제되었습니다')
      if (shares.length > 0) {
        showToast(`${shares.length}개 버블 공유도 함께 삭제되었습니다`)
      }

      // 같은 대상의 남은 기록 수 확인
      const remaining = await recordRepo.findByUserAndTarget(user.id, state.targetId).catch(() => [])
      if (remaining.length > 0) {
        showToast(`이 ${state.targetType === 'wine' ? '와인' : '식당'}의 기록이 ${remaining.length}건 남아있습니다`)
      }

      router.replace('/')
    } catch {
      setIsDeleting(false)
      setShowDeleteConfirm(false)
      showToast('삭제에 실패했습니다. 다시 시도해주세요.')
    }
  }, [editRecordId, user, router, state.targetId, state.targetType, showToast])
  // 수정 모드 로딩
  if (isEditLoading) {
    return (
      <div className="flex min-h-dvh items-center justify-center" style={{ color: 'var(--text-hint)' }}>
        <div className="h-6 w-6 animate-spin rounded-full border-[3px] border-[var(--accent-food)] border-t-transparent" />
      </div>
    )
  }

  const variant = state.targetType === 'wine' ? 'wine' : 'food'
  const saveLabel = isEditMode ? '수정 완료' : '기록 완료'

  const photoPickerSlot = (
    <PhotoPicker
      photos={photos}
      onAddFiles={addFiles}
      onRemovePhoto={removePhoto}
      onReplacePhoto={replacePhoto}
      onReorderPhotos={reorderPhotos}
      onTogglePublic={togglePublic}
      isUploading={isUploading}
      isMaxReached={photos.length >= PHOTO_CONSTANTS.MAX_PHOTOS}
      theme={state.targetType === 'wine' ? 'wine' : 'food'}
    />
  )

  // 수정 모드 초기 데이터 빌드 — 모든 필드가 record에 직접 존재
  const restaurantInitial = editingRecord && editingRecord.targetType === 'restaurant' ? {
    axisX: editingRecord.axisX ?? null,
    axisY: editingRecord.axisY ?? null,
    satisfaction: editingRecord.satisfaction ?? null,
    scene: editingRecord.scene ?? null,
    comment: editingRecord.comment ?? null,
    companions: editingRecord.companions ?? null,
    privateNote: editingRecord.privateNote ?? null,
    menuTags: editingRecord.menuTags,
    totalPrice: editingRecord.totalPrice ?? null,
    visitDate: editingRecord.visitDate ?? null,
  } : undefined

  const wineInitial = editingRecord && editingRecord.targetType === 'wine' ? {
    axisX: editingRecord.axisX ?? null,
    axisY: editingRecord.axisY ?? null,
    satisfaction: editingRecord.satisfaction ?? null,
    aromaPrimary: editingRecord.aromaPrimary ?? [],
    aromaSecondary: editingRecord.aromaSecondary ?? [],
    aromaTertiary: editingRecord.aromaTertiary ?? [],
    complexity: editingRecord.complexity ?? null,
    finish: editingRecord.finish ?? null,
    balance: editingRecord.balance ?? null,
    intensity: editingRecord.intensity ?? null,
    pairingCategories: editingRecord.pairingCategories as string[] | null,
    comment: editingRecord.comment ?? null,
    purchasePrice: editingRecord.purchasePrice ?? null,
    companions: editingRecord.companions ?? null,
    privateNote: editingRecord.privateNote ?? null,
    visitDate: editingRecord.visitDate ?? null,
  } : undefined

  return (
    <div className="content-detail flex min-h-dvh flex-col">
      <AppHeader />
      <FabBack onClick={handleBack} />

      {state.targetType === 'restaurant' ? (
        <RestaurantRecordForm
          key={editRecordId ?? (aiPrefill ? 'prefilled' : 'default')}
          target={{
            id: state.targetId,
            name: state.targetName,
            genre: aiPrefill?.genre ?? state.targetMeta.split(' · ')[0],
            area: state.targetMeta.split(' · ')[1],
            address: recordExtra?.address,
            categoryPath: recordExtra?.categoryPath,
            distance: recordExtra?.distance,
          }}
          genreHint={genreHint ?? aiPrefill?.genre}
          referenceRecords={isEditMode ? [] : referenceRecords}
          initialData={restaurantInitial ?? (aiPrefill?.foodType ? { menuTags: [aiPrefill.foodType], axisX: null, axisY: null, satisfaction: null, scene: null, comment: null, companions: null, privateNote: null, totalPrice: null, visitDate: null } : undefined)}
          saveLabel={saveLabel}
          onSave={(data) => handleSave({ ...data, targetType: 'restaurant' })}
          isLoading={isLoading}
          photoSlot={photoPickerSlot}
          recentCompanions={recentCompanions}
          onDelete={isEditMode ? () => setShowDeleteConfirm(true) : undefined}
          isDeleting={isDeleting}
        />
      ) : (
        <WineRecordForm
          key={editRecordId ?? (wineData?.aromaPrimary ? 'wine-ai' : wineData ? 'wine-loaded' : 'wine-init')}
          target={{
            id: state.targetId,
            name: state.targetName,
            wineType: wineData?.wineType ?? state.targetMeta.split(' · ')[0],
            region: wineData?.region ?? state.targetMeta.split(' · ')[1],
            subRegion: wineData?.subRegion,
            appellation: wineData?.appellation,
            country: wineData?.country ?? state.targetMeta.split(' · ')[2],
            vintage: wineData?.vintage ?? (() => {
              const v = searchParams.get('vintage')
              return v ? Number(v) : undefined
            })(),
            variety: wineData?.variety ?? searchParams.get('variety') ?? undefined,
            grapeVarieties: wineData?.grapeVarieties,
            producer: wineData?.producer ?? searchParams.get('producer') ?? undefined,
            abv: wineData?.abv,
            bodyLevel: wineData?.bodyLevel,
            acidityLevel: wineData?.acidityLevel,
            sweetnessLevel: wineData?.sweetnessLevel,
            classification: wineData?.classification,
            servingTemp: wineData?.servingTemp,
            decanting: wineData?.decanting,
            referencePriceMin: wineData?.referencePriceMin,
            referencePriceMax: wineData?.referencePriceMax,
            drinkingWindowStart: wineData?.drinkingWindowStart,
            drinkingWindowEnd: wineData?.drinkingWindowEnd,
            vivinoRating: wineData?.vivinoRating,
            criticScores: wineData?.criticScores,
            tastingNotes: wineData?.tastingNotes,
            foodPairings: wineData?.foodPairings,
            priceReview: wineData?.priceReview,
            aromaPrimary: wineData?.aromaPrimary,
            aromaSecondary: wineData?.aromaSecondary,
            aromaTertiary: wineData?.aromaTertiary,
            balance: wineData?.balance,
            finish: wineData?.finish,
            intensity: wineData?.intensity,
            isAiRecognized: !!wineData,
          }}
          referenceRecords={isEditMode ? [] : referenceRecords}
          initialData={wineInitial}
          saveLabel={saveLabel}
          onSave={(data) => handleSave({ ...data, targetType: 'wine' })}
          isLoading={isLoading}
          photoSlot={photoPickerSlot}
          recentCompanions={recentCompanions}
          onDelete={isEditMode ? () => setShowDeleteConfirm(true) : undefined}
          isDeleting={isDeleting}
        />
      )}

      {isEditMode && (
        <DeleteConfirmModal
          isOpen={showDeleteConfirm}
          isDeleting={isDeleting}
          onConfirm={handleDelete}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      )}

    </div>
  )
}

export function RecordFlowContainer() {
  return (
    <Suspense fallback={<div className="flex min-h-dvh items-center justify-center" style={{ color: 'var(--text-hint)' }}>로딩 중...</div>}>
      <RecordFlowInner />
    </Suspense>
  )
}
