// src/domain/services/bubble-permission-service.ts
// R1: 외부 의존 0

import type { BubbleMemberRole, Bubble } from '@/domain/entities/bubble'

export interface BubblePermissions {
  canShare: boolean
  canComment: boolean
  canReact: boolean
  canReadFeed: boolean
  canReadFullFeed: boolean
  canManageMembers: boolean
  canRemoveMember: boolean
  canEditSettings: boolean
  canDeleteBubble: boolean
  canChangeRoles: boolean
  canInvite: boolean
}

export function calculatePermissions(role: BubbleMemberRole, bubble: Bubble): BubblePermissions {
  const base: BubblePermissions = {
    canShare: false, canComment: false, canReact: false,
    canReadFeed: false, canReadFullFeed: false,
    canManageMembers: false, canRemoveMember: false,
    canEditSettings: false, canDeleteBubble: false,
    canChangeRoles: false, canInvite: false,
  }

  switch (role) {
    case 'owner':
      return {
        canShare: true, canComment: bubble.allowComments, canReact: true,
        canReadFeed: true, canReadFullFeed: true,
        canManageMembers: true, canRemoveMember: true,
        canEditSettings: true, canDeleteBubble: true,
        canChangeRoles: true, canInvite: true,
      }
    case 'admin':
      return {
        ...base, canShare: true, canComment: bubble.allowComments, canReact: true,
        canReadFeed: true, canReadFullFeed: true,
        canManageMembers: true, canInvite: true,
      }
    case 'member':
      return {
        ...base, canShare: true, canComment: bubble.allowComments, canReact: true,
        canReadFeed: true, canReadFullFeed: true,
      }
    case 'follower':
      return {
        ...base, canReadFeed: true,
        canReadFullFeed: bubble.contentVisibility === 'rating_and_comment',
      }
    default:
      return base
  }
}
