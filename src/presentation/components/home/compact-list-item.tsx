'use client'

import { Wine, Users } from 'lucide-react'
import { MiniQuadrant } from '@/presentation/components/home/mini-quadrant'
import { BubbleQuadrant } from '@/presentation/components/bubble/bubble-quadrant'
import type { MemberDot } from '@/presentation/components/bubble/bubble-quadrant'
import { formatRelativeDate } from '@/shared/utils/date-format'
import type { ScoreSource } from '@/domain/entities/score'
import { ScoreSourceBadge } from '@/presentation/components/home/score-source-badge'

interface CompactListItemProps {
  rank: number
  photoUrl: string | null
  name: string
  meta: string
  score: number | null
  axisX: number | null
  axisY: number | null
  accentType: 'restaurant' | 'wine'
  onClick: () => void
  /** 버블 모드 — 멀티 dot 사분면 + 멤버 정보 */
  bubbleDots?: MemberDot[]
  memberCount?: number
  latestReviewAt?: string | null
  visitCount?: number
  scoreSource?: ScoreSource
}

export function CompactListItem({
  rank,
  photoUrl,
  name,
  meta,
  score,
  axisX,
  axisY,
  accentType,
  onClick,
  bubbleDots,
  memberCount,
  latestReviewAt,
  visitCount,
  scoreSource,
}: CompactListItemProps) {
  const isTop3 = rank <= 3
  const typeClass = accentType === 'wine' ? 'wine' : ''
  const accentColor = accentType === 'wine' ? 'var(--accent-wine)' : 'var(--accent-food)'
  const isBubbleMode = bubbleDots != null
  const hasQuadrant = isBubbleMode
    ? bubbleDots.length > 0
    : axisX != null && axisY != null && score != null

  return (
    <button
      type="button"
      onClick={onClick}
      className="compact-item w-full text-left transition-transform active:scale-[0.985]"
    >
      <span className={`compact-rank ${isTop3 ? `top ${typeClass}` : ''}`}>
        {rank}
      </span>

      {photoUrl ? (
        <div
          className="compact-thumb bg-cover bg-center"
          style={{ backgroundImage: `url(${photoUrl})` }}
        />
      ) : accentType === 'wine' ? (
        <div
          className="compact-thumb flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg, #2a2030, #1a1520)' }}
        >
          <Wine size={18} color="rgba(255,255,255,0.4)" />
        </div>
      ) : (
        <div
          className="compact-thumb"
          style={{ backgroundColor: 'var(--bg-elevated)' }}
        />
      )}

      <div className="min-w-0 flex-1">
        <p className="compact-name">{name}</p>
        <p className="compact-meta flex items-center gap-0.5">
          <span className="truncate">{meta}</span>
          {visitCount != null && visitCount > 1 && (
            <span className="shrink-0"> · {visitCount}회</span>
          )}
          {isBubbleMode && memberCount != null && (
            <span className="inline-flex shrink-0 items-center gap-0.5"> · <Users size={9} /> {memberCount}</span>
          )}
          {isBubbleMode && latestReviewAt && (
            <span className="shrink-0"> · {formatRelativeDate(latestReviewAt)}</span>
          )}
        </p>
      </div>

      {/* 사분면 + 점수 — 고정 너비로 정렬 */}
      <div className="flex w-[88px] shrink-0 items-center justify-end gap-2">
        {hasQuadrant && (
          isBubbleMode
            ? <BubbleQuadrant dots={bubbleDots} size={48} />
            : <MiniQuadrant axisX={axisX!} axisY={axisY!} satisfaction={score!} accentColor={accentColor} size={48} />
        )}
        <div className="flex flex-col items-end">
          <span className={`compact-score ${score != null ? (accentType === 'wine' ? 'wine' : 'food') : 'unrated'}`}>
            {score != null ? score : '—'}
          </span>
          {score != null && scoreSource && scoreSource !== 'mine' && (
            <ScoreSourceBadge source={scoreSource} />
          )}
        </div>
      </div>
    </button>
  )
}
