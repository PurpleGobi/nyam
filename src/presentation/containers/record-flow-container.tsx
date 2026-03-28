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
import { photoRepo, recordRepo } from '@/shared/di/container'
import { PHOTO_CONSTANTS } from '@/domain/entities/record-photo'
import { RecordNav } from '@/presentation/components/record/record-nav'
import { RecordSuccess } from '@/presentation/components/record/record-success'
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
  const { photos, addFiles, removePhoto, uploadAll, isUploading } = usePhotoUpload()

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
  const [referenceRecords, setReferenceRecords] = useState<QuadrantReferencePoint[]>([])
  const [isEditLoading, setIsEditLoading] = useState(!!editRecordId)
  const isLoading = isRecordLoading || isUploading

  const isEditMode = !!editRecordId

  // 수정 모드: 기존 기록 데이터 로드
  useEffect(() => {
    if (!editRecordId) return
    let cancelled = false
    const recordIdToLoad = editRecordId

    async function loadRecord() {
      try {
        const record = await recordRepo.findById(recordIdToLoad)
        if (cancelled || !record) return
        setEditingRecord(record)
        setState((prev) => ({
          ...prev,
          targetId: record.targetId,
          targetType: record.targetType,
        }))
      } finally {
        if (!cancelled) setIsEditLoading(false)
      }
    }
    loadRecord()
    return () => { cancelled = true }
  }, [editRecordId])

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

  // sessionStorage에서 촬영 이미지를 읽어 자동 첨부
  useEffect(() => {
    if (isEditMode) return // 수정 모드에서는 카메라 이미지 불필요
    try {
      const base64 = sessionStorage.getItem('nyam_captured_image')
      if (!base64) return
      sessionStorage.removeItem('nyam_captured_image')

      const byteString = atob(base64)
      const ab = new ArrayBuffer(byteString.length)
      const ia = new Uint8Array(ab)
      for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i)
      }
      const file = new File([ab], 'camera-capture.jpg', { type: 'image/jpeg' })
      addFiles([file])
    } catch {
      // ignore
    }
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
      <RecordSuccess
        variant={state.targetType === 'wine' ? 'wine' : 'food'}
        targetName={state.targetName}
        targetMeta={state.targetMeta}
        photoError={photoError}
        exifWarning={exifWarning}
        onAddMore={handleAddMore}
        onAddAnother={handleAddAnother}
        onGoHome={handleClose}
      />
    )
  }

  const variant = state.targetType === 'wine' ? 'wine' : 'food'
  const saveLabel = isEditMode ? '수정 완료' : '기록 완료'

  const photoPickerSlot = !isEditMode ? (
    <PhotoPicker
      photos={photos}
      onAddFiles={addFiles}
      onRemovePhoto={removePhoto}
      isUploading={isUploading}
      isMaxReached={photos.length >= PHOTO_CONSTANTS.MAX_PHOTOS}
      theme={state.targetType === 'wine' ? 'wine' : 'food'}
    />
  ) : null

  // 수정 모드 초기 데이터 빌드
  const restaurantInitial = editingRecord && editingRecord.targetType === 'restaurant' ? {
    axisX: editingRecord.axisX ?? 50,
    axisY: editingRecord.axisY ?? 50,
    satisfaction: editingRecord.satisfaction ?? 50,
    scene: editingRecord.scene,
    comment: editingRecord.comment,
    companions: editingRecord.companions,
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
    visitDate: editingRecord.visitDate,
  } : undefined

  return (
    <div className="flex min-h-dvh flex-col">
      <RecordNav
        title={isEditMode ? '기록 수정' : '기록'}
        variant={variant}
        onBack={handleBack}
        onClose={handleClose}
      />

      {state.targetType === 'restaurant' ? (
        <RestaurantRecordForm
          target={{
            id: state.targetId,
            name: state.targetName,
            genre: state.targetMeta.split(' · ')[0],
            area: state.targetMeta.split(' · ')[1],
          }}
          referenceRecords={referenceRecords}
          initialData={restaurantInitial}
          saveLabel={saveLabel}
          onSave={(data) => handleSave({ ...data, targetType: 'restaurant' })}
          isLoading={isLoading}
          photoSlot={photoPickerSlot}
        />
      ) : (
        <WineRecordForm
          target={{
            id: state.targetId,
            name: state.targetName,
            wineType: state.targetMeta.split(' · ')[0],
            region: state.targetMeta.split(' · ')[1],
          }}
          referenceRecords={referenceRecords}
          initialData={wineInitial}
          saveLabel={saveLabel}
          onSave={(data) => handleSave({ ...data, targetType: 'wine' })}
          isLoading={isLoading}
          photoSlot={photoPickerSlot}
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
