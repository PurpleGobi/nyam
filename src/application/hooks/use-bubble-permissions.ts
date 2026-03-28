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

export interface UseBubblePermissionsReturn {
  permissions: BubblePermissions
  myRole: BubbleMemberRole | null
  isOwner: boolean
  isAdmin: boolean
  isMember: boolean
  isFollower: boolean
}

export function useBubblePermissions(
  bubble: Bubble | null,
  myRole: BubbleMemberRole | null,
): UseBubblePermissionsReturn {
  return useMemo(() => {
    if (!bubble) {
      return {
        permissions: DEFAULT_PERMISSIONS,
        myRole,
        isOwner: false,
        isAdmin: false,
        isMember: false,
        isFollower: false,
      }
    }

    return {
      permissions: calculatePermissions(myRole, bubble),
      myRole,
      isOwner: myRole === 'owner',
      isAdmin: myRole === 'admin',
      isMember: myRole === 'member',
      isFollower: myRole === 'follower',
    }
  }, [bubble, myRole])
}
