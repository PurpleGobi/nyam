import { createClient } from '@/infrastructure/supabase/client'
import type { FollowRepository } from '@/domain/repositories/follow-repository'
import type { Follow, FollowStatus, AccessLevel } from '@/domain/entities/follow'

export class SupabaseFollowRepository implements FollowRepository {
  private get supabase() { return createClient() }

  async follow(followerId: string, followingId: string): Promise<Follow> {
    const { data, error } = await this.supabase
      .from('follows')
      .insert({ follower_id: followerId, following_id: followingId, status: 'accepted' })
      .select()
      .single()
    if (error) throw new Error(`팔로우 실패: ${error.message}`)
    return { followerId: data.follower_id, followingId: data.following_id, status: data.status, createdAt: data.created_at }
  }

  async unfollow(followerId: string, followingId: string): Promise<void> {
    await this.supabase.from('follows').delete().eq('follower_id', followerId).eq('following_id', followingId)
  }

  async updateStatus(followerId: string, followingId: string, status: FollowStatus): Promise<void> {
    await this.supabase.from('follows').update({ status }).eq('follower_id', followerId).eq('following_id', followingId)
  }

  async getAccessLevel(userId: string, targetUserId: string): Promise<AccessLevel> {
    if (userId === targetUserId) return 'mutual'
    const isMutual = await this.isMutualFollow(userId, targetUserId)
    if (isMutual) return 'mutual'
    const { data } = await this.supabase
      .from('follows')
      .select('status')
      .eq('follower_id', userId)
      .eq('following_id', targetUserId)
      .eq('status', 'accepted')
      .single()
    return data ? 'follow' : 'none'
  }

  async getFollowers(userId: string): Promise<Follow[]> {
    const { data } = await this.supabase.from('follows').select('*').eq('following_id', userId).eq('status', 'accepted')
    return (data ?? []).map(mapFollow)
  }

  async getFollowing(userId: string): Promise<Follow[]> {
    const { data } = await this.supabase.from('follows').select('*').eq('follower_id', userId).eq('status', 'accepted')
    return (data ?? []).map(mapFollow)
  }

  async getCounts(userId: string): Promise<{ followers: number; following: number }> {
    const [{ count: followers }, { count: following }] = await Promise.all([
      this.supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', userId).eq('status', 'accepted'),
      this.supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', userId).eq('status', 'accepted'),
    ])
    return { followers: followers ?? 0, following: following ?? 0 }
  }

  async isMutualFollow(userId: string, targetUserId: string): Promise<boolean> {
    const [{ data: a }, { data: b }] = await Promise.all([
      this.supabase.from('follows').select('status').eq('follower_id', userId).eq('following_id', targetUserId).eq('status', 'accepted').single(),
      this.supabase.from('follows').select('status').eq('follower_id', targetUserId).eq('following_id', userId).eq('status', 'accepted').single(),
    ])
    return !!a && !!b
  }
}

function mapFollow(r: Record<string, unknown>): Follow {
  return { followerId: r.follower_id as string, followingId: r.following_id as string, status: r.status as Follow['status'], createdAt: r.created_at as string }
}
