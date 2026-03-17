"use client"

import useSWR from "swr"
import { createClient } from "@/infrastructure/supabase/client"
import type { User, UserStats } from "@/domain/entities/user"

export function useProfile() {
  const supabase = createClient()

  const { data, error, isLoading, mutate } = useSWR("profile", async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) return null

    const [userResult, statsResult] = await Promise.all([
      supabase.from("users").select("*").eq("id", authUser.id).single(),
      supabase.from("user_stats").select("*").eq("user_id", authUser.id).single(),
    ])

    const user: User | null = userResult.data ? {
      id: userResult.data.id,
      nickname: userResult.data.nickname,
      avatarUrl: userResult.data.avatar_url,
      email: userResult.data.email,
      authProvider: userResult.data.auth_provider,
      isDeactivated: userResult.data.is_deactivated,
      deactivatedAt: userResult.data.deactivated_at,
      createdAt: userResult.data.created_at,
      lastActiveAt: userResult.data.last_active_at,
    } : null

    const stats: UserStats | null = statsResult.data ? {
      userId: statsResult.data.user_id,
      totalRecords: statsResult.data.total_records,
      totalPhotos: statsResult.data.total_photos,
      recordsThisWeek: statsResult.data.records_this_week,
      recordsThisMonth: statsResult.data.records_this_month,
      avgWeeklyFrequency: statsResult.data.avg_weekly_frequency,
      currentStreakDays: statsResult.data.current_streak_days,
      longestStreakDays: statsResult.data.longest_streak_days,
      avgCompleteness: statsResult.data.avg_completeness,
      nyamLevel: statsResult.data.nyam_level,
      points: statsResult.data.points,
      groupsCount: statsResult.data.groups_count,
      sharedRecordsCount: statsResult.data.shared_records_count,
      reactionsReceived: statsResult.data.reactions_received,
      updatedAt: statsResult.data.updated_at,
    } : null

    return { user, stats }
  })

  return {
    user: data?.user ?? null,
    stats: data?.stats ?? null,
    isLoading,
    error: error ? String(error) : null,
    mutate,
  }
}
