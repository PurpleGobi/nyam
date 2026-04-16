'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { AppHeader } from '@/presentation/components/layout/app-header'
import { FabBack } from '@/presentation/components/layout/fab-back'
import { BubbleSettings } from '@/presentation/components/bubble/bubble-settings'
import { useBubbleSettings } from '@/application/hooks/use-bubble-settings'
import { useBubbleIconUpload } from '@/application/hooks/use-bubble-icon-upload'
import { usePhotoUpload } from '@/application/hooks/use-photo-upload'
import { useBubblePhotos } from '@/application/hooks/use-bubble-photos'
import { PhotoPicker } from '@/presentation/components/record/photo-picker'
import { BUBBLE_PHOTO_CONSTANTS } from '@/domain/entities/bubble-photo'
import { useBubbleRoles } from '@/application/hooks/use-bubble-roles'
import { useBubbleMembers } from '@/application/hooks/use-bubble-members'
import { useRecordsWithTarget } from '@/application/hooks/use-records'
import { useBubbleAutoSync } from '@/application/hooks/use-bubble-auto-sync'
import { useBubbleInviteMember } from '@/application/hooks/use-bubble-invite-member'
import { useBubbleMember } from '@/application/hooks/use-bubble-member'
import { useAuth } from '@/presentation/providers/auth-provider'
import { useToast } from '@/presentation/components/ui/toast'
import { MiniProfilePopup } from '@/presentation/components/profile/mini-profile-popup'
import type { Bubble, BubbleMemberRole, BubbleShareRule, VisibilityOverride } from '@/domain/entities/bubble'
import type { PendingMemberInfo } from '@/presentation/components/bubble/pending-approval-list'
import type { EnrichedBubbleMember } from '@/application/hooks/use-bubble-members'

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
  const { photos: bubblePhotos, savePhotos: saveBubblePhotos, deletePhoto: deleteBubblePhoto } = useBubblePhotos(bubbleId)
  const { photos: pendingPhotos, addFiles, removePhoto: removePendingPhoto, initExistingPhotos, replacePhoto, reorderPhotos, uploadAll, isUploading } = usePhotoUpload()
  const [photosInitialized, setPhotosInitialized] = useState(false)
  const { approveJoin, rejectJoin, changeRole, removeMember, isLoading: rolesLoading } = useBubbleRoles(bubbleId)
  const { members: activeMembers, refetch: refetchMembers, updateMemberLocal, removeMemberLocal, isLoading: membersLoading } = useBubbleMembers(bubbleId)
  const { records } = useRecordsWithTarget(userId)
  const { syncAllRecordsToBubble } = useBubbleAutoSync(userId)
  const { showToast } = useToast()
  const {
    searchResults: inviteSearchResults, isSearching: isInviteSearching,
    isInviting, invitedIds, searchUsers: inviteSearch, inviteUser, cancelInvite,
  } = useBubbleInviteMember(bubbleId)
  const {
    member: currentMember,
    pendingMembers: rawPendingMembers,
    pendingInvites,
    updateMember: updateCurrentMember,
    refreshPending,
    isLoading: memberLoading,
  } = useBubbleMember(bubbleId, userId)

  // 기존 버블 사진을 PendingPhoto 상태로 초기화
  if (!photosInitialized && bubblePhotos.length > 0) {
    setPhotosInitialized(true)
    initExistingPhotos(bubblePhotos.map((p) => ({ id: p.id, url: p.url, orderIndex: p.orderIndex, isPublic: true })))
  }

  const [miniProfileUserId, setMiniProfileUserId] = useState<string | null>(null)
  const [currentBubble] = useState<Bubble>(bubble)
  const [allowComments, setAllowComments] = useState(bubble.allowComments ?? true)
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
    nickname: m.nickname,
    handle: m.handle,
    avatarUrl: m.avatarUrl,
    avatarColor: m.avatarColor,
    level: 1,
    recordCount: 0,
    tasteMatchPct: m.tasteMatchPct,
    joinedAt: m.joinedAt,
  }))

  const handleRemovePhoto = useCallback(async (photoId: string) => {
    const existing = bubblePhotos.find((p) => p.id === photoId)
    if (existing) {
      await deleteBubblePhoto(photoId, existing.url)
    }
    await removePendingPhoto(photoId)
  }, [bubblePhotos, deleteBubblePhoto, removePendingPhoto])

  /** 개별 필드 즉시 저장 (네비게이션 없음) */
  const handleAutoSave = useCallback(async (updates: Partial<Bubble>) => {
    await updateSettings(updates)
  }, [updateSettings])

  const handleToggleAllowComments = useCallback(() => {
    const next = !allowComments
    setAllowComments(next)
    handleAutoSave({ allowComments: next })
  }, [allowComments, handleAutoSave])

  /** 사진 업로드 + 갤러리 저장 (아이콘과 별도) */
  const handleSavePhotos = useCallback(async () => {
    if (!userId || !pendingPhotos.some((p) => p.status === 'pending')) return
    try {
      const uploaded = await uploadAll(userId, bubbleId)
      const newPhotos = uploaded.filter((p) => !bubblePhotos.some((bp) => bp.url === p.url))
      if (newPhotos.length > 0) {
        await saveBubblePhotos(bubbleId, userId, newPhotos.map((p) => ({ url: p.url, orderIndex: p.orderIndex })))
      }
      const firstPhoto = pendingPhotos.find((p) => p.status === 'uploaded' && p.orderIndex === 0)
      if (firstPhoto?.uploadedUrl) {
        await updateSettings({ icon: firstPhoto.uploadedUrl, iconBgColor: '#6B7280' })
      }
    } catch { /* 사진 업로드 실패 무시 */ }
  }, [userId, bubbleId, pendingPhotos, bubblePhotos, uploadAll, saveBubblePhotos, updateSettings])

  // 사진 추가 시 자동 업로드+저장
  const savePhotosRef = useRef(handleSavePhotos)
  useEffect(() => {
    savePhotosRef.current = handleSavePhotos
  }, [handleSavePhotos])
  useEffect(() => {
    if (!pendingPhotos.some((p) => p.status === 'pending')) return
    savePhotosRef.current()
  }, [pendingPhotos])

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
    router.push('/?tab=bubble')
  }

  // 멤버 초대 — 중복 체크 + 초대 후 대기 목록 즉시 새로고침
  const existingMemberIds = pendingMembers.map((m) => m.userId)
  const handleInviteUser = async (targetUserId: string) => {
    if (!userId) return
    const nickname = user?.nickname ?? '사용자'
    const result = await inviteUser(targetUserId, userId, currentBubble.name, nickname, pendingInvites)
    if (result.duplicate) {
      showToast('이미 초대한 사용자입니다', 3000)
      return
    }
    refreshPending()
  }

  // 초대 취소
  const handleCancelInvite = async (notificationId: string) => {
    await cancelInvite(notificationId)
    refreshPending()
  }

  const handleUploadPhoto = useCallback(async (file: File): Promise<string> => {
    if (!userId) throw new Error('Not authenticated')
    return uploadIcon(file, userId)
  }, [userId, uploadIcon])

  const handleApprove = async (targetUserId: string) => {
    await approveJoin(targetUserId)
    refreshPending()
    refetchMembers()
  }

  const handleReject = async (targetUserId: string) => {
    await rejectJoin(targetUserId)
    refreshPending()
  }

  const handleChangeRole = async (targetUserId: string, newRole: BubbleMemberRole) => {
    updateMemberLocal(targetUserId, { role: newRole })
    await changeRole(targetUserId, newRole)
  }

  const handleRemoveMember = async (targetUserId: string) => {
    removeMemberLocal(targetUserId)
    await removeMember(targetUserId)
    showToast('멤버가 추방되었습니다', 3000)
  }

  return (
    <div className="content-detail flex min-h-dvh flex-col bg-[var(--bg)]">
      <AppHeader />
      <FabBack />

      <div className="flex-1 overflow-y-auto">
        <BubbleSettings
          bubble={currentBubble}
          myRole={myRole}
          onAutoSave={handleAutoSave}
          onSavePhotos={handleSavePhotos}
          onDelete={handleDelete}
          isLoading={settingsLoading || rolesLoading}
          activeMembers={activeMembers}
          isMembersLoading={membersLoading}
          onChangeRole={handleChangeRole}
          onRemoveMember={handleRemoveMember}
          pendingMembers={pendingMembers}
          pendingInvites={pendingInvites}
          onCancelInvite={handleCancelInvite}
          onApproveJoin={handleApprove}
          onRejectJoin={handleReject}
          onMemberClick={setMiniProfileUserId}
          inviteSearchResults={inviteSearchResults}
          isInviteSearching={isInviteSearching}
          isInviting={isInviting}
          invitedIds={invitedIds}
          onInviteSearch={inviteSearch}
          onInviteUser={handleInviteUser}
          existingMemberIds={existingMemberIds}
          onUploadPhoto={handleUploadPhoto}
          hasPhotos={pendingPhotos.length > 0}
          photoSlot={
            <PhotoPicker
              photos={pendingPhotos}
              onAddFiles={addFiles}
              onRemovePhoto={handleRemovePhoto}
              onReplacePhoto={replacePhoto}
              onReorderPhotos={reorderPhotos}
              isUploading={isUploading}
              isMaxReached={pendingPhotos.length >= BUBBLE_PHOTO_CONSTANTS.MAX_PHOTOS}
              theme="social"
            />
          }
          allowComments={allowComments}
          onToggleAllowComments={handleToggleAllowComments}
          shareRule={memberLoaded ? shareRule : undefined}
          onShareRuleChange={handleShareRuleChange}
          visibilityOverride={memberLoaded ? visibilityOverride : undefined}
          onVisibilityChange={handleVisibilityChange}
        />
      </div>

      {miniProfileUserId && (
        <MiniProfilePopup
          isOpen={true}
          onClose={() => setMiniProfileUserId(null)}
          targetUserId={miniProfileUserId}
        />
      )}
    </div>
  )
}
