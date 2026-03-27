'use client'

import { useState, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import type { RecordTargetType } from '@/domain/entities/record'
import type { CreateRecordInput } from '@/domain/entities/record'
import { useAuth } from '@/presentation/providers/auth-provider'
import { useCreateRecord } from '@/application/hooks/use-create-record'
import { usePhotoUpload } from '@/application/hooks/use-photo-upload'
import { photoRepo } from '@/shared/di/container'
import { RecordNav } from '@/presentation/components/record/record-nav'
import { RecordSuccess } from '@/presentation/components/record/record-success'
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

  const [state, setState] = useState<RecordFlowState>({
    step: 'form',
    targetType,
    targetId: searchParams.get('targetId') ?? '',
    targetName: searchParams.get('name') ?? '',
    targetMeta: searchParams.get('meta') ?? '',
    savedRecordId: null,
  })

  const [photoError, setPhotoError] = useState<string | null>(null)
  const isLoading = isRecordLoading || isUploading

  const handleSave = useCallback(
    async (formData: { targetId: string; targetType: RecordTargetType; [key: string]: unknown }) => {
      if (!user) return
      setPhotoError(null)

      try {
        // 1. records INSERT + wishlists UPDATE (useCreateRecord hook)
        const input: CreateRecordInput = {
          userId: user.id,
          targetId: formData.targetId,
          targetType: formData.targetType,
          status: 'rated',
          axisX: formData.axisX as number | undefined,
          axisY: formData.axisY as number | undefined,
          satisfaction: formData.satisfaction as number | undefined,
          scene: formData.scene as string | undefined,
          comment: formData.comment as string | undefined,
          companions: formData.companions as string[] | undefined,
          companionCount: formData.companionCount as number | undefined,
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
        const record = await createRecord(input)

        // 2. record_photos INSERT (사진이 있으면 — 실패해도 record는 유지)
        if (photos.length > 0) {
          try {
            const uploadedPhotos = await uploadAll(user.id, record.id)
            if (uploadedPhotos.length > 0) {
              await photoRepo.savePhotos(record.id, uploadedPhotos)
            }
          } catch {
            setPhotoError('사진 업로드에 실패했습니다. 상세 페이지에서 다시 추가할 수 있습니다.')
          }
        }

        setState((prev) => ({
          ...prev,
          step: 'success',
          savedRecordId: record.id,
        }))
      } catch {
        // useCreateRecord 내부에서 error state 처리
      }
    },
    [user, createRecord, photos, uploadAll],
  )

  const handleBack = useCallback(() => router.back(), [router])
  const handleClose = useCallback(() => router.push('/'), [router])
  const handleAddMore = useCallback(() => {
    const prefix = state.targetType === 'wine' ? 'wines' : 'restaurants'
    router.push(`/${prefix}/${state.targetId}`)
  }, [router, state.targetType, state.targetId])
  const handleAddAnother = useCallback(() => {
    setState((prev) => ({ ...prev, step: 'form', savedRecordId: null }))
  }, [])

  if (state.step === 'success') {
    return (
      <RecordSuccess
        variant={state.targetType === 'wine' ? 'wine' : 'food'}
        targetName={state.targetName}
        targetMeta={state.targetMeta}
        photoError={photoError}
        onAddMore={handleAddMore}
        onAddAnother={handleAddAnother}
        onGoHome={handleClose}
      />
    )
  }

  const variant = state.targetType === 'wine' ? 'wine' : 'food'

  return (
    <div className="flex min-h-dvh flex-col">
      <RecordNav
        title="기록"
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
          onSave={(data) => handleSave({ ...data, targetType: 'restaurant' })}
          isLoading={isLoading}
        />
      ) : (
        <WineRecordForm
          target={{
            id: state.targetId,
            name: state.targetName,
            wineType: state.targetMeta.split(' · ')[0],
            region: state.targetMeta.split(' · ')[1],
          }}
          onSave={(data) => handleSave({ ...data, targetType: 'wine' })}
          isLoading={isLoading}
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
