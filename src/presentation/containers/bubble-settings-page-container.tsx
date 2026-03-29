'use client'

import { useRouter } from 'next/navigation'
import { useAuth } from '@/presentation/providers/auth-provider'
import { useBubbleDetail } from '@/application/hooks/use-bubble-detail'
import { BubbleSettingsContainer } from '@/presentation/containers/bubble-settings-container'

interface Props {
  bubbleId: string
}

export function BubbleSettingsPageContainer({ bubbleId }: Props) {
  const router = useRouter()
  const { user } = useAuth()
  const { bubble, myRole, isLoading } = useBubbleDetail(bubbleId, user?.id ?? null)

  if (isLoading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[var(--bg)]">
        <div className="h-6 w-6 animate-spin rounded-full border-[3px] border-[var(--accent-social)] border-t-transparent" />
      </div>
    )
  }

  if (!bubble) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-[var(--bg)]">
        <p className="text-[14px] text-[var(--text-sub)]">버블을 찾을 수 없습니다</p>
        <button type="button" onClick={() => router.push('/bubbles')} className="text-[13px] font-semibold" style={{ color: 'var(--accent-social)' }}>
          버블 목록으로
        </button>
      </div>
    )
  }

  return (
    <BubbleSettingsContainer
      bubbleId={bubbleId}
      bubble={bubble}
      myRole={myRole}
      onClose={() => router.back()}
    />
  )
}
