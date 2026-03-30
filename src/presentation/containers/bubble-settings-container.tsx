'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AppHeader } from '@/presentation/components/layout/app-header'
import { FabBack } from '@/presentation/components/layout/fab-back'
import { BubbleSettings } from '@/presentation/components/bubble/bubble-settings'
import { useBubbleSettings } from '@/application/hooks/use-bubble-settings'
import { useBubbleRoles } from '@/application/hooks/use-bubble-roles'
import { useRecordsWithTarget } from '@/application/hooks/use-records'
import { useBubbleAutoSync } from '@/application/hooks/use-bubble-auto-sync'
import { useAuth } from '@/presentation/providers/auth-provider'
import type { Bubble, BubbleMemberRole, BubbleShareRule, VisibilityOverride } from '@/domain/entities/bubble'
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
  const { user } = useAuth()
  const userId = user?.id ?? null
  const { updateSettings, deleteBubble, isLoading: settingsLoading } = useBubbleSettings(bubbleId)
  const { approveJoin, rejectJoin, isLoading: rolesLoading } = useBubbleRoles(bubbleId)
  const { records } = useRecordsWithTarget(userId)
  const { syncAllRecordsToBubble } = useBubbleAutoSync(userId)

  const [pendingMembers, setPendingMembers] = useState<PendingMemberInfo[]>([])
  const [currentBubble, setCurrentBubble] = useState<Bubble>(bubble)
  const [pendingVersion, setPendingVersion] = useState(0)
  const [shareRule, setShareRule] = useState<BubbleShareRule | null>(null)
  const [visibilityOverride, setVisibilityOverride] = useState<VisibilityOverride | null>(null)
  const [memberLoaded, setMemberLoaded] = useState(false)

  // 현재 멤버의 shareRule + visibilityOverride 로드
  useEffect(() => {
    if (!userId) return
    bubbleRepo.getMember(bubbleId, userId).then((member) => {
      if (member) {
        setShareRule(member.shareRule)
        setVisibilityOverride(member.visibilityOverride)
      }
      setMemberLoaded(true)
    })
  }, [bubbleId, userId])

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

  const handleSave = async (updates: Partial<Bubble>) => {
    const updated = await updateSettings(updates)
    setCurrentBubble(updated)
  }

  const handleShareRuleChange = async (newRule: BubbleShareRule | null) => {
    setShareRule(newRule)
    syncAllRecordsToBubble(
      bubbleId,
      newRule,
      records as unknown as Array<{ id: string } & Record<string, unknown>>,
    ).catch(() => {})
  }

  const handleVisibilityChange = async (override: VisibilityOverride | null) => {
    if (!userId) return
    setVisibilityOverride(override)
    await bubbleRepo.updateMember(bubbleId, userId, { visibilityOverride: override })
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
      <AppHeader />
      <FabBack />

      <div className="flex-1 overflow-y-auto">
        <BubbleSettings
          bubble={currentBubble}
          myRole={myRole}
          onSave={handleSave}
          onDelete={handleDelete}
          isLoading={settingsLoading || rolesLoading}
          pendingMembers={pendingMembers}
          onApproveJoin={handleApprove}
          onRejectJoin={handleReject}
          shareRule={memberLoaded ? shareRule : undefined}
          onShareRuleChange={handleShareRuleChange}
          visibilityOverride={memberLoaded ? visibilityOverride : undefined}
          onVisibilityChange={handleVisibilityChange}
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
