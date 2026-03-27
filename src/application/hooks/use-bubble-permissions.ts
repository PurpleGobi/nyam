'use client'

import { useMemo } from 'react'
import type { Bubble, BubbleMemberRole } from '@/domain/entities/bubble'
import { calculatePermissions, type BubblePermissions } from '@/domain/services/bubble-permission-service'

const DEFAULT_PERMISSIONS: BubblePermissions = {
  canShare: false, canComment: false, canReact: false,
  canReadFeed: false, canReadFullFeed: false,
  canManageMembers: false, canRemoveMember: false,
  canEditSettings: false, canDeleteBubble: false,
  canChangeRoles: false, canInvite: false,
}

export function useBubblePermissions(bubble: Bubble | null, myRole: BubbleMemberRole | null) {
  const permissions = useMemo(() => {
    if (!bubble || !myRole) return DEFAULT_PERMISSIONS
    return calculatePermissions(myRole, bubble)
  }, [bubble, myRole])

  return permissions
}
