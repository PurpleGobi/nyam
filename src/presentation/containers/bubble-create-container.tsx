'use client'

import { useRouter } from 'next/navigation'
import { useAuth } from '@/presentation/providers/auth-provider'
import { useBubbleCreate } from '@/application/hooks/use-bubble-create'
import { BubbleCreateForm } from '@/presentation/components/bubble/bubble-create-form'
import { AppHeader } from '@/presentation/components/layout/app-header'

export function BubbleCreateContainer() {
  const router = useRouter()
  const { user } = useAuth()
  const { createBubble, isLoading } = useBubbleCreate()

  const handleSubmit = async (data: {
    name: string
    description: string
    visibility: 'private' | 'public'
    joinPolicy: 'invite_only' | 'closed' | 'manual_approve' | 'auto_approve' | 'open'
    icon: string
    iconBgColor: string
    inviteExpiry: '1d' | '7d' | '30d' | 'unlimited'
  }) => {
    if (!user) return
    try {
      const result = await createBubble({
        name: data.name,
        description: data.description || undefined,
        visibility: data.visibility,
        joinPolicy: data.joinPolicy === 'invite_only' ? undefined : data.joinPolicy,
        icon: data.icon,
        iconBgColor: data.iconBgColor,
        inviteExpiry: data.inviteExpiry,
        createdBy: user.id,
      })
      router.push(`/bubbles/${result.bubble.id}`)
    } catch {
      // 에러 처리는 상위에서
    }
  }

  return (
    <div className="content-detail flex min-h-dvh flex-col bg-[var(--bg)]">
      <AppHeader variant="inner" title="버블 만들기" backHref="/bubbles" />
      <BubbleCreateForm onSubmit={handleSubmit} isLoading={isLoading} />
    </div>
  )
}
