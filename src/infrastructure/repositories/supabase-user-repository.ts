import { createClient } from "@/infrastructure/supabase/client"
import type { User, UserStats } from "@/domain/entities/user"
import type { UserRepository } from "@/domain/repositories/user-repository"

export class SupabaseUserRepository implements UserRepository {
  private supabase = createClient()

  async getCurrentUser(): Promise<User | null> {
    const { data: { user: authUser } } = await this.supabase.auth.getUser()
    if (!authUser) return null
    return this.getUserById(authUser.id)
  }

  async getUserById(id: string): Promise<User | null> {
    const { data, error } = await this.supabase
      .from("users")
      .select("*")
      .eq("id", id)
      .single()

    if (error || !data) return null

    return {
      id: data.id,
      nickname: data.nickname,
      avatarUrl: data.avatar_url,
      email: data.email,
      authProvider: data.auth_provider,
      isDeactivated: data.is_deactivated,
      deactivatedAt: data.deactivated_at,
      createdAt: data.created_at,
      lastActiveAt: data.last_active_at,
    }
  }

  async getUserStats(userId: string): Promise<UserStats | null> {
    const { data, error } = await this.supabase
      .from("user_stats")
      .select("*")
      .eq("user_id", userId)
      .single()

    if (error || !data) return null

    return {
      userId: data.user_id,
      totalRecords: data.total_records,
      totalPhotos: data.total_photos,
      recordsThisWeek: data.records_this_week,
      recordsThisMonth: data.records_this_month,
      avgWeeklyFrequency: data.avg_weekly_frequency,
      currentStreakDays: data.current_streak_days,
      longestStreakDays: data.longest_streak_days,
      avgCompleteness: data.avg_completeness,
      nyamLevel: data.nyam_level,
      points: data.points,
      groupsCount: data.groups_count,
      sharedRecordsCount: data.shared_records_count,
      reactionsReceived: data.reactions_received,
      updatedAt: data.updated_at,
    }
  }

  async updateNickname(userId: string, nickname: string): Promise<void> {
    const { error } = await this.supabase
      .from("users")
      .update({ nickname })
      .eq("id", userId)

    if (error) throw new Error(`Failed to update nickname: ${error.message}`)
  }

  async updateAvatar(userId: string, avatarUrl: string): Promise<void> {
    const { error } = await this.supabase
      .from("users")
      .update({ avatar_url: avatarUrl })
      .eq("id", userId)

    if (error) throw new Error(`Failed to update avatar: ${error.message}`)
  }
}
