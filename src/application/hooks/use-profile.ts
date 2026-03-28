'use client'

import useSWR from 'swr'
import { profileRepo, xpRepo } from '@/shared/di/container'
import { useAuth } from '@/presentation/providers/auth-provider'

/** 프로필 전체 데이터 로드 (병렬 요청) */
export function useProfile() {
  const { user } = useAuth()
  const userId = user?.id ?? null

  const { data: profile, isLoading: profileLoading } = useSWR(
    userId ? ['profile', userId] : null,
    ([, id]) => profileRepo.getUserProfile(id),
  )

  const { data: experiences, isLoading: xpLoading } = useSWR(
    userId ? ['experiences', userId] : null,
    ([, id]) => xpRepo.getUserExperiences(id),
  )

  const { data: recentXp, isLoading: recentXpLoading } = useSWR(
    userId ? ['recent-xp', userId] : null,
    ([, id]) => xpRepo.getRecentXpHistories(id, 5),
  )

  const { data: activitySummary, isLoading: activityLoading } = useSWR(
    userId ? ['activity-summary', userId] : null,
    ([, id]) => profileRepo.getActivitySummary(id),
  )

  const { data: heatmapData, isLoading: heatmapLoading } = useSWR(
    userId ? ['heatmap', userId] : null,
    ([, id]) => profileRepo.getHeatmapData(id, 13),
  )

  const { data: thresholds } = useSWR(
    'level-thresholds',
    () => xpRepo.getLevelThresholds(),
    { revalidateOnFocus: false, revalidateOnReconnect: false },
  )

  const isLoading = profileLoading || xpLoading || recentXpLoading || activityLoading || heatmapLoading

  return {
    profile,
    experiences,
    recentXp,
    activitySummary,
    heatmapData,
    thresholds,
    isLoading,
  }
}
