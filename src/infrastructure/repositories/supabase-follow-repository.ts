import { createClient } from '@/infrastructure/supabase/client'
import type { FollowRepository } from '@/domain/repositories/follow-repository'
import type { Follow, FollowStatus, AccessLevel } from '@/domain/entities/follow'

export class SupabaseFollowRepository implements FollowRepository {
  private get supabase() { return createClient() }

  async follow(followerId: string, followingId: string): Promise<Follow> {
    const { data, error } = await this.supabase
      .from('follows')
      .upsert(
        { follower_id: followerId, following_id: followingId, status: 'accepted' as FollowStatus },
        { onConflict: 'follower_id,following_id' },
      )
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
    if (userId === targetUserId) return 'following'
    const { data } = await this.supabase
      .from('follows')
      .select('status')
      .eq('follower_id', userId)
      .eq('following_id', targetUserId)
      .single()
    return data ? 'following' : 'none'
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
    const [{ data: myFollowing }, { data: theirFollowing }] = await Promise.all([
      this.supabase.from('follows').select('following_id').eq('follower_id', userId).eq('status', 'accepted'),
      this.supabase.from('follows').select('follower_id').eq('following_id', userId).eq('status', 'accepted'),
    ])
    if (!myFollowing || myFollowing.length === 0) return []
    if (!theirFollowing || theirFollowing.length === 0) return []

    const myFollowingSet = new Set(myFollowing.map((f) => f.following_id as string))
    const mutualIds = (theirFollowing ?? []).map((f) => f.follower_id as string).filter((id) => myFollowingSet.has(id))
    if (mutualIds.length === 0) return []

    const { data: mutuals } = await this.supabase
      .from('follows').select('*').eq('follower_id', userId).eq('status', 'accepted').in('following_id', mutualIds)
    return (mutuals ?? []).map(mapFollow)
  }

  async getCounts(userId: string): Promise<{ followers: number; following: number; mutual: number }> {
    const { data } = await this.supabase
      .rpc('follow_counts', { p_user_id: userId })
      .single() as { data: { followers: number; following: number; mutual: number } | null }
    return {
      followers: Number(data?.followers ?? 0),
      following: Number(data?.following ?? 0),
      mutual: Number(data?.mutual ?? 0),
    }
  }

  async getFollowingProfiles(userId: string): Promise<Array<{ id: string; nickname: string; avatarUrl: string | null }>> {
    const { data: followRows } = await this.supabase
      .from('follows').select('following_id').eq('follower_id', userId).eq('status', 'accepted')
    if (!followRows || followRows.length === 0) return []

    const followingIds = followRows.map((f) => f.following_id as string)
    const { data: users } = await this.supabase.from('users').select('id, nickname, avatar_url').in('id', followingIds)
    return (users ?? []).map((u) => ({
      id: u.id as string,
      nickname: (u.nickname as string) ?? '',
      avatarUrl: (u.avatar_url as string) ?? null,
    }))
  }

  async isMutualFollow(userId: string, targetUserId: string): Promise<boolean> {
    const { data } = await this.supabase.rpc('is_mutual_follow', { p_user_id: userId, p_target_id: targetUserId })
    return data === true
  }

  subscribeToChanges(userId: string, onChange: () => void): { unsubscribe: () => void } {
    const channel = this.supabase
      .channel(`follows:${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'follows', filter: `following_id=eq.${userId}` }, () => onChange())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'follows', filter: `follower_id=eq.${userId}` }, () => onChange())
      .subscribe()
    return { unsubscribe: () => { this.supabase.removeChannel(channel) } }
  }
}

function mapFollow(r: Record<string, unknown>): Follow {
  return { followerId: r.follower_id as string, followingId: r.following_id as string, status: r.status as Follow['status'], createdAt: r.created_at as string }
}
