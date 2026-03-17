import { createClient } from '@/infrastructure/supabase/client'
import type { User, UserStats } from '@/domain/entities/user'
import type { UserRepository } from '@/domain/repositories/user-repository'
import type { Database } from '@/infrastructure/supabase/types'

type UserRow = Database['public']['Tables']['users']['Row']
type UserStatsRow = Database['public']['Tables']['user_stats']['Row']

function toUser(row: UserRow): User {
  return {
    id: row.id,
    nickname: row.nickname,
    avatarUrl: row.avatar_url,
    email: row.email,
    authProvider: row.auth_provider,
    createdAt: row.created_at,
    lastActiveAt: row.last_active_at,
  }
}

function toUserStats(row: UserStatsRow): UserStats {
  return {
    userId: row.user_id,
    totalRecords: row.total_records,
    totalPhotos: row.total_photos,
    recordsThisWeek: row.records_this_week,
    recordsThisMonth: row.records_this_month,
    avgWeeklyFrequency: row.avg_weekly_frequency,
    currentStreakDays: row.current_streak_days,
    longestStreakDays: row.longest_streak_days,
    avgCompleteness: row.avg_completeness,
    nyamLevel: row.nyam_level,
    points: row.points,
    groupsCount: row.groups_count,
    sharedRecordsCount: row.shared_records_count,
    reactionsReceived: row.reactions_received,
  }
}

export class SupabaseUserRepository implements UserRepository {
  async getById(id: string): Promise<User | null> {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !data) return null
    return toUser(data as UserRow)
  }

  async getStats(userId: string): Promise<UserStats | null> {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('user_stats')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (error || !data) return null
    return toUserStats(data as UserStatsRow)
  }

  async updateProfile(
    userId: string,
    profile: Partial<Pick<User, 'nickname' | 'avatarUrl'>>,
  ): Promise<User> {
    const supabase = createClient()
    const update: Database['public']['Tables']['users']['Update'] = {}

    if (profile.nickname !== undefined) update.nickname = profile.nickname
    if (profile.avatarUrl !== undefined) update.avatar_url = profile.avatarUrl

    const { data, error } = await supabase
      .from('users')
      .update(update)
      .eq('id', userId)
      .select()
      .single()

    if (error || !data) {
      throw new Error(error?.message ?? 'Failed to update profile')
    }

    return toUser(data as UserRow)
  }
}
