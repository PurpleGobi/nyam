'use client'

import { useState, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useProfile } from '@/application/hooks/use-profile'
import { getLevel } from '@/domain/services/xp-calculator'
import { xpRepo } from '@/shared/di/container'
import type { UserExperience, Milestone } from '@/domain/entities/xp'
import { ProfileHeader } from '@/presentation/components/profile/profile-header'
import { TasteIdentityCard } from '@/presentation/components/profile/taste-identity-card'
import { TotalLevelCard } from '@/presentation/components/profile/total-level-card'
import { OverviewGrid } from '@/presentation/components/profile/overview-grid'
import { ActivityHeatmap } from '@/presentation/components/profile/activity-heatmap'
import { RecentXpList } from '@/presentation/components/profile/recent-xp-list'
import { StatTabContainer } from '@/presentation/containers/stat-tab-container'
import { LevelList } from '@/presentation/components/profile/level-list'
import { LevelDetailSheet } from '@/presentation/components/profile/level-detail-sheet'

export function ProfileContainer() {
  const router = useRouter()
  const { profile, experiences, recentXp, activitySummary, heatmapData, thresholds, isLoading } = useProfile()

  // 상태
  const [activeStatTab, setActiveStatTab] = useState<'food' | 'wine'>('food')
  const [foodMiniTab, setFoodMiniTab] = useState<'region' | 'genre'>('region')
  const [wineMiniTab, setWineMiniTab] = useState<'origin' | 'grape'>('origin')
  const [levelDetailOpen, setLevelDetailOpen] = useState(false)
  const [selectedExperience, setSelectedExperience] = useState<UserExperience | null>(null)

  // 레벨 산출
  const levelInfo = useMemo(() => {
    if (!profile || !thresholds || thresholds.length === 0) return null
    return getLevel(profile.totalXp, thresholds)
  }, [profile, thresholds])

  // 경험치 그룹핑
  const groupedExperiences = useMemo(() => {
    if (!experiences) return null
    return {
      area: experiences.filter((e) => e.axisType === 'area'),
      genre: experiences.filter((e) => e.axisType === 'genre'),
      wineRegion: experiences.filter((e) => e.axisType === 'wine_region'),
      wineVariety: experiences.filter((e) => e.axisType === 'wine_variety'),
      category: experiences.filter((e) => e.axisType === 'category'),
    }
  }, [experiences])

  // LevelDetailSheet 통계 데이터
  const [levelDetailStats, setLevelDetailStats] = useState<{
    uniqueCount: number
    totalRecords: number
    revisitCount: number
    xpBreakdown: Record<string, number>
    nextMilestone: { milestone: Milestone; currentCount: number } | null
  }>({ uniqueCount: 0, totalRecords: 0, revisitCount: 0, xpBreakdown: {}, nextMilestone: null })

  const fetchLevelDetailStats = useCallback(async (exp: UserExperience) => {
    if (!profile) return
    const [uniqueCount, totalRecords, revisitCount, xpBreakdown] = await Promise.all([
      xpRepo.getUniqueCount(profile.id, exp.axisType, exp.axisValue),
      xpRepo.getTotalRecordCountByAxis(profile.id, exp.axisType, exp.axisValue),
      xpRepo.getRevisitCountByAxis(profile.id, exp.axisType, exp.axisValue),
      xpRepo.getXpBreakdownByAxis(profile.id, exp.axisType, exp.axisValue),
    ])
    const nextMilestone = await xpRepo.getNextMilestone(exp.axisType, 'record_count', totalRecords)
    setLevelDetailStats({
      uniqueCount,
      totalRecords,
      revisitCount,
      xpBreakdown,
      nextMilestone: nextMilestone ? { milestone: nextMilestone, currentCount: totalRecords } : null,
    })
  }, [profile])

  const handleLevelItemPress = (exp: UserExperience) => {
    setSelectedExperience(exp)
    setLevelDetailOpen(true)
    fetchLevelDetailStats(exp)
  }

  if (isLoading) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-[3px] border-[var(--accent-food)] border-t-transparent" />
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <p style={{ color: 'var(--text-hint)' }}>로그인이 필요합니다</p>
      </div>
    )
  }

  // 현재 탭의 경험치 목록
  const currentLevelExperiences =
    activeStatTab === 'food'
      ? foodMiniTab === 'region'
        ? groupedExperiences?.area ?? []
        : groupedExperiences?.genre ?? []
      : wineMiniTab === 'origin'
        ? groupedExperiences?.wineRegion ?? []
        : groupedExperiences?.wineVariety ?? []

  return (
    <div className="flex min-h-dvh flex-col gap-4 bg-[var(--bg)] pb-20">
      {/* 프로필 헤더 */}
      <ProfileHeader
        profile={profile}
        level={levelInfo?.level ?? 1}
        levelColor={levelInfo?.color ?? '#7EAE8B'}
      />

      {/* 맛 정체성 카드 */}
      <TasteIdentityCard
        tasteSummary={profile.tasteSummary}
        tasteTags={profile.tasteTags}
        recordCount={profile.recordCount}
        onSharePress={() => router.push('/profile/wrapped')}
      />

      {/* Activity Section */}
      {levelInfo && (
        <TotalLevelCard
          level={levelInfo.level}
          title={levelInfo.title}
          color={levelInfo.color}
          totalXp={profile.totalXp}
          nextLevelXp={levelInfo.nextLevelXp}
          progress={levelInfo.progress}
        />
      )}

      {activitySummary && <OverviewGrid summary={activitySummary} />}

      {heatmapData && (
        <ActivityHeatmap
          data={heatmapData}
          stats={{
            totalRecords: profile.recordCount,
            currentStreak: profile.currentStreak,
            activePeriodMonths: heatmapData.length > 0
              ? Math.max(1, Math.ceil(new Set(heatmapData.filter(c => c.count > 0).map(c => c.date.slice(0, 7))).size))
              : 0,
          }}
        />
      )}

      {recentXp && recentXp.length > 0 && <RecentXpList items={recentXp} />}

      {/* Stat Tabs */}
      <StatTabContainer />

      {/* Level Section (mini tabs + level list) */}
      {thresholds && thresholds.length > 0 && (
        <div className="mx-4">
          {/* Mini tabs */}
          <div className="mb-3 flex gap-2">
            {activeStatTab === 'food' ? (
              <>
                <MiniTab label="지역" active={foodMiniTab === 'region'} onClick={() => setFoodMiniTab('region')} />
                <MiniTab label="장르" active={foodMiniTab === 'genre'} onClick={() => setFoodMiniTab('genre')} />
              </>
            ) : (
              <>
                <MiniTab label="산지" active={wineMiniTab === 'origin'} onClick={() => setWineMiniTab('origin')} />
                <MiniTab label="품종" active={wineMiniTab === 'grape'} onClick={() => setWineMiniTab('grape')} />
              </>
            )}
          </div>

          <LevelList
            experiences={currentLevelExperiences}
            thresholds={thresholds}
            category={activeStatTab === 'food' ? 'restaurant' : 'wine'}
            onItemPress={handleLevelItemPress}
          />
        </div>
      )}

      {/* Level Detail Sheet */}
      <LevelDetailSheet
        isOpen={levelDetailOpen}
        axisType={selectedExperience?.axisType ?? null}
        axisValue={selectedExperience?.axisValue ?? null}
        data={{
          experience: selectedExperience,
          levelInfo: selectedExperience && thresholds
            ? getLevel(selectedExperience.totalXp, thresholds)
            : null,
        }}
        uniqueCount={levelDetailStats.uniqueCount}
        totalRecords={levelDetailStats.totalRecords}
        revisitCount={levelDetailStats.revisitCount}
        xpBreakdown={levelDetailStats.xpBreakdown}
        nextMilestone={levelDetailStats.nextMilestone}
        onClose={() => {
          setLevelDetailOpen(false)
          setSelectedExperience(null)
        }}
      />
    </div>
  )
}

function MiniTab({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-full px-3 py-1 transition-colors"
      style={{
        fontSize: '12px',
        fontWeight: active ? 700 : 500,
        backgroundColor: active ? 'var(--accent-food)' : 'var(--bg-card)',
        color: active ? '#FFFFFF' : 'var(--text-sub)',
        border: active ? 'none' : '1px solid var(--border)',
      }}
    >
      {label}
    </button>
  )
}
