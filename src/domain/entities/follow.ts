// src/domain/entities/follow.ts
// R1: 외부 의존 0

export type FollowStatus = 'pending' | 'accepted' | 'rejected'
export type AccessLevel = 'none' | 'follow' | 'mutual'

export interface Follow {
  followerId: string
  followingId: string
  status: FollowStatus
  createdAt: string
}
