// src/domain/services/follow-access.ts
// R1: 외부 의존 0

import type { AccessLevel } from '@/domain/entities/follow'

/** 내가 상대를 팔로우하고 있는지 여부로 접근 레벨 판정 */
export function getAccessLevel(iFollowThem: boolean): AccessLevel {
  return iFollowThem ? 'following' : 'none'
}
