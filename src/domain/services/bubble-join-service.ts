// src/domain/services/bubble-join-service.ts
// R1: 외부 의존 0

import type { Bubble } from '@/domain/entities/bubble'

export interface UserJoinProfile {
  totalRecords: number
  level: number
}

export interface JoinEligibility {
  eligible: boolean
  reason: string | null
}

export function checkJoinEligibility(bubble: Bubble, userProfile: UserJoinProfile): JoinEligibility {
  if (bubble.maxMembers !== null && bubble.memberCount >= bubble.maxMembers) {
    return { eligible: false, reason: '버블 정원이 가득 찼습니다' }
  }

  if (userProfile.totalRecords < bubble.minRecords) {
    return {
      eligible: false,
      reason: `최소 기록 ${bubble.minRecords}개가 필요합니다 (현재 ${userProfile.totalRecords}개)`,
    }
  }

  if (userProfile.level < bubble.minLevel) {
    return {
      eligible: false,
      reason: `최소 레벨 ${bubble.minLevel}이 필요합니다 (현재 레벨 ${userProfile.level})`,
    }
  }

  return { eligible: true, reason: null }
}
