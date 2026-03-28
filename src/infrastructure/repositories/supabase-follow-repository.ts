import { createClient } from '@/infrastructure/supabase/client'
import type { FollowRepository } from '@/domain/repositories/follow-repository'
import type { Follow, FollowStatus, AccessLevel } from '@/domain/entities/follow'

export class SupabaseFollowRepository implements FollowRepository {
  private get supabase() { return createClient() }

  async follow(followerId: string, followingId: string): Promise<Follow> {
    // privacy_profile='private' 차단
    const { data: target } = await this.supabase
      .from('users')
      .select('privacy_profile')
      .eq('id', followingId)
      .single()
    if (target?.privacy_profile === 'private') {
      throw new Error('비공개 프로필은 팔로우할 수 없습니다')
    }

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

  async getFollowStatus(followerId: string, followingId: string): Promise<Follow | null> {
    const { data } = await this.supabase
      .from('follows')
      .select('*')
      .eq('follower_id', followerId)
      .eq('following_id', followingId)
      .single()
    return data ? mapFollow(data) : null
  }

  async getFollowers(userId: string, options?: { limit?: number; offset?: number }): Promise<Follow[]> {
    let query = this.supabase.from('follows').select('*').eq('following_id', userId).eq('status', 'accepted')
    if (options?.offset) query = query.range(options.offset, options.offset + (options.limit ?? 50) - 1)
    else if (options?.limit) query = query.limit(options.limit)
    const { data } = await query
    return (data ?? []).map(mapFollow)
  }

  async getFollowing(userId: string, options?: { limit?: number; offset?: number }): Promise<Follow[]> {
    let query = this.supabase.from('follows').select('*').eq('follower_id', userId).eq('status', 'accepted')
    if (options?.offset) query = query.range(options.offset, options.offset + (options.limit ?? 50) - 1)
    else if (options?.limit) query = query.limit(options.limit)
    const { data } = await query
    return (data ?? []).map(mapFollow)
  }

  async getMutualFollows(userId: string): Promise<Follow[]> {
    // 내가 팔로우하는 사람 중 나를 팔로우하는 사람 = 맞팔
    const { data: myFollowing } = await this.supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', userId)
      .eq('status', 'accepted')
    if (!myFollowing || myFollowing.length === 0) return []
    const followingIds = myFollowing.map((f) => f.following_id as string)
    const { data: mutuals } = await this.supabase
      .from('follows')
      .select('*')
      .eq('following_id', userId)
      .eq('status', 'accepted')
      .in('follower_id', followingIds)
    return (mutuals ?? []).map(mapFollow)
  }

  async getCounts(userId: string): Promise<{ followers: number; following: number; mutual: number }> {
    const [{ count: followers }, { count: following }] = await Promise.all([
      this.supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', userId).eq('status', 'accepted'),
      this.supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', userId).eq('status', 'accepted'),
    ])
    // mutual = 양방향 모두 accepted인 수
    const mutualList = await this.getMutualFollows(userId)
    return { followers: followers ?? 0, following: following ?? 0, mutual: mutualList.length }
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
