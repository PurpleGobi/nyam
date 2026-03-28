// src/domain/services/bubble-permission-service.ts
// R1: 외부 의존 0

import type { BubbleMemberRole, Bubble } from '@/domain/entities/bubble'

/** 권한 플래그 객체 */
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

/**
 * 역할 + 버블 설정 기반 권한 계산 (순수 함수)
 * role = null → 비멤버
 */
export function calculatePermissions(
  role: BubbleMemberRole | null,
  bubble: Pick<Bubble, 'allowComments' | 'contentVisibility' | 'joinPolicy'>,
): BubblePermissions {
  // 비멤버
  if (role === null) {
    return {
      canShare: false,
      canComment: false,
      canReact: false,
      canReadFeed: bubble.joinPolicy !== 'invite_only',
      canReadFullFeed: false,
      canManageMembers: false,
      canRemoveMember: false,
      canEditSettings: false,
      canDeleteBubble: false,
      canChangeRoles: false,
      canInvite: false,
    }
  }

  if (role === 'follower') {
    return {
      canShare: false,
      canComment: false,
      canReact: false,
      canReadFeed: true,
      canReadFullFeed: false,
      canManageMembers: false,
      canRemoveMember: false,
      canEditSettings: false,
      canDeleteBubble: false,
      canChangeRoles: false,
      canInvite: false,
    }
  }

  if (role === 'member') {
    return {
      canShare: true,
      canComment: bubble.allowComments,
      canReact: true,
      canReadFeed: true,
      canReadFullFeed: true,
      canManageMembers: false,
      canRemoveMember: false,
      canEditSettings: false,
      canDeleteBubble: false,
      canChangeRoles: false,
      canInvite: false,
    }
  }

  if (role === 'admin') {
    return {
      canShare: true,
      canComment: true,
      canReact: true,
      canReadFeed: true,
      canReadFullFeed: true,
      canManageMembers: true,
      canRemoveMember: false,
      canEditSettings: false,
      canDeleteBubble: false,
      canChangeRoles: false,
      canInvite: true,
    }
  }

  // owner
  return {
    canShare: true,
    canComment: true,
    canReact: true,
    canReadFeed: true,
    canReadFullFeed: true,
    canManageMembers: true,
    canRemoveMember: true,
    canEditSettings: true,
    canDeleteBubble: true,
    canChangeRoles: true,
    canInvite: true,
  }
}

/**
 * 역할 우선순위 (높을수록 높은 권한)
 */
export function getRolePriority(role: BubbleMemberRole): number {
  const priorities: Record<BubbleMemberRole, number> = {
    follower: 0,
    member: 1,
    admin: 2,
    owner: 3,
  }
  return priorities[role]
}

/**
 * 역할 변경 가능 여부 (순수 함수)
 * - owner만 역할 변경 가능
 * - 자기 자신의 역할은 변경 불가 (owner 이전은 별도 로직)
 * - owner 역할로의 변경 불가 (transferOwnership 사용)
 */
export function canChangeRole(
  actorRole: BubbleMemberRole,
  targetCurrentRole: BubbleMemberRole,
  targetNewRole: BubbleMemberRole,
  isSelf: boolean,
): boolean {
  if (actorRole !== 'owner') return false
  if (isSelf) return false
  if (targetCurrentRole === 'owner') return false
  if (targetNewRole === 'owner') return false
  return true
}
