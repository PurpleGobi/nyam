'use client'

import Image from 'next/image'
import { MiniQuadrant } from '@/presentation/components/home/mini-quadrant'
import { getGaugeColor } from '@/shared/utils/gauge-color'

interface BubbleRecordCardProps {
  authorNickname: string
  authorAvatar: string | null
  authorAvatarColor: string | null
  authorLevel: number
  authorLevelTitle: string
  satisfaction: number | null
  axisX: number | null
  axisY: number | null
  comment: string | null
  scene: string | null
  visitDate: string | null
  /** 현재 뷰어가 해당 버블 멤버인지 */
  isMember: boolean
  /** 버블의 콘텐츠 가시성 설정 */
  contentVisibility: 'rating_only' | 'rating_and_comment'
  accentType: 'food' | 'wine'
  onPress?: () => void
}

export function BubbleRecordCard({
  authorNickname,
  authorAvatar,
  authorAvatarColor,
  authorLevel,
  authorLevelTitle,
  satisfaction,
  axisX,
  axisY,
  comment,
  scene,
  visitDate,
  isMember,
  contentVisibility,
  accentType,
  onPress,
}: BubbleRecordCardProps) {
  const showComment = isMember || contentVisibility === 'rating_and_comment'
  const showMeta = isMember
  const accentColor = accentType === 'wine' ? 'var(--accent-wine)' : 'var(--accent-food)'
  const hasQuadrant = axisX != null && axisY != null && satisfaction != null

  return (
    <button
      type="button"
      onClick={onPress}
      className="flex w-full items-center gap-3 text-left transition-transform active:scale-[0.985]"
      style={{ padding: '8px 0' }}
    >
      {/* 아바타 */}
      <div
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[13px] font-bold"
        style={{ backgroundColor: authorAvatarColor ?? 'var(--accent-social-light)', color: '#FFFFFF' }}
      >
        {authorAvatar ? (
          <Image src={authorAvatar} alt="" width={40} height={40} className="h-full w-full rounded-full object-cover" />
        ) : (
          authorNickname.charAt(0)
        )}
      </div>

      {/* 버블러 정보 + 한줄평/상황/방문일 */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="truncate text-[13px] font-bold" style={{ color: 'var(--text)' }}>
            {authorNickname}
          </span>
          <span
            className="shrink-0 text-[10px] font-medium"
            style={{
              backgroundColor: 'var(--bg-section)',
              color: 'var(--text-sub)',
              borderRadius: '4px',
              padding: '1px 5px',
            }}
          >
            {authorLevelTitle} Lv.{authorLevel}
          </span>
        </div>
        <p className="mt-0.5 flex items-center gap-0.5 text-[11px]" style={{ color: 'var(--text-hint)' }}>
          {showComment && comment && (
            <span className="truncate" style={{ color: 'var(--text-sub)' }}>{comment}</span>
          )}
          {showMeta && scene && (
            <>
              {showComment && comment && <span>·</span>}
              <span className="shrink-0">{scene}</span>
            </>
          )}
          {showMeta && visitDate && (
            <>
              {((showComment && comment) || scene) && <span>·</span>}
              <span className="shrink-0">{visitDate}</span>
            </>
          )}
        </p>
      </div>

      {/* 미니 사분면 + 점수 */}
      <div className="flex w-[88px] shrink-0 items-center justify-end gap-2">
        {hasQuadrant && (
          <MiniQuadrant axisX={axisX} axisY={axisY} satisfaction={satisfaction} accentColor={accentColor} size={48} />
        )}
        <span
          className="text-[18px] font-extrabold"
          style={{ color: satisfaction != null ? getGaugeColor(satisfaction) : 'var(--border-bold)', minWidth: '28px', textAlign: 'right' }}
        >
          {satisfaction != null ? satisfaction : '—'}
        </span>
      </div>
    </button>
  )
}
