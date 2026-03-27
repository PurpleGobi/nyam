// src/domain/repositories/follow-repository.ts
// R1: 외부 의존 0

import type { Follow, FollowStatus, AccessLevel } from '@/domain/entities/follow'

export interface FollowRepository {
  follow(followerId: string, followingId: string): Promise<Follow>
  unfollow(followerId: string, followingId: string): Promise<void>
  updateStatus(followerId: string, followingId: string, status: FollowStatus): Promise<void>
  getAccessLevel(userId: string, targetUserId: string): Promise<AccessLevel>
  getFollowers(userId: string): Promise<Follow[]>
  getFollowing(userId: string): Promise<Follow[]>
  getCounts(userId: string): Promise<{ followers: number; following: number }>
  isMutualFollow(userId: string, targetUserId: string): Promise<boolean>
}
