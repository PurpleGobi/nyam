'use client'

import { useEffect } from 'react'
import { X, Target, Sparkles, Repeat, Award, Trophy, Heart } from 'lucide-react'
import type { AxisType, UserExperience, LevelInfo, Milestone } from '@/domain/entities/xp'

interface LevelDetailSheetProps {
  isOpen: boolean
  axisType: AxisType | null
  axisValue: string | null
  data: {
    experience: UserExperience | null
    levelInfo: LevelInfo | null
  }
  // 통계
  uniqueCount: number
  totalRecords: number
  revisitCount: number
  xpBreakdown: Record<string, number>
  nextMilestone: { milestone: Milestone; currentCount: number } | null
  onClose: () => void
}

const XP_BREAKDOWN_ITEMS: { key: string; label: string; icon: typeof Sparkles }[] = [
  { key: 'detail_axis', label: '새 장소 기록', icon: Sparkles },
  { key: 'revisit', label: '재방문', icon: Repeat },
  { key: 'record_full', label: '품질 보너스', icon: Award },
  { key: 'milestone', label: '마일스톤', icon: Trophy },
  { key: 'social', label: '소셜', icon: Heart },
]

export function LevelDetailSheet({
  isOpen, axisType, axisValue, data,
  uniqueCount, totalRecords, revisitCount, xpBreakdown, nextMilestone,
  onClose,
}: LevelDetailSheetProps) {
  useEffect(() => {
    if (!isOpen) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const { experience, levelInfo } = data
  const isWine = axisType === 'wine_region' || axisType === 'wine_variety'

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[190]"
        style={{ backgroundColor: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        className="fixed inset-x-0 bottom-0 z-[200] flex flex-col rounded-t-2xl"
        style={{
          maxHeight: '70dvh',
          backgroundColor: 'var(--bg-elevated)',
          animation: 'slide-up 0.25s ease',
        }}
      >
        {/* Handle — 36px 영역 */}
        <div className="flex justify-center" style={{ height: '36px', paddingTop: '12px' }}>
          <div className="h-1 w-10 rounded-full" style={{ backgroundColor: 'var(--border-bold)' }} />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3">
          <div>
            <p style={{ fontSize: '11px', color: 'var(--text-hint)' }}>
              {AXIS_LABELS[axisType ?? 'category']}
            </p>
            <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text)' }}>
              {axisValue ?? '-'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full"
            style={{ backgroundColor: 'var(--bg)' }}
          >
            <X size={16} style={{ color: 'var(--text-sub)' }} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 pb-8">
          {levelInfo ? (
            <div className="flex flex-col gap-5">
              {/* Level badge */}
              <div className="flex items-center gap-4">
                <div
                  className="flex h-16 w-16 items-center justify-center rounded-2xl"
                  style={{ backgroundColor: `${levelInfo.color}20` }}
                >
                  <span style={{ fontSize: '28px', fontWeight: 900, color: levelInfo.color }}>
                    {levelInfo.level}
                  </span>
                </div>
                <div>
                  <p style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text)' }}>
                    Lv.{levelInfo.level} {levelInfo.title}
                  </p>
                  <p style={{ fontSize: '12px', color: 'var(--text-hint)' }}>
                    {experience?.totalXp.toLocaleString() ?? 0} XP
                  </p>
                </div>
              </div>

              {/* Progress — 8px bar */}
              <div>
                <div className="flex items-center justify-between">
                  <span style={{ fontSize: '12px', color: 'var(--text-hint)' }}>다음 레벨까지</span>
                  <span style={{ fontSize: '12px', color: 'var(--text-hint)' }}>
                    {levelInfo.currentXp} / {levelInfo.nextLevelXp} XP
                  </span>
                </div>
                <div className="mt-1.5 h-2 overflow-hidden rounded-full" style={{ backgroundColor: 'var(--bg)' }}>
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${Math.min(levelInfo.progress * 100, 100)}%`,
                      backgroundColor: levelInfo.color,
                    }}
                  />
                </div>
              </div>

              {/* 통계 3열 */}
              <div
                className="flex gap-2 rounded-xl px-3 py-3"
                style={{ backgroundColor: 'var(--bg)', border: '1px solid var(--border)' }}
              >
                <StatColumn label={isWine ? '고유 와인' : '고유 장소'} value={uniqueCount} />
                <div className="w-[1px]" style={{ backgroundColor: 'var(--border)' }} />
                <StatColumn label="총 기록" value={totalRecords} />
                <div className="w-[1px]" style={{ backgroundColor: 'var(--border)' }} />
                <StatColumn label="재방문" value={revisitCount} />
              </div>

              {/* XP 구성 (5항목) */}
              <div>
                <p className="mb-2" style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)' }}>
                  XP 구성
                </p>
                <div className="flex flex-col gap-1.5">
                  {XP_BREAKDOWN_ITEMS.map((item) => {
                    const xp = getBreakdownXp(xpBreakdown, item.key)
                    return (
                      <div key={item.key} className="flex items-center justify-between py-1">
                        <div className="flex items-center gap-2">
                          <item.icon size={14} style={{ color: 'var(--text-hint)' }} />
                          <span style={{ fontSize: '13px', color: 'var(--text-sub)' }}>{item.label}</span>
                        </div>
                        <span style={{ fontSize: '13px', fontWeight: 600, color: xp > 0 ? 'var(--text)' : 'var(--text-hint)' }}>
                          {xp > 0 ? `+${xp}` : '-'}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* 다음 마일스톤 */}
              {nextMilestone && (
                <div
                  className="flex items-center gap-3 rounded-xl px-3 py-3"
                  style={{ backgroundColor: 'color-mix(in srgb, var(--caution) 8%, transparent)', border: '1px solid color-mix(in srgb, var(--caution) 20%, transparent)' }}
                >
                  <Target size={18} style={{ color: 'var(--caution)' }} />
                  <div className="min-w-0 flex-1">
                    <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>
                      {nextMilestone.milestone.label}
                    </p>
                    <div className="mt-1 flex items-center gap-2">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full" style={{ backgroundColor: 'var(--bg)' }}>
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${Math.min((nextMilestone.currentCount / nextMilestone.milestone.threshold) * 100, 100)}%`,
                            backgroundColor: 'var(--caution)',
                          }}
                        />
                      </div>
                      <span style={{ fontSize: '11px', color: 'var(--text-hint)' }}>
                        {nextMilestone.currentCount}/{nextMilestone.milestone.threshold}
                      </span>
                    </div>
                    <p className="mt-0.5" style={{ fontSize: '11px', color: 'var(--caution)' }}>
                      +{nextMilestone.milestone.xpReward} XP
                    </p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center py-8">
              <p style={{ fontSize: '14px', color: 'var(--text-hint)' }}>
                아직 경험치가 없습니다
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

function StatColumn({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-1 flex-col items-center gap-0.5">
      <span style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text)' }}>{value}</span>
      <span style={{ fontSize: '11px', color: 'var(--text-hint)' }}>{label}</span>
    </div>
  )
}

function getBreakdownXp(breakdown: Record<string, number>, key: string): number {
  if (key === 'social') {
    return (breakdown.social_share ?? 0) + (breakdown.social_like ?? 0) +
      (breakdown.social_follow ?? 0) + (breakdown.social_mutual ?? 0)
  }
  if (key === 'record_full') {
    return (breakdown.record_full ?? 0) + (breakdown.record_photo ?? 0) +
      (breakdown.record_score ?? 0)
  }
  return breakdown[key] ?? 0
}

const AXIS_LABELS: Record<string, string> = {
  category: '카테고리',
  area: '지역',
  genre: '장르',
  wine_variety: '품종',
  wine_region: '와인 지역',
}
