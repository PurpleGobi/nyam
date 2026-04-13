'use client'

import { useState, useCallback, useEffect, useTransition, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import type { RecordTargetType, CreateRecordInput, DiningRecord } from '@/domain/entities/record'
import type { AddFlowEntryPath } from '@/domain/entities/add-flow'
import { useAuth } from '@/presentation/providers/auth-provider'
import { useCreateRecord } from '@/application/hooks/use-create-record'
import { usePhotoUpload } from '@/application/hooks/use-photo-upload'
import { extractExifFromFile } from '@/shared/utils/exif-parser'
import { todayInTz, detectBrowserTimezone } from '@/shared/utils/date-format'
import { validateExifGps } from '@/domain/services/exif-validator'
import { useXpAward } from '@/application/hooks/use-xp-award'
import { useXp } from '@/application/hooks/use-xp'
import { useDeleteRecord } from '@/application/hooks/use-delete-record'
import { usePhotoManagement } from '@/application/hooks/use-photo-management'
import { useRecordEditor } from '@/application/hooks/use-record-editor'
import { useRecordReferences } from '@/application/hooks/use-record-references'
import { useRecordUpdate } from '@/application/hooks/use-record-update'
import { useTargetMeta } from '@/application/hooks/use-target-meta'
import { useWineMeta } from '@/application/hooks/use-wine-meta'
import { PHOTO_CONSTANTS } from '@/domain/entities/record-photo'
import { AppHeader } from '@/presentation/components/layout/app-header'
import { FabBack } from '@/presentation/components/layout/fab-back'
import { DeleteConfirmModal } from '@/presentation/components/record/delete-confirm-modal'
import { useBubbleAutoSync } from '@/application/hooks/use-bubble-auto-sync'
import { useBubbleItems } from '@/application/hooks/use-bubble-items'
import { useSettings } from '@/application/hooks/use-settings'
import { PhotoPicker } from '@/presentation/components/record/photo-picker'
import { RestaurantRecordForm } from '@/presentation/components/record/restaurant-record-form'
import { WineRecordForm } from '@/presentation/components/record/wine-record-form'
import { useToast } from '@/presentation/components/ui/toast'
import { BubblePickerSheet } from '@/presentation/components/bubble/bubble-picker-sheet'

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

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showAddToBubble, setShowAddToBubble] = useState(false)
  const [savedTargetId, setSavedTargetId] = useState<string | null>(null)

  const { bubblesWithStatus, isLoading: isBubblesLoading, toggleItem: toggleBubbleItem } = useBubbleItems(
    user?.id ?? null,
    savedTargetId ?? (state.targetId || null),
    state.targetType,
  )
  const [genreHint] = useState<string | null>(() => {
    try {
      const hint = sessionStorage.getItem('nyam_genre_hint')
      if (hint) { sessionStorage.removeItem('nyam_genre_hint'); return hint }
    } catch {}
    return null
  })
  const [recordExtra] = useState<{ categoryPath?: string; address?: string; distance?: string } | null>(() => {
    try {
      const extra = sessionStorage.getItem('nyam_record_extra')
      if (extra) { sessionStorage.removeItem('nyam_record_extra'); return JSON.parse(extra) as { categoryPath?: string; address?: string; distance?: string } }
    } catch {}
    return null
  })

  const { settings } = useSettings()
  const prefTimezone = settings?.prefTimezone ?? null
  const { deleteRecord, isDeleting } = useDeleteRecord()
  const { savePhotos, deletePhoto: deletePhotoById, getPhotosByRecordId, deleteImage } = usePhotoManagement()
  const { updateRecord } = useRecordUpdate()
  const { fetchTargetXpMeta } = useTargetMeta()

  const isEditMode = !!editRecordId

  // 수정 모드: 기존 기록 + 사진 + 대상 정보 로드
  const { record: editingRecord, photos: editPhotos, targetMeta: editorTargetMeta, isLoading: isEditLoading } = useRecordEditor(editRecordId)

  // 수정 모드 기록 로드 완료 시 state 반영 (렌더 중 setState 패턴)
  const [prevEditingRecord, setPrevEditingRecord] = useState(editingRecord)
  if (prevEditingRecord !== editingRecord && editorTargetMeta && editingRecord) {
    setPrevEditingRecord(editingRecord)
    setState((prev) => ({
      ...prev,
      targetId: editingRecord.targetId,
      targetType: editingRecord.targetType,
      targetName: editorTargetMeta.targetName || prev.targetName,
      targetMeta: editorTargetMeta.targetMeta || prev.targetMeta,
    }))
    if (editPhotos.length > 0) {
      initExistingPhotos(
        editPhotos.map((p) => ({
          id: p.id,
          url: p.url,
          orderIndex: p.orderIndex,
          isPublic: p.isPublic,
        })),
      )
    }
  }

  // 이전 기록 참조점 + 최근 동행자
  const { referenceRecords, recentCompanions } = useRecordReferences(
    user?.id ?? null,
    state.targetId || null,
    editRecordId,
  )

  // 와인 메타 자동채움
  const { wineData, setWineData } = useWineMeta(
    state.targetId || null,
    targetType,
    editRecordId,
  )

  const [isSaving, setIsSaving] = useState(false)
  const isLoading = isSaving || isRecordLoading || isUploading

  // sessionStorage에서 AI prefill 읽기 (lazy initializer)
  const [aiPrefill] = useState<{ genre?: string; foodType?: string } | null>(() => {
    if (isEditMode) return null
    try {
      const prefillStr = sessionStorage.getItem('nyam_ai_prefill')
      if (prefillStr) {
        sessionStorage.removeItem('nyam_ai_prefill')
        return JSON.parse(prefillStr) as { genre?: string; foodType?: string }
      }
    } catch {}
    return null
  })

  // sessionStorage에서 촬영 사진 URL 읽기 (비동기 fetch 필요)
  const [, startPhotoTransition] = useTransition()
  useEffect(() => {
    if (isEditMode) return
    try {
      const photoUrl = sessionStorage.getItem('nyam_captured_photo_url')
      if (photoUrl) {
        sessionStorage.removeItem('nyam_captured_photo_url')
        startPhotoTransition(async () => {
          try {
            const res = await fetch(photoUrl)
            const blob = await res.blob()
            const file = new File([blob], 'camera-capture.webp', { type: blob.type || 'image/webp' })
            addFiles([file])
          } catch {}
        })
      }
    } catch {}
  }, [isEditMode, addFiles, startPhotoTransition])

  const handleSave = useCallback(
    async (formData: { targetId: string; targetType: RecordTargetType; [key: string]: unknown }) => {
      if (!user || isSaving) return
      setIsSaving(true)
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
            visitDate: (formData.visitDate as string) ?? todayInTz(prefTimezone ?? detectBrowserTimezone()),
            menuTags: (formData.menuTags as string[]) ?? null,
            pairingCategories: formData.pairingCategories as DiningRecord['pairingCategories'],
            linkedWineId: formData.linkedWineId as string | undefined,
            linkedRestaurantId: formData.linkedRestaurantId as string | undefined,
          }
          savedRecord = await updateRecord(editRecordId, updateData)

          // 수정 모드 사진 처리
          const dbPhotos = await getPhotosByRecordId(editRecordId)
          const dbIds = new Set(dbPhotos.map((p) => p.id))
          const currentIds = new Set(photos.map((p) => p.id))

          // 1. 유저가 삭제한 기존 사진 → DB + Storage 삭제
          for (const dp of dbPhotos) {
            if (!currentIds.has(dp.id)) {
              await deleteImage(dp.url).catch(() => {})
              await deletePhotoById(dp.id)
            }
          }

          // 2. 크롭 편집된 기존 사진 → 기존 Storage/DB 삭제
          for (const p of photos) {
            if (dbIds.has(p.id) && p.status === 'pending') {
              const dbPhoto = dbPhotos.find((dp) => dp.id === p.id)
              if (dbPhoto) {
                await deleteImage(dbPhoto.url).catch(() => {})
                await deletePhotoById(p.id)
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
              await savePhotos(editRecordId, newResults)
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
            visitDate: (formData.visitDate as string) ?? todayInTz(prefTimezone ?? detectBrowserTimezone()),
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
                await savePhotos(savedRecord.id, uploadedPhotos)
              }
            } catch {
              showToast('사진 업로드에 실패했습니다. 상세 페이지에서 다시 추가할 수 있습니다.')
            }
          }
        }

        // ── XP 적립 ──
        if (thresholds.length > 0) {
          const targetXpMeta = await fetchTargetXpMeta(savedRecord.targetId, savedRecord.targetType)
          const previousXp = isEditMode ? (editingRecord?.recordQualityXp ?? 0) : undefined
          awardXp(
            user.id, savedRecord,
            targetXpMeta.area, targetXpMeta.genre, targetXpMeta.region, targetXpMeta.variety,
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

        // 신규 기록 완료 → 토스트 + "리스트에 추가" 옵션
        showToast('기록이 추가되었습니다')
        setSavedTargetId(savedRecord.targetId)
        setShowAddToBubble(true)
      } catch {
        setIsSaving(false)
      }
    },
    [user, isSaving, createRecord, photos, uploadAll, entryPath, targetLat, targetLng, isEditMode, editRecordId, editingRecord, router, state.targetId, state.targetType, syncRecordToAllBubbles, awardXp, thresholds, prefTimezone, updateRecord, getPhotosByRecordId, deleteImage, deletePhotoById, savePhotos, fetchTargetXpMeta, showToast],
  )

  const handleBack = useCallback(() => router.back(), [router])
  const handleDelete = useCallback(async () => {
    if (!editRecordId || !user) return
    try {
      const result = await deleteRecord(editRecordId, user.id, state.targetId, state.targetType)

      setShowDeleteConfirm(false)
      showToast('기록이 삭제되었습니다')
      if (result.sharesCount > 0) {
        showToast(`${result.sharesCount}개 버블 공유도 함께 삭제되었습니다`)
      }
      if (result.remainingCount > 0) {
        showToast(`이 ${state.targetType === 'wine' ? '와인' : '식당'}의 기록이 ${result.remainingCount}건 남아있습니다`)
      }

      router.replace('/')
    } catch {
      setShowDeleteConfirm(false)
      showToast('삭제에 실패했습니다. 다시 시도해주세요.')
    }
  }, [editRecordId, user, router, state.targetId, state.targetType, showToast, deleteRecord])
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

      <BubblePickerSheet
        isOpen={showAddToBubble}
        onClose={() => {
          setShowAddToBubble(false)
          router.replace('/')
        }}
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

export function RecordFlowContainer() {
  return (
    <Suspense fallback={<div className="flex min-h-dvh items-center justify-center" style={{ color: 'var(--text-hint)' }}>로딩 중...</div>}>
      <RecordFlowInner />
    </Suspense>
  )
}
