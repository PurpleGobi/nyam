'use client'

import { Users, Lock, Globe, Flame, Clock } from 'lucide-react'
import type { Bubble } from '@/domain/entities/bubble'
import { BubbleIcon } from '@/presentation/components/bubble/bubble-icon'
import { BubbleActivityRing } from '@/presentation/components/bubble/bubble-activity-ring'

interface BubbleCardProps {
  bubble: Bubble
  role: 'mine' | 'joined' | null
  isRecentlyActive?: boolean
  tasteMatchPct?: number | null
  memberAvatars?: Array<{ name: string; color: string }>
  lastActivityText?: string | null
  onClick: () => void
}

export function BubbleCard({
  bubble,
  role,
  isRecentlyActive = false,
  tasteMatchPct = null,
  memberAvatars = [],
  lastActivityText = null,
  onClick,
}: BubbleCardProps) {
  // 주간 활동 비율 (이전 대비)
  const activityPct = bubble.prevWeeklyRecordCount > 0
    ? Math.min((bubble.weeklyRecordCount / Math.max(bubble.prevWeeklyRecordCount, 1)) * 100, 100)
    : bubble.weeklyRecordCount > 0 ? 80 : 0

  const isHot = bubble.weeklyRecordCount > 0 &&
    bubble.prevWeeklyRecordCount > 0 &&
    bubble.weeklyRecordCount > bubble.prevWeeklyRecordCount * 1.5

  return (
    <button
      type="button"
      onClick={onClick}
      className="card flex flex-col gap-3 rounded-2xl p-4 text-left transition-transform active:scale-[0.98]"
      style={{
        border: isHot ? '1px solid var(--accent-social)' : undefined,
      }}
    >
      {/* 상단: 아이콘 + 이름 + 메타 */}
      <div className="flex items-start gap-3">
        {/* 아이콘 + 활동 링 */}
        <BubbleActivityRing progress={activityPct} size={48} strokeWidth={2.5}>
          <div
            className="flex h-full w-full items-center justify-center rounded-xl"
            style={{ backgroundColor: bubble.iconBgColor ?? 'var(--accent-social-light)', color: '#FFFFFF' }}
          >
            <BubbleIcon icon={bubble.icon} size={20} />
          </div>
        </BubbleActivityRing>

        {/* 이름 + 뱃지 행 */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className="truncate text-[14px] font-bold" style={{ color: 'var(--text)' }}>{bubble.name}</p>
            {role && (
              <span
                className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold"
                style={
                  role === 'mine'
                    ? { backgroundColor: 'var(--accent-food-light)', color: 'var(--accent-food)' }
                    : { backgroundColor: 'var(--bg-elevated)', color: 'var(--text-sub)' }
                }
              >
                {role === 'mine' ? '운영' : '가입'}
              </span>
            )}
            {isHot && (
              <span
                className="flex shrink-0 items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[9px] font-bold"
                style={{ backgroundColor: '#FFF3E0', color: '#E65100' }}
              >
                <Flame size={9} />
                HOT
              </span>
            )}
          </div>

          {/* 설명 (있으면) */}
          {bubble.description && (
            <p className="mt-0.5 truncate text-[11px] leading-snug" style={{ color: 'var(--text-sub)' }}>
              {bubble.description}
            </p>
          )}

          {/* 숫자 메타 */}
          <div className="mt-1 flex items-center gap-2 text-[11px]" style={{ color: 'var(--text-hint)' }}>
            <span className="flex items-center gap-0.5">
              <Users size={10} />
              {bubble.memberCount}
            </span>
            <span>·</span>
            <span>기록 {bubble.recordCount}</span>
            {bubble.weeklyRecordCount > 0 && (
              <>
                <span>·</span>
                <span style={{ color: 'var(--positive)' }}>+{bubble.weeklyRecordCount}w</span>
              </>
            )}
          </div>
        </div>

        {/* 우측: 공개/비공개 */}
        <div className="flex shrink-0 flex-col items-center gap-1.5">
          {bubble.visibility === 'private' ? (
            <Lock size={13} style={{ color: 'var(--text-hint)' }} />
          ) : (
            <Globe size={13} style={{ color: 'var(--text-hint)' }} />
          )}
          {isRecentlyActive && (
            <div className="h-[6px] w-[6px] rounded-full" style={{ backgroundColor: 'var(--positive)' }} />
          )}
        </div>
      </div>

      {/* 하단: 멤버 아바타 + 취향 일치도 + 최근 활동 */}
      <div className="flex items-center gap-2" style={{ borderTop: '1px solid var(--border)', paddingTop: '10px' }}>
        {/* 멤버 미니 아바타 */}
        {memberAvatars.length > 0 && (
          <div className="flex -space-x-1.5">
            {memberAvatars.slice(0, 4).map((m, i) => (
              <div
                key={i}
                className="flex h-[18px] w-[18px] items-center justify-center rounded-full text-[7px] font-bold ring-1 ring-[var(--bg-card)]"
                style={{ backgroundColor: m.color, color: '#FFFFFF', zIndex: 4 - i }}
              >
                {m.name.charAt(0)}
              </div>
            ))}
            {memberAvatars.length > 4 && (
              <div
                className="flex h-[18px] w-[18px] items-center justify-center rounded-full text-[7px] font-bold ring-1 ring-[var(--bg-card)]"
                style={{ backgroundColor: 'var(--bg-page)', color: 'var(--text-hint)' }}
              >
                +{memberAvatars.length - 4}
              </div>
            )}
          </div>
        )}

        {/* 취향 일치도 바 */}
        {tasteMatchPct !== null && (
          <div className="flex items-center gap-1.5">
            <div
              className="h-[4px] w-[40px] overflow-hidden rounded-full"
              style={{ backgroundColor: 'var(--border)' }}
            >
              <div
                className="h-full rounded-full"
                style={{
                  width: `${tasteMatchPct}%`,
                  backgroundColor: tasteMatchPct >= 80 ? 'var(--positive)' : tasteMatchPct >= 50 ? 'var(--caution)' : 'var(--text-hint)',
                }}
              />
            </div>
            <span className="text-[10px] font-semibold" style={{
              color: tasteMatchPct >= 80 ? 'var(--positive)' : tasteMatchPct >= 50 ? 'var(--caution)' : 'var(--text-hint)',
            }}>
              {tasteMatchPct}%
            </span>
          </div>
        )}

        {/* 스페이서 */}
        <div className="flex-1" />

        {/* 최근 활동 */}
        {lastActivityText && (
          <span className="flex items-center gap-0.5 truncate text-[10px]" style={{ color: 'var(--text-hint)', maxWidth: '140px' }}>
            <Clock size={9} />
            {lastActivityText}
          </span>
        )}
      </div>
    </button>
  )
}
