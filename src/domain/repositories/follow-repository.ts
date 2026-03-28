// src/domain/repositories/follow-repository.ts
// R1: 외부 의존 0

import type { Follow, FollowStatus, AccessLevel } from '@/domain/entities/follow'

export interface FollowRepository {
  follow(followerId: string, followingId: string): Promise<Follow>
  unfollow(followerId: string, followingId: string): Promise<void>
  updateStatus(followerId: string, followingId: string, status: FollowStatus): Promise<void>
  /** A→B 팔로우 관계 조회 (null이면 관계 없음) */
  getFollowStatus(followerId: string, followingId: string): Promise<Follow | null>
  getAccessLevel(userId: string, targetUserId: string): Promise<AccessLevel>
  getFollowers(userId: string, options?: { limit?: number; offset?: number }): Promise<Follow[]>
  getFollowing(userId: string, options?: { limit?: number; offset?: number }): Promise<Follow[]>
  /** 맞팔 목록 (양쪽 모두 accepted) */
  getMutualFollows(userId: string): Promise<Follow[]>
  getCounts(userId: string): Promise<{ followers: number; following: number; mutual: number }>
  isMutualFollow(userId: string, targetUserId: string): Promise<boolean>
}
