'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/presentation/providers/auth-provider'
import { useBubbleCreate } from '@/application/hooks/use-bubble-create'
import { useRecordsWithTarget } from '@/application/hooks/use-records'
import { useBubbleAutoSync } from '@/application/hooks/use-bubble-auto-sync'
import { useBubbleIconUpload } from '@/application/hooks/use-bubble-icon-upload'
import { BubbleCreateForm } from '@/presentation/components/bubble/bubble-create-form'
import type { BubblePrivacySettings } from '@/presentation/components/bubble/bubble-create-form'
import { AppHeader } from '@/presentation/components/layout/app-header'
import { FabBack } from '@/presentation/components/layout/fab-back'

export function BubbleCreateContainer() {
  const router = useRouter()
  const { user } = useAuth()
  const { createBubble, updateMemberAfterCreate, isLoading: isCreating } = useBubbleCreate()
  const { records } = useRecordsWithTarget(user?.id ?? null)
  const { syncAllRecordsToBubble } = useBubbleAutoSync(user?.id ?? null)
  const { upload: uploadIcon } = useBubbleIconUpload()
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

      // 정보공개 범위 → bubble_members.visibility_override (이 버블 개별)
      try {
        await updateMemberAfterCreate(result.bubble.id, user.id, {
          visibilityOverride: data.privacy.visibilityOverride,
        })
      } catch { /* 부가 설정 실패해도 진행 */ }

      // 공유 규칙 저장 + 소급 적용 (실패해도 라우팅)
      try {
        await syncAllRecordsToBubble(
          result.bubble.id,
          data.privacy.shareRule,
          records as unknown as Array<{ id: string; targetId: string; targetType: 'restaurant' | 'wine' } & Record<string, unknown>>,
        )
      } catch { /* 동기화 실패해도 진행 */ }

      router.replace(`/bubbles/${result.bubble.id}`)
    } catch {
      setIsSubmitting(false)
    }
  }

  const handleUploadPhoto = useCallback(async (file: File): Promise<string> => {
    if (!user) throw new Error('Not authenticated')
    return uploadIcon(file, user.id)
  }, [user, uploadIcon])

  return (
    <div className="content-detail flex min-h-dvh flex-col bg-[var(--bg)]">
      <AppHeader />
      <FabBack />
      <BubbleCreateForm onSubmit={handleSubmit} onUploadPhoto={handleUploadPhoto} isLoading={isCreating || isSubmitting} />
    </div>
  )
}
