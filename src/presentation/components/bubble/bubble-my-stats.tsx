'use client'

import { Flame, TrendingUp, Target, ChevronRight } from 'lucide-react'

interface BubbleMyStatsProps {
  weeklyShareCount: number
  weeklyGoal: number
  streakWeeks: number
  totalBubbles: number
  topContributionBubble: string | null
}

export function BubbleMyStats({
  weeklyShareCount,
  weeklyGoal,
  streakWeeks,
  totalBubbles,
  topContributionBubble,
}: BubbleMyStatsProps) {
  const goalProgress = Math.min((weeklyShareCount / weeklyGoal) * 100, 100)
  const isGoalMet = weeklyShareCount >= weeklyGoal

  return (
    <div
      className="mx-4 overflow-hidden rounded-2xl"
      style={{
        background: 'linear-gradient(135deg, var(--accent-social-light) 0%, var(--bg-card) 60%)',
        border: '1px solid var(--border)',
      }}
    >
      <div className="flex items-start gap-3 p-4">
        {/* 주간 공유 현황 */}
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-[13px] font-bold" style={{ color: 'var(--text)' }}>
              이번 주 활동
            </span>
            {streakWeeks > 1 && (
              <span
                className="flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[10px] font-bold"
                style={{ backgroundColor: '#FFF3E0', color: '#E65100' }}
              >
                <Flame size={10} />
                {streakWeeks}주 연속
              </span>
            )}
          </div>

          {/* 프로그레스 바 */}
          <div className="mt-2.5 flex items-center gap-2.5">
            <div
              className="h-[6px] flex-1 overflow-hidden rounded-full"
              style={{ backgroundColor: 'var(--border)' }}
            >
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${goalProgress}%`,
                  backgroundColor: isGoalMet ? 'var(--positive)' : 'var(--accent-social)',
                }}
              />
            </div>
            <span className="shrink-0 text-[12px] font-bold" style={{ color: isGoalMet ? 'var(--positive)' : 'var(--accent-social)' }}>
              {weeklyShareCount}/{weeklyGoal}
            </span>
          </div>

          {/* 하단 메타 */}
          <div className="mt-2 flex items-center gap-3">
            <span className="flex items-center gap-1 text-[11px]" style={{ color: 'var(--text-hint)' }}>
              <Target size={10} />
              {totalBubbles}개 버블 활동 중
            </span>
            {topContributionBubble && (
              <span className="flex items-center gap-1 text-[11px]" style={{ color: 'var(--text-hint)' }}>
                <TrendingUp size={10} />
                {topContributionBubble} 최다 공유
              </span>
            )}
          </div>
        </div>

        {/* 우측 숫자 */}
        <div className="flex flex-col items-center">
          <span
            className="text-[28px] font-black leading-none"
            style={{ color: 'var(--accent-social)' }}
          >
            {weeklyShareCount}
          </span>
          <span className="text-[10px]" style={{ color: 'var(--text-hint)' }}>공유</span>
        </div>
      </div>

      {/* 달성 시 보너스 배너 */}
      {isGoalMet && (
        <div
          className="flex items-center justify-between px-4 py-2"
          style={{ backgroundColor: 'var(--positive-light)', borderTop: '1px solid var(--border)' }}
        >
          <span className="flex items-center gap-1.5 text-[11px] font-semibold" style={{ color: 'var(--positive)' }}>
            주간 목표 달성! 보너스 XP 획득
          </span>
          <ChevronRight size={14} style={{ color: 'var(--positive)' }} />
        </div>
      )}
    </div>
  )
}
