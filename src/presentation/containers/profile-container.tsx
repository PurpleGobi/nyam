'use client'

import { useState, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useProfile } from '@/application/hooks/use-profile'
import { getLevel } from '@/domain/services/xp-calculator'
import { xpRepo } from '@/shared/di/container'
import type { UserExperience, Milestone } from '@/domain/entities/xp'
import { ProfileHeader } from '@/presentation/components/profile/profile-header'
import { TotalLevelCard } from '@/presentation/components/profile/total-level-card'
import { OverviewGrid } from '@/presentation/components/profile/overview-grid'
import { ActivityHeatmap } from '@/presentation/components/profile/activity-heatmap'
import { RecentXpList } from '@/presentation/components/profile/recent-xp-list'
import { StatTabContainer } from '@/presentation/containers/stat-tab-container'
import { LevelList } from '@/presentation/components/profile/level-list'
import { LevelDetailSheet } from '@/presentation/components/profile/level-detail-sheet'
import { AppHeader } from '@/presentation/components/layout/app-header'
import { FabBack } from '@/presentation/components/layout/fab-back'

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
        <p style={{ color: 'var(--text-hint)' }}>프로필을 불러올 수 없습니다</p>
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
    <div className="content-detail flex min-h-dvh flex-col gap-4 bg-[var(--bg)] pb-20">
      <AppHeader />
      <FabBack />

      {/* 프로필 헤더 (2컬럼: 아바타+이름 | 미식 정체성 카드) */}
      <ProfileHeader
        profile={profile}
        level={levelInfo?.level ?? 1}
        levelColor={levelInfo?.color ?? '#7EAE8B'}
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

      {/* Stat Tabs + Level Section */}
      <StatTabContainer
        onTabChange={(tab) => setActiveStatTab(tab === 'restaurant' ? 'food' : 'wine')}
        levelSlot={
          thresholds && thresholds.length > 0 ? (
            <div>
              <h3 className="mb-3" style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text)' }}>
                경험치 & 레벨
              </h3>
              <div className="mb-3 flex gap-2">
                {activeStatTab === 'food' ? (
                  <>
                    <MiniTab label="지역" active={foodMiniTab === 'region'} onClick={() => setFoodMiniTab('region')} />
                    <MiniTab label="장르" active={foodMiniTab === 'genre'} onClick={() => setFoodMiniTab('genre')} />
                  </>
                ) : (
                  <>
                    <MiniTab label="산지" active={wineMiniTab === 'origin'} onClick={() => setWineMiniTab('origin')} accentColor="var(--accent-wine)" />
                    <MiniTab label="품종" active={wineMiniTab === 'grape'} onClick={() => setWineMiniTab('grape')} accentColor="var(--accent-wine)" />
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
          ) : null
        }
      />

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

function MiniTab({ label, active, onClick, accentColor = 'var(--accent-food)' }: { label: string; active: boolean; onClick: () => void; accentColor?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-full px-3 py-1 transition-colors"
      style={{
        fontSize: '12px',
        fontWeight: active ? 700 : 500,
        backgroundColor: active ? accentColor : 'var(--bg-card)',
        color: active ? '#FFFFFF' : 'var(--text-sub)',
        border: active ? 'none' : '1px solid var(--border)',
      }}
    >
      {label}
    </button>
  )
}
