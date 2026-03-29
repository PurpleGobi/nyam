'use client'

import { useState, useCallback, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import type { RecordTargetType, CreateRecordInput, DiningRecord } from '@/domain/entities/record'
import type { QuadrantReferencePoint } from '@/domain/entities/quadrant'
import { determineRecordStatus } from '@/domain/entities/add-flow'
import type { AddFlowEntryPath } from '@/domain/entities/add-flow'
import { useAuth } from '@/presentation/providers/auth-provider'
import { useCreateRecord } from '@/application/hooks/use-create-record'
import { usePhotoUpload } from '@/application/hooks/use-photo-upload'
import { extractExifFromFile } from '@/shared/utils/exif-parser'
import { validateExifGps } from '@/domain/services/exif-validator'
import { photoRepo, recordRepo, xpRepo, wishlistRepo, imageService } from '@/shared/di/container'
import { PHOTO_CONSTANTS } from '@/domain/entities/record-photo'
import { AppHeader } from '@/presentation/components/layout/app-header'
import { FabBack } from '@/presentation/components/layout/fab-back'
import { RecordSuccess } from '@/presentation/components/record/record-success'
import { DeleteConfirmModal } from '@/presentation/components/record/delete-confirm-modal'
import { ShareToBubbleSheet } from '@/presentation/components/share/share-to-bubble-sheet'
import { useShareRecord } from '@/application/hooks/use-share-record'
import { useSettings } from '@/application/hooks/use-settings'
import { PhotoPicker } from '@/presentation/components/record/photo-picker'
import { RestaurantRecordForm } from '@/presentation/components/record/restaurant-record-form'
import { WineRecordForm } from '@/presentation/components/record/wine-record-form'

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

  // 수정 모드: 기존 기록 + 사진 로드
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
        setState((prev) => ({
          ...prev,
          targetId: record.targetId,
          targetType: record.targetType,
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
            x: r.axisX!,
            y: r.axisY!,
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
          // 수정 모드: UPDATE
          const updateData: Partial<DiningRecord> = {
            axisX: formData.axisX as number | undefined,
            axisY: formData.axisY as number | undefined,
            satisfaction: formData.satisfaction as number | undefined,
            scene: formData.scene as string | undefined,
            comment: (formData.comment as string) ?? null,
            companions: (formData.companions as string[]) ?? null,
            companionCount: formData.companionCount as number | undefined,
            privateNote: (formData.privateNote as string) ?? null,
            menuTags: (formData.menuTags as string[]) ?? null,
            totalPrice: (formData.totalPrice as number) ?? null,
            purchasePrice: (formData.purchasePrice as number) ?? null,
            aromaRegions: (formData.aromaRegions as Record<string, unknown>) ?? null,
            aromaLabels: (formData.aromaLabels as string[]) ?? null,
            aromaColor: (formData.aromaColor as string) ?? null,
            complexity: (formData.complexity as number) ?? null,
            finish: (formData.finish as number) ?? null,
            balance: (formData.balance as number) ?? null,
            autoScore: (formData.autoScore as number) ?? null,
            pairingCategories: formData.pairingCategories as DiningRecord['pairingCategories'],
            visitDate: formData.visitDate as string | undefined,
            linkedWineId: formData.linkedWineId as string | undefined,
            linkedRestaurantId: formData.linkedRestaurantId as string | undefined,
          }
          savedRecord = await recordRepo.update(editRecordId, updateData)

          // 수정 모드에서도 사진 변경 처리
          try {
            const existingPhotos = await photoRepo.getPhotosByRecordId(editRecordId)
            const existingIds = new Set(existingPhotos.map((p) => p.id))
            const currentIds = new Set(photos.map((p) => p.id))

            // 삭제된 사진 처리
            for (const ep of existingPhotos) {
              if (!currentIds.has(ep.id)) {
                await photoRepo.deletePhoto(ep.id)
              }
            }

            // 새로 추가된 사진 업로드 (status가 pending인 것)
            const newPhotos = photos.filter((p) => !existingIds.has(p.id) && p.status !== 'uploaded')
            if (newPhotos.length > 0 && user) {
              for (const np of newPhotos) {
                const blob = await imageService.resizeImage(np.file)
                const url = await imageService.uploadImage(user.id, editRecordId, blob, np.id)
                await photoRepo.savePhotos(editRecordId, [{ url, orderIndex: np.orderIndex, isPublic: np.isPublic }])
              }
            }

            // 기존 사진 중 크롭 편집된 사진 (id가 동일하지만 status가 pending으로 변경된 것)
            const editedPhotos = photos.filter((p) => existingIds.has(p.id) && p.status === 'pending')
            if (editedPhotos.length > 0 && user) {
              for (const ep of editedPhotos) {
                // 기존 삭제 → 새로 업로드
                await photoRepo.deletePhoto(ep.id)
                const blob = await imageService.resizeImage(ep.file)
                const url = await imageService.uploadImage(user.id, editRecordId, blob, ep.id)
                await photoRepo.savePhotos(editRecordId, [{ url, orderIndex: ep.orderIndex, isPublic: ep.isPublic }])
              }
            }
          } catch {
            setPhotoError('사진 수정에 실패했습니다.')
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

          const input: CreateRecordInput = {
            userId: user.id,
            targetId: formData.targetId,
            targetType: formData.targetType,
            status: determineRecordStatus(entryPath, !!(formData.axisX || formData.axisY || formData.satisfaction)),
            hasExifGps,
            isExifVerified,
            axisX: formData.axisX as number | undefined,
            axisY: formData.axisY as number | undefined,
            satisfaction: formData.satisfaction as number | undefined,
            scene: formData.scene as string | undefined,
            comment: formData.comment as string | undefined,
            companions: formData.companions as string[] | undefined,
            companionCount: formData.companionCount as number | undefined,
            privateNote: formData.privateNote as string | undefined,
            menuTags: formData.menuTags as string[] | undefined,
            totalPrice: formData.totalPrice as number | undefined,
            purchasePrice: formData.purchasePrice as number | undefined,
            linkedWineId: formData.linkedWineId as string | undefined,
            linkedRestaurantId: formData.linkedRestaurantId as string | undefined,
            aromaRegions: formData.aromaRegions as Record<string, unknown> | undefined,
            aromaLabels: formData.aromaLabels as string[] | undefined,
            aromaColor: formData.aromaColor as string | undefined,
            complexity: formData.complexity as number | undefined,
            finish: formData.finish as number | undefined,
            balance: formData.balance as number | undefined,
            autoScore: formData.autoScore as number | undefined,
            pairingCategories: formData.pairingCategories as CreateRecordInput['pairingCategories'],
            visitDate: formData.visitDate as string | undefined,
            wineStatus: formData.targetType === 'wine' ? 'tasted' : undefined,
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

        // 수정 완료 후 네비게이션: from=record_detail → 기록 상세로 복귀
        if (isEditMode && entryPath === 'record_detail') {
          router.replace(`/records/${savedRecord.id}`)
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
    [user, createRecord, photos, uploadAll, entryPath, targetLat, targetLng, isEditMode, editRecordId, router, state.targetId, state.targetType],
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

  // 수정 모드 초기 데이터 빌드
  const restaurantInitial = editingRecord && editingRecord.targetType === 'restaurant' ? {
    axisX: editingRecord.axisX ?? 50,
    axisY: editingRecord.axisY ?? 50,
    satisfaction: editingRecord.satisfaction ?? 50,
    scene: editingRecord.scene,
    comment: editingRecord.comment,
    companions: editingRecord.companions,
    privateNote: editingRecord.privateNote,
    menuTags: editingRecord.menuTags,
    totalPrice: editingRecord.totalPrice,
    visitDate: editingRecord.visitDate,
  } : undefined

  const wineInitial = editingRecord && editingRecord.targetType === 'wine' ? {
    axisX: editingRecord.axisX ?? 50,
    axisY: editingRecord.axisY ?? 50,
    satisfaction: editingRecord.satisfaction ?? 50,
    aromaRegions: editingRecord.aromaRegions,
    aromaLabels: editingRecord.aromaLabels,
    aromaColor: editingRecord.aromaColor,
    complexity: editingRecord.complexity,
    finish: editingRecord.finish,
    balance: editingRecord.balance,
    pairingCategories: editingRecord.pairingCategories as string[] | null,
    comment: editingRecord.comment,
    purchasePrice: editingRecord.purchasePrice,
    companions: editingRecord.companions,
    privateNote: editingRecord.privateNote,
    visitDate: editingRecord.visitDate,
  } : undefined

  return (
    <div className="content-detail flex min-h-dvh flex-col">
      <AppHeader />
      <FabBack onClick={handleBack} />

      {state.targetType === 'restaurant' ? (
        <RestaurantRecordForm
          key={aiPrefill ? 'prefilled' : 'default'}
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
          referenceRecords={referenceRecords}
          initialData={restaurantInitial ?? (aiPrefill?.foodType ? { menuTags: [aiPrefill.foodType], axisX: 50, axisY: 50, satisfaction: 50, scene: null, comment: null, companions: null, privateNote: null, totalPrice: null, visitDate: null } : undefined)}
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
            wineType: state.targetMeta.split(' · ')[0],
            region: state.targetMeta.split(' · ')[1],
            country: state.targetMeta.split(' · ')[2],
            vintage: (() => {
              const v = searchParams.get('vintage')
              return v ? Number(v) : undefined
            })(),
            variety: searchParams.get('variety') ?? undefined,
            producer: searchParams.get('producer') ?? undefined,
          }}
          referenceRecords={referenceRecords}
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
