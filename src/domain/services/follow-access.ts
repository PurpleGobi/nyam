// src/domain/services/follow-access.ts
// R1: 외부 의존 0

import type { AccessLevel } from '@/domain/entities/follow'

/**
 * 팔로우 관계로부터 접근 레벨 판정
 * - 양방향 팔로우 → 'mutual'
 * - 단방향 팔로우 → 'follow'
 * - 관계 없음 → 'none'
 */
export function getAccessLevel(
  iFollowThem: boolean,
  theyFollowMe: boolean,
): AccessLevel {
  if (iFollowThem && theyFollowMe) return 'mutual'
  if (iFollowThem) return 'follow'
  return 'none'
}
