'use client'

import { useState, useCallback, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import type { RecordTargetType, CreateRecordInput, DiningRecord, RecordVisit } from '@/domain/entities/record'
import type { QuadrantReferencePoint } from '@/domain/entities/quadrant'
import { determineRecordStatus } from '@/domain/entities/add-flow'
import type { AddFlowEntryPath } from '@/domain/entities/add-flow'
import { useAuth } from '@/presentation/providers/auth-provider'
import { useCreateRecord } from '@/application/hooks/use-create-record'
import { usePhotoUpload } from '@/application/hooks/use-photo-upload'
import { extractExifFromFile } from '@/shared/utils/exif-parser'
import { validateExifGps } from '@/domain/services/exif-validator'
import { photoRepo, recordRepo, xpRepo, wishlistRepo, imageService, restaurantRepo, wineRepo } from '@/shared/di/container'
import { PHOTO_CONSTANTS } from '@/domain/entities/record-photo'
import { AppHeader } from '@/presentation/components/layout/app-header'
import { FabBack } from '@/presentation/components/layout/fab-back'
import { RecordSuccess } from '@/presentation/components/record/record-success'
import { DeleteConfirmModal } from '@/presentation/components/record/delete-confirm-modal'
import { ShareToBubbleSheet } from '@/presentation/components/share/share-to-bubble-sheet'
import { useShareRecord } from '@/application/hooks/use-share-record'
import { useBubbleAutoSync } from '@/application/hooks/use-bubble-auto-sync'
import { useSettings } from '@/application/hooks/use-settings'
import { PhotoPicker } from '@/presentation/components/record/photo-picker'
import { RestaurantRecordForm } from '@/presentation/components/record/restaurant-record-form'
import { WineRecordForm } from '@/presentation/components/record/wine-record-form'
import { Toast } from '@/presentation/components/ui/toast'

type RecordFlowStep = 'form' | 'success'

interface RecordFlowState {
  step: RecordFlowStep
  targetType: RecordTargetType
  targetId: string
  targetName: string
  targetMeta: string
  savedRecordId: string | null
}

function RecordFlowInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useAuth()
  const { createRecord, isLoading: isRecordLoading } = useCreateRecord()
  const { photos, initExistingPhotos, addFiles, removePhoto, replacePhoto, togglePublic, uploadAll, isUploading } = usePhotoUpload()
  const { syncRecordToAllBubbles } = useBubbleAutoSync(user?.id ?? null)

  const targetType = (searchParams.get('type') ?? 'restaurant') as RecordTargetType
  const entryPath = (searchParams.get('from') ?? 'camera') as AddFlowEntryPath
  const editRecordId = searchParams.get('edit')
  const targetLat = searchParams.get('lat') ? Number(searchParams.get('lat')) : null
  const targetLng = searchParams.get('lng') ? Number(searchParams.get('lng')) : null

  const [state, setState] = useState<RecordFlowState>({
    step: 'form',
    targetType,
    targetId: searchParams.get('targetId') ?? '',
    targetName: searchParams.get('name') ?? '',
    targetMeta: searchParams.get('meta') ?? '',
    savedRecordId: null,
  })

  const [photoError, setPhotoError] = useState<string | null>(null)
  const [exifWarning, setExifWarning] = useState<string | null>(null)
  const [editingRecord, setEditingRecord] = useState<DiningRecord | null>(null)
  const [showShareSheet, setShowShareSheet] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [toastMsg, setToastMsg] = useState<string | null>(null)
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

  const { availableBubbles, shareToBubbles, canShare } = useShareRecord(
    user?.id ?? null,
    state.savedRecordId,
  )
  const { settings } = useSettings()
  const prefBubbleShare = settings?.prefBubbleShare ?? 'ask'
  const [referenceRecords, setReferenceRecords] = useState<QuadrantReferencePoint[]>([])
  const [recentCompanions, setRecentCompanions] = useState<string[]>([])
  const [wineData, setWineData] = useState<{
    wineType?: string; region?: string; country?: string
    variety?: string; producer?: string; vintage?: number
  } | null>(null)
  const [isEditLoading, setIsEditLoading] = useState(!!editRecordId)
  const isLoading = isRecordLoading || isUploading

  // pref_bubble_share 분기: 'ask' → 시트 표시, 'auto' → 자동 공유, 'never' → 미표시
  useEffect(() => {
    if (state.step !== 'success' || !state.savedRecordId) return
    if (prefBubbleShare === 'ask' && availableBubbles.length > 0 && canShare) {
      setShowShareSheet(true)
    } else if (prefBubbleShare === 'auto' && availableBubbles.length > 0 && canShare) {
      const shareableIds = availableBubbles.filter((b) => !b.isShared && b.canShare).map((b) => b.id)
      if (shareableIds.length > 0) {
        shareToBubbles(shareableIds.slice(0, 1))
      }
    }
    // 'never': 아무 동작 없음
  }, [state.step, state.savedRecordId, prefBubbleShare, availableBubbles, canShare, shareToBubbles])

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
          country: wine.country ?? undefined,
          variety: bestVariety,
          producer: wine.producer ?? undefined,
          vintage: wine.vintage ?? undefined,
        })
      } catch {
        // 조회 실패 시 URL param 폴백
      }
    }
    loadWine()
    return () => { cancelled = true }
  }, [targetType, state.targetId])

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
          .filter((r) => r.visits[0]?.axisX !== null && r.visits[0]?.axisY !== null && r.id !== editRecordId)
          .slice(0, 12)
          .map((r) => {
            const v = r.visits[0]
            return {
              x: v?.axisX ?? 50,
              y: v?.axisY ?? 50,
              satisfaction: v?.satisfaction ?? 50,
              name: r.latestVisitDate ?? '',
              score: v?.satisfaction ?? 50,
            }
          })
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
          for (const v of r.visits) {
            if (v.companions) {
              for (const name of v.companions) {
                freq.set(name, (freq.get(name) ?? 0) + 1)
              }
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

  // sessionStorage에서 촬영 이미지를 읽어 자동 첨부
  const [aiPrefill, setAiPrefill] = useState<{ genre?: string; foodType?: string } | null>(null)

  // sessionStorage에서 촬영 이미지 + AI prefill 읽기
  useEffect(() => {
    if (isEditMode) return
    try {
      const base64 = sessionStorage.getItem('nyam_captured_image')
      if (base64) {
        sessionStorage.removeItem('nyam_captured_image')
        const byteString = atob(base64)
        const ab = new ArrayBuffer(byteString.length)
        const ia = new Uint8Array(ab)
        for (let i = 0; i < byteString.length; i++) {
          ia[i] = byteString.charCodeAt(i)
        }
        const file = new File([ab], 'camera-capture.jpg', { type: 'image/jpeg' })
        addFiles([file])
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
      setPhotoError(null)

      try {
        let savedRecord: DiningRecord

        if (isEditMode && editRecordId) {
          // 수정 모드: UPDATE — visit-level fields go into visits[0] patch
          const visitPatch: Partial<RecordVisit> = {
            axisX: formData.axisX as number | undefined ?? null,
            axisY: formData.axisY as number | undefined ?? null,
            satisfaction: formData.satisfaction as number | undefined ?? null,
            scene: (formData.scene as string) ?? null,
            comment: (formData.comment as string) ?? null,
            companions: (formData.companions as string[]) ?? null,
            companionCount: formData.companionCount as number | undefined ?? null,
            tips: (formData.privateNote as string) ?? null,
            totalPrice: (formData.totalPrice as number) ?? null,
            purchasePrice: (formData.purchasePrice as number) ?? null,
            aromaRegions: (formData.aromaRegions as Record<string, unknown>) ?? null,
            aromaLabels: (formData.aromaLabels as string[]) ?? null,
            aromaColor: (formData.aromaColor as string) ?? null,
            complexity: (formData.complexity as number) ?? null,
            finish: (formData.finish as number) ?? null,
            balance: (formData.balance as number) ?? null,
            autoScore: (formData.autoScore as number) ?? null,
            mealTime: (formData.mealTime as RecordVisit['mealTime']) ?? null,
            date: (formData.visitDate as string) ?? new Date().toISOString().split('T')[0],
          }
          const updateData: Partial<DiningRecord> = {
            menuTags: (formData.menuTags as string[]) ?? null,
            pairingCategories: formData.pairingCategories as DiningRecord['pairingCategories'],
            linkedWineId: formData.linkedWineId as string | undefined,
            linkedRestaurantId: formData.linkedRestaurantId as string | undefined,
          }
          // Update the latest visit in the visits array
          if (editingRecord && editingRecord.visits.length > 0) {
            const { updateVisit, calcAvgSatisfaction } = await import('@/domain/entities/record')
            const updatedVisits = updateVisit(editingRecord.visits, editingRecord.visits[0].date, visitPatch)
            Object.assign(updateData, {
              visits: updatedVisits,
              avgSatisfaction: calcAvgSatisfaction(updatedVisits),
              latestVisitDate: updatedVisits[0]?.date ?? null,
            })
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
              if (validation.warningMessage) {
                setExifWarning(validation.warningMessage)
              }
            }
          }

          const visitDate = (formData.visitDate as string) ?? new Date().toISOString().split('T')[0]
          const visit: RecordVisit = {
            date: visitDate,
            axisX: (formData.axisX as number) ?? null,
            axisY: (formData.axisY as number) ?? null,
            satisfaction: (formData.satisfaction as number) ?? null,
            comment: (formData.comment as string) ?? null,
            tips: (formData.privateNote as string) ?? null,
            scene: (formData.scene as string) ?? null,
            mealTime: (formData.mealTime as RecordVisit['mealTime']) ?? null,
            companions: (formData.companions as string[]) ?? null,
            companionCount: (formData.companionCount as number) ?? null,
            totalPrice: (formData.totalPrice as number) ?? null,
            purchasePrice: (formData.purchasePrice as number) ?? null,
            aromaRegions: (formData.aromaRegions as Record<string, unknown>) ?? null,
            aromaLabels: (formData.aromaLabels as string[]) ?? null,
            aromaColor: (formData.aromaColor as string) ?? null,
            complexity: (formData.complexity as number) ?? null,
            finish: (formData.finish as number) ?? null,
            balance: (formData.balance as number) ?? null,
            autoScore: (formData.autoScore as number) ?? null,
            hasExifGps,
            isExifVerified,
          }
          const input: CreateRecordInput = {
            userId: user.id,
            targetId: formData.targetId,
            targetType: formData.targetType,
            status: determineRecordStatus(entryPath, !!(formData.axisX || formData.axisY || formData.satisfaction)),
            menuTags: formData.menuTags as string[] | undefined,
            linkedWineId: formData.linkedWineId as string | undefined,
            linkedRestaurantId: formData.linkedRestaurantId as string | undefined,
            pairingCategories: formData.pairingCategories as CreateRecordInput['pairingCategories'],
            wineStatus: formData.targetType === 'wine' ? 'tasted' : undefined,
            visit,
          }
          savedRecord = await createRecord(input)

          // 선택한 장르가 있으면 식당 genre 업데이트
          if (formData.genre && formData.targetType === 'restaurant') {
            fetch('/api/restaurants', {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ id: formData.targetId, genre: formData.genre }),
            }).catch(() => {})
          }

          // 와인 메타 업데이트 (빈티지, 산지, 품종)
          if (formData.wineMetaUpdate && formData.targetType === 'wine') {
            const meta = formData.wineMetaUpdate as { vintage: number | null; region: string | null; country: string | null; variety: string | null }
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
              setPhotoError('사진 업로드에 실패했습니다. 상세 페이지에서 다시 추가할 수 있습니다.')
            }
          }
        }

        // 버블 자동 공유 동기화 (신규/수정 모두) + 토스트
        syncRecordToAllBubbles(savedRecord as unknown as { id: string } & Record<string, unknown>)
          .then((syncResult) => {
            if (syncResult.sharedTo.length > 0) {
              const names = syncResult.sharedTo.map((b) => b.bubbleName).join(', ')
              setToastMsg(`${names}에 공유됨`)
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

        setState((prev) => ({
          ...prev,
          step: 'success',
          savedRecordId: savedRecord.id,
        }))
      } catch {
        // useCreateRecord 내부에서 error state 처리
      }
    },
    [user, createRecord, photos, uploadAll, entryPath, targetLat, targetLng, isEditMode, editRecordId, editingRecord, router, state.targetId, state.targetType, syncRecordToAllBubbles],
  )

  const handleBack = useCallback(() => router.back(), [router])
  const handleClose = useCallback(() => router.push('/'), [router])
  const handleDelete = useCallback(async () => {
    if (!editRecordId || !user) return
    setIsDeleting(true)
    try {
      await recordRepo.delete(editRecordId)
      // XP 차감 + wishlist 복원은 record-detail과 동일 로직
      const histories = await xpRepo.getHistoriesByRecord(editRecordId)
      if (histories.length > 0) {
        let totalXpToDeduct = 0
        for (const h of histories) totalXpToDeduct += h.xpAmount
        await xpRepo.updateUserTotalXp(user.id, -totalXpToDeduct)
        await xpRepo.deleteByRecordId(editRecordId)
      }
      if (editingRecord) {
        const remaining = await recordRepo.findByUserAndTarget(user.id, editingRecord.targetId)
        if (remaining.filter((r) => r.id !== editRecordId).length === 0) {
          await wishlistRepo.updateVisitStatus(user.id, editingRecord.targetId, editingRecord.targetType, false)
        }
      }
      router.replace('/')
    } catch {
      setIsDeleting(false)
    }
  }, [editRecordId, user, editingRecord, router])
  const handleAddMore = useCallback(() => {
    const prefix = state.targetType === 'wine' ? 'wines' : 'restaurants'
    router.push(`/${prefix}/${state.targetId}`)
  }, [router, state.targetType, state.targetId])
  const handleAddAnother = useCallback(() => {
    router.push(`/add?type=${state.targetType}`)
  }, [router, state.targetType])

  // 수정 모드 로딩
  if (isEditLoading) {
    return (
      <div className="flex min-h-dvh items-center justify-center" style={{ color: 'var(--text-hint)' }}>
        <div className="h-6 w-6 animate-spin rounded-full border-[3px] border-[var(--accent-food)] border-t-transparent" />
      </div>
    )
  }

  if (state.step === 'success') {
    return (
      <>
        <RecordSuccess
          variant={state.targetType === 'wine' ? 'wine' : 'food'}
          targetName={state.targetName}
          targetMeta={state.targetMeta}
          photoError={photoError}
          exifWarning={exifWarning}
          onAddMore={handleAddMore}
          onAddAnother={handleAddAnother}
          onGoHome={handleClose}
          onShareToBubble={prefBubbleShare !== 'never' && availableBubbles.length > 0 && canShare ? () => setShowShareSheet(true) : undefined}
        />
        <ShareToBubbleSheet
          isOpen={showShareSheet}
          onClose={() => setShowShareSheet(false)}
          bubbles={availableBubbles}
          onShareMultiple={shareToBubbles}
        />
      </>
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
      onTogglePublic={togglePublic}
      isUploading={isUploading}
      isMaxReached={photos.length >= PHOTO_CONSTANTS.MAX_PHOTOS}
      theme={state.targetType === 'wine' ? 'wine' : 'food'}
    />
  )

  // 수정 모드 초기 데이터 빌드 — visit-level fields from visits[0]
  const editLatestVisit = editingRecord?.visits[0] ?? null
  const restaurantInitial = editingRecord && editingRecord.targetType === 'restaurant' ? {
    axisX: editLatestVisit?.axisX ?? null,
    axisY: editLatestVisit?.axisY ?? null,
    satisfaction: editLatestVisit?.satisfaction ?? null,
    scene: editLatestVisit?.scene ?? null,
    comment: editLatestVisit?.comment ?? null,
    companions: editLatestVisit?.companions ?? null,
    privateNote: editLatestVisit?.tips ?? null,
    menuTags: editingRecord.menuTags,
    totalPrice: editLatestVisit?.totalPrice ?? null,
    visitDate: editLatestVisit?.date ?? null,
  } : undefined

  const wineInitial = editingRecord && editingRecord.targetType === 'wine' ? {
    axisX: editLatestVisit?.axisX ?? null,
    axisY: editLatestVisit?.axisY ?? null,
    satisfaction: editLatestVisit?.satisfaction ?? null,
    aromaRegions: editLatestVisit?.aromaRegions ?? null,
    aromaLabels: editLatestVisit?.aromaLabels ?? null,
    aromaColor: editLatestVisit?.aromaColor ?? null,
    complexity: editLatestVisit?.complexity ?? null,
    finish: editLatestVisit?.finish ?? null,
    balance: editLatestVisit?.balance ?? null,
    pairingCategories: editingRecord.pairingCategories as string[] | null,
    comment: editLatestVisit?.comment ?? null,
    purchasePrice: editLatestVisit?.purchasePrice ?? null,
    companions: editLatestVisit?.companions ?? null,
    privateNote: editLatestVisit?.tips ?? null,
    visitDate: editLatestVisit?.date ?? null,
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
          target={{
            id: state.targetId,
            name: state.targetName,
            wineType: wineData?.wineType ?? state.targetMeta.split(' · ')[0],
            region: wineData?.region ?? state.targetMeta.split(' · ')[1],
            country: wineData?.country ?? state.targetMeta.split(' · ')[2],
            vintage: wineData?.vintage ?? (() => {
              const v = searchParams.get('vintage')
              return v ? Number(v) : undefined
            })(),
            variety: wineData?.variety ?? searchParams.get('variety') ?? undefined,
            producer: wineData?.producer ?? searchParams.get('producer') ?? undefined,
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

      <Toast message={toastMsg ?? ''} visible={!!toastMsg} onHide={() => setToastMsg(null)} />
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
