'use client'

import { useEffect } from 'react'
import { X } from 'lucide-react'
import type { AxisType, UserExperience, LevelInfo } from '@/domain/entities/xp'

interface LevelDetailSheetProps {
  isOpen: boolean
  axisType: AxisType | null
  axisValue: string | null
  data: {
    experience: UserExperience | null
    levelInfo: LevelInfo | null
  }
  onClose: () => void
}

export function LevelDetailSheet({ isOpen, axisType, axisValue, data, onClose }: LevelDetailSheetProps) {
  useEffect(() => {
    if (!isOpen) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const { experience, levelInfo } = data

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
          maxHeight: '60dvh',
          backgroundColor: 'var(--bg-elevated)',
          animation: 'slide-up 0.25s ease',
        }}
      >
        {/* Handle */}
        <div className="flex justify-center pt-2 pb-1">
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
            <div className="flex flex-col gap-4">
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

              {/* Progress */}
              <div>
                <div className="flex items-center justify-between">
                  <span style={{ fontSize: '12px', color: 'var(--text-hint)' }}>
                    다음 레벨까지
                  </span>
                  <span style={{ fontSize: '12px', color: 'var(--text-hint)' }}>
                    {levelInfo.currentXp} / {levelInfo.nextLevelXp} XP
                  </span>
                </div>
                <div
                  className="mt-1.5 h-2.5 overflow-hidden rounded-full"
                  style={{ backgroundColor: 'var(--bg)' }}
                >
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${Math.min(levelInfo.progress * 100, 100)}%`,
                      backgroundColor: levelInfo.color,
                    }}
                  />
                </div>
              </div>
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

const AXIS_LABELS: Record<string, string> = {
  category: '카테고리',
  area: '지역',
  genre: '장르',
  wine_variety: '품종',
  wine_region: '와인 지역',
}
