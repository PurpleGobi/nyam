'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/presentation/providers/auth-provider'
import { useBubbleCreate } from '@/application/hooks/use-bubble-create'
import { useRecordsWithTarget } from '@/application/hooks/use-records'
import { useBubbleAutoSync } from '@/application/hooks/use-bubble-auto-sync'
import { usePhotoUpload } from '@/application/hooks/use-photo-upload'
import { useBubblePhotos } from '@/application/hooks/use-bubble-photos'
import { bubbleRepo } from '@/shared/di/container'
import { BubbleCreateForm } from '@/presentation/components/bubble/bubble-create-form'
import type { BubblePrivacySettings } from '@/presentation/components/bubble/bubble-create-form'
import { PhotoPicker } from '@/presentation/components/record/photo-picker'
import { BUBBLE_PHOTO_CONSTANTS } from '@/domain/entities/bubble-photo'
import { AppHeader } from '@/presentation/components/layout/app-header'
import { FabBack } from '@/presentation/components/layout/fab-back'

export function BubbleCreateContainer() {
  const router = useRouter()
  const { user } = useAuth()
  const { createBubble, updateMemberAfterCreate, isLoading: isCreating } = useBubbleCreate()
  const { records } = useRecordsWithTarget(user?.id ?? null)
  const { syncAllRecordsToBubble } = useBubbleAutoSync(user?.id ?? null)
  const { photos, addFiles, removePhoto, replacePhoto, reorderPhotos, uploadAll, isUploading } = usePhotoUpload()
  const { savePhotos: saveBubblePhotos } = useBubblePhotos(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (data: {
    name: string
    description: string
    visibility: 'private' | 'public'
    joinPolicy: 'invite_only' | 'closed' | 'manual_approve' | 'auto_approve' | 'open'
    icon: string
    iconBgColor: string
    minRecords: number
    minLevel: number
    maxMembers: number | null
    privacy: BubblePrivacySettings
  }) => {
    if (!user || isSubmitting) return
    setIsSubmitting(true)
    try {
      const result = await createBubble({
        name: data.name,
        description: data.description || undefined,
        visibility: data.visibility,
        joinPolicy: data.joinPolicy === 'invite_only' ? undefined : data.joinPolicy,
        icon: data.icon,
        iconBgColor: data.iconBgColor,
        minRecords: data.minRecords,
        minLevel: data.minLevel,
        maxMembers: data.maxMembers ?? undefined,
        createdBy: user.id,
      })

      // 정보공개 범위
      try {
        await updateMemberAfterCreate(result.bubble.id, user.id, {
          visibilityOverride: data.privacy.visibilityOverride,
        })
      } catch { /* 부가 설정 실패해도 진행 */ }

      // 공유 규칙 소급 적용
      try {
        await syncAllRecordsToBubble(
          result.bubble.id,
          data.privacy.shareRule,
          records as unknown as Array<{ id: string; targetId: string; targetType: 'restaurant' | 'wine' } & Record<string, unknown>>,
        )
      } catch { /* 동기화 실패해도 진행 */ }

      // 사진첩 업로드 + 대표 사진을 icon으로 설정
      if (photos.length > 0) {
        try {
          const uploaded = await uploadAll(user.id, result.bubble.id)
          await saveBubblePhotos(result.bubble.id, user.id, uploaded.map((p) => ({ url: p.url, orderIndex: p.orderIndex })))
          // 첫 번째 사진을 버블 아이콘으로 설정
          const firstUrl = uploaded.sort((a, b) => a.orderIndex - b.orderIndex)[0]?.url
          if (firstUrl) {
            await bubbleRepo.update(result.bubble.id, { icon: firstUrl, iconBgColor: '#6B7280' })
          }
        } catch { /* 사진 업로드 실패해도 진행 */ }
      }

      router.replace(`/bubbles/${result.bubble.id}`)
    } catch {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="content-detail flex min-h-dvh flex-col bg-[var(--bg)]">
      <AppHeader />
      <FabBack />
      <BubbleCreateForm
        onSubmit={handleSubmit}
        isLoading={isCreating || isSubmitting || isUploading}
        hasPhotos={photos.length > 0}
        firstPhotoPreview={photos.length > 0 ? photos[0].previewUrl : null}
        photoSlot={
          <PhotoPicker
            photos={photos}
            onAddFiles={addFiles}
            onRemovePhoto={removePhoto}
            onReplacePhoto={replacePhoto}
            onReorderPhotos={reorderPhotos}
            isUploading={isUploading}
            isMaxReached={photos.length >= BUBBLE_PHOTO_CONSTANTS.MAX_PHOTOS}
            theme="social"
          />
        }
      />
    </div>
  )
}
