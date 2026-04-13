'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { AppHeader } from '@/presentation/components/layout/app-header'
import { FabBack } from '@/presentation/components/layout/fab-back'
import { BubbleSettings } from '@/presentation/components/bubble/bubble-settings'
import { useBubbleSettings } from '@/application/hooks/use-bubble-settings'
import { useBubbleIconUpload } from '@/application/hooks/use-bubble-icon-upload'
import { useBubbleRoles } from '@/application/hooks/use-bubble-roles'
import { useRecordsWithTarget } from '@/application/hooks/use-records'
import { useBubbleAutoSync } from '@/application/hooks/use-bubble-auto-sync'
import { useBubbleInviteMember } from '@/application/hooks/use-bubble-invite-member'
import { useBubbleMember } from '@/application/hooks/use-bubble-member'
import { useAuth } from '@/presentation/providers/auth-provider'
import type { Bubble, BubbleMemberRole, BubbleShareRule, VisibilityOverride } from '@/domain/entities/bubble'
import type { PendingMemberInfo } from '@/presentation/components/bubble/pending-approval-list'

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
  const { upload: uploadIcon } = useBubbleIconUpload()
  const { approveJoin, rejectJoin, isLoading: rolesLoading } = useBubbleRoles(bubbleId)
  const { records } = useRecordsWithTarget(userId)
  const { syncAllRecordsToBubble } = useBubbleAutoSync(userId)
  const {
    searchResults: inviteSearchResults, isSearching: isInviteSearching,
    isInviting, invitedIds, searchUsers: inviteSearch, inviteUser,
  } = useBubbleInviteMember(bubbleId)
  const {
    member: currentMember,
    pendingMembers: rawPendingMembers,
    updateMember: updateCurrentMember,
    refreshPending,
    isLoading: memberLoading,
  } = useBubbleMember(bubbleId, userId)

  const [currentBubble, setCurrentBubble] = useState<Bubble>(bubble)
  const [shareRule, setShareRule] = useState<BubbleShareRule | null>(null)
  const [visibilityOverride, setVisibilityOverride] = useState<VisibilityOverride | null>(null)
  const memberLoaded = !memberLoading

  // 현재 멤버의 shareRule + visibilityOverride 반영 (렌더 중 setState 패턴)
  const [prevMember, setPrevMember] = useState(currentMember)
  if (prevMember !== currentMember && currentMember) {
    setPrevMember(currentMember)
    setShareRule(currentMember.shareRule)
    setVisibilityOverride(currentMember.visibilityOverride)
  }

  const pendingMembers: PendingMemberInfo[] = rawPendingMembers.map((m) => ({
    userId: m.userId,
    nickname: m.userId.substring(0, 8),
    avatarUrl: null,
    avatarColor: null,
    level: 1,
    recordCount: 0,
    tasteMatchPct: m.tasteMatchPct,
    joinedAt: m.joinedAt,
  }))

  const handleSave = async (updates: Partial<Bubble>) => {
    const updated = await updateSettings(updates)
    setCurrentBubble(updated)
  }

  const handleShareRuleChange = async (newRule: BubbleShareRule | null) => {
    setShareRule(newRule)
    syncAllRecordsToBubble(
      bubbleId,
      newRule,
      records as unknown as Array<{ id: string; targetId: string; targetType: 'restaurant' | 'wine' } & Record<string, unknown>>,
    ).catch(() => {})
  }

  const handleVisibilityChange = async (override: VisibilityOverride | null) => {
    if (!userId) return
    setVisibilityOverride(override)
    await updateCurrentMember({ visibilityOverride: override })
  }

  const handleDelete = async () => {
    await deleteBubble()
    router.push('/bubbles')
  }

  // 멤버 초대
  const existingMemberIds = pendingMembers.map((m) => m.userId)
  const handleInviteUser = async (targetUserId: string) => {
    if (!userId) return
    const nickname = user?.nickname ?? '사용자'
    await inviteUser(targetUserId, userId, currentBubble.name, nickname)
  }

  const handleUploadPhoto = useCallback(async (file: File): Promise<string> => {
    if (!userId) throw new Error('Not authenticated')
    return uploadIcon(file, userId)
  }, [userId, uploadIcon])

  const handleApprove = async (targetUserId: string) => {
    await approveJoin(targetUserId)
    refreshPending()
  }

  const handleReject = async (targetUserId: string) => {
    await rejectJoin(targetUserId)
    refreshPending()
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
          inviteSearchResults={inviteSearchResults}
          isInviteSearching={isInviteSearching}
          isInviting={isInviting}
          invitedIds={invitedIds}
          onInviteSearch={inviteSearch}
          onInviteUser={handleInviteUser}
          existingMemberIds={existingMemberIds}
          onUploadPhoto={handleUploadPhoto}
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
