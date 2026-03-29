'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AppHeader } from '@/presentation/components/layout/app-header'
import { FabBack } from '@/presentation/components/layout/fab-back'
import { BubbleSettings } from '@/presentation/components/bubble/bubble-settings'
import { useBubbleSettings } from '@/application/hooks/use-bubble-settings'
import { useBubbleRoles } from '@/application/hooks/use-bubble-roles'
import { useBubblePermissions } from '@/application/hooks/use-bubble-permissions'
import type { Bubble, BubbleMemberRole } from '@/domain/entities/bubble'
import type { PendingMemberInfo } from '@/presentation/components/bubble/pending-approval-list'
import { bubbleRepo } from '@/shared/di/container'

interface BubbleSettingsContainerProps {
  bubbleId: string
  bubble: Bubble
  myRole: BubbleMemberRole | null
  onClose: () => void
}

export function BubbleSettingsContainer({ bubbleId, bubble, myRole, onClose }: BubbleSettingsContainerProps) {
  const router = useRouter()
  const { permissions } = useBubblePermissions(bubble, myRole)
  const { updateSettings, deleteBubble, isLoading: settingsLoading } = useBubbleSettings(bubbleId)
  const { approveJoin, rejectJoin, isLoading: rolesLoading } = useBubbleRoles(bubbleId)

  const [pendingMembers, setPendingMembers] = useState<PendingMemberInfo[]>([])
  const [currentBubble, setCurrentBubble] = useState<Bubble>(bubble)
  const [pendingVersion, setPendingVersion] = useState(0)

  useEffect(() => {
    let cancelled = false
    bubbleRepo.getPendingMembers(bubbleId).then((pending) => {
      if (cancelled) return
      setPendingMembers(pending.map((m) => ({
        userId: m.userId,
        nickname: m.userId.substring(0, 8),
        avatarUrl: null,
        avatarColor: null,
        level: 1,
        recordCount: 0,
        tasteMatchPct: m.tasteMatchPct,
        joinedAt: m.joinedAt,
      })))
    })
    return () => { cancelled = true }
  }, [bubbleId, pendingVersion])

  // 권한 없으면 접근 차단
  if (!permissions.canEditSettings) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-[var(--bg)]">
        <p className="text-[14px] text-[var(--text-sub)]">설정 권한이 없습니다</p>
        <button type="button" onClick={onClose} className="text-[13px] font-semibold" style={{ color: 'var(--accent-social)' }}>
          돌아가기
        </button>
      </div>
    )
  }

  const handleSave = async (updates: Partial<Bubble>) => {
    const updated = await updateSettings(updates)
    setCurrentBubble(updated)
  }

  const handleDelete = async () => {
    await deleteBubble()
    router.push('/bubbles')
  }

  const handleApprove = async (userId: string) => {
    await approveJoin(userId)
    setPendingVersion((v) => v + 1)
  }

  const handleReject = async (userId: string) => {
    await rejectJoin(userId)
    setPendingVersion((v) => v + 1)
  }

  return (
    <div className="content-detail flex min-h-dvh flex-col bg-[var(--bg)]">
      {/* 헤더 */}
      <AppHeader />
      <FabBack />

      <div className="flex-1 overflow-y-auto">
        <BubbleSettings
          bubble={currentBubble}
          onSave={handleSave}
          onDelete={handleDelete}
          isLoading={settingsLoading || rolesLoading}
          pendingMembers={pendingMembers}
          onApproveJoin={handleApprove}
          onRejectJoin={handleReject}
          stats={{
            weeklyRecordCount: 0,
            prevWeeklyRecordCount: 0,
            weeklyChartData: [0, 0, 0, 0, 0, 0, 0],
          }}
        />
      </div>
    </div>
  )
}
