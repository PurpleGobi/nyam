'use client'

import { Users, Flame } from 'lucide-react'
import type { Bubble } from '@/domain/entities/bubble'
import { BubbleIcon } from '@/presentation/components/bubble/bubble-icon'

interface CompactListBubbleProps {
  bubble: Bubble
  rank: number | null
  /** owner=내가 만든 버블, member=가입한 버블, null=외부 버블 */
  role: 'owner' | 'member' | null
  isRecentlyActive?: boolean
  expertise?: Array<{ axisValue: string; avgLevel: number }>
  onClick: () => void
  /** 외부 버블에 가입하기 콜백 */
  onJoin?: () => void
}

export function CompactListBubble({
  bubble,
  rank,
  role,
  isRecentlyActive = false,
  expertise,
  onClick,
  onJoin,
}: CompactListBubbleProps) {
  const isTop3 = rank != null && rank <= 3
  const isHot = bubble.weeklyRecordCount > 0 &&
    bubble.prevWeeklyRecordCount > 0 &&
    bubble.weeklyRecordCount > bubble.prevWeeklyRecordCount * 1.5

  return (
    <button
      type="button"
      onClick={onClick}
      className="compact-item w-full text-left transition-all active:scale-[0.985]"
    >
      {/* 순위 — CompactListItem과 동일 */}
      {rank != null && (
        <span className={`compact-rank ${isTop3 ? 'top social' : ''}`}>
          {rank}
        </span>
      )}

      {/* 썸네일 — 48x48 rounded-xl, CompactListItem의 compact-thumb과 동일 크기 */}
      <div
        className="compact-thumb flex items-center justify-center"
        style={{ backgroundColor: bubble.iconBgColor ?? 'var(--accent-social-light)', color: '#FFFFFF' }}
      >
        <BubbleIcon icon={bubble.icon} size={18} />
      </div>

      {/* 이름 + 메타 — CompactListItem과 동일 구조 */}
      <div className="min-w-0 flex-1">
        <p className="compact-name flex items-center gap-1">
          <span className="truncate">{bubble.name}</span>
          {role && (
            <span
              className="shrink-0 rounded-full px-1.5 py-px text-[9px] font-semibold"
              style={
                role === 'owner'
                  ? { backgroundColor: 'var(--accent-food-light)', color: 'var(--accent-food)' }
                  : { backgroundColor: 'var(--accent-social-light)', color: 'var(--accent-social)' }
              }
            >
              {role === 'owner' ? '운영' : '멤버'}
            </span>
          )}
          {isHot && (
            <span
              className="flex shrink-0 items-center gap-0.5 rounded-full px-1 py-px text-[8px] font-bold"
              style={{ backgroundColor: '#FFF3E0', color: '#E65100' }}
            >
              <Flame size={8} />
              HOT
            </span>
          )}
        </p>
        <p className="compact-meta flex items-center gap-0.5">
          <Users size={9} className="shrink-0" />
          <span className="shrink-0">{bubble.memberCount}</span>
          <span className="shrink-0">·</span>
          <span className="shrink-0">기록 {bubble.recordCount}</span>
          {bubble.weeklyRecordCount > 0 && (
            <>
              <span className="shrink-0">·</span>
              <span className="shrink-0" style={{ color: 'var(--positive)' }}>+{bubble.weeklyRecordCount}w</span>
            </>
          )}
        </p>
        {/* 전문분야 태그 — CompactListItem의 memberBubbles 뱃지와 동일 패턴 */}
        {expertise && expertise.length > 0 && (
          <div className="flex gap-1 pt-0.5">
            {expertise.map((e) => (
              <span
                key={e.axisValue}
                className="truncate rounded-full px-1.5 py-px text-[9px] font-medium"
                style={{ backgroundColor: 'var(--accent-social-light)', color: 'var(--accent-social)', maxWidth: 80 }}
              >
                {e.axisValue} Lv.{Math.round(e.avgLevel)}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* 우측 고정 영역 — CompactListItem의 88px score 영역과 동일 구조 */}
      <div className="flex w-[88px] shrink-0 items-center justify-end gap-2">
        {onJoin && !role ? (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onJoin() }}
            className="shrink-0 rounded-md px-2 py-1 text-[11px] font-semibold transition-opacity active:opacity-80"
            style={{ backgroundColor: 'var(--accent-social)', color: '#FFFFFF' }}
          >
            가입
          </button>
        ) : (
          <>
            {isRecentlyActive && (
              <div className="h-[6px] w-[6px] shrink-0 rounded-full" style={{ backgroundColor: 'var(--positive)' }} />
            )}
            <span className="compact-score social">
              {bubble.memberCount}
            </span>
          </>
        )}
      </div>
    </button>
  )
}
