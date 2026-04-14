// src/domain/entities/follow.ts
// R1: 외부 의존 0

export type FollowStatus = 'accepted'
export type AccessLevel = 'none' | 'following'

export interface Follow {
  followerId: string
  followingId: string
  status: FollowStatus
  createdAt: string
}
