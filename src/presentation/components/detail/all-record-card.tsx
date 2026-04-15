'use client'

import Image from 'next/image'
import { MiniQuadrant } from '@/presentation/components/home/mini-quadrant'
import { getGaugeColor } from '@/shared/utils/gauge-color'
import type { RecordSource } from '@/application/hooks/use-all-target-records'

interface AllRecordCardProps {
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
  source: RecordSource
  accentType: 'food' | 'wine'
  onAuthorPress: () => void
}

const SOURCE_LABELS: Record<RecordSource, string> = {
  bubble: '버블',
  following: '팔로잉',
  public: '공개',
}

const SOURCE_COLORS: Record<RecordSource, string> = {
  bubble: 'var(--accent-social)',
  following: 'var(--accent-food)',
  public: 'var(--text-hint)',
}

export function AllRecordCard({
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
  source,
  accentType,
  onAuthorPress,
}: AllRecordCardProps) {
  const accentColor = accentType === 'wine' ? 'var(--accent-wine)' : 'var(--accent-food)'
  const hasQuadrant = axisX != null && axisY != null && satisfaction != null
  const sourceColor = SOURCE_COLORS[source]

  return (
    <div
      className="flex w-full items-center gap-3"
      style={{ padding: '8px 0' }}
    >
      {/* 아바타 — 탭하면 프로필로 이동 */}
      <button
        type="button"
        onClick={onAuthorPress}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[13px] font-bold transition-opacity active:opacity-70"
        style={{ backgroundColor: authorAvatarColor ?? 'var(--accent-social-light)', color: 'var(--text-inverse)' }}
      >
        {authorAvatar ? (
          <Image src={authorAvatar} alt="" width={40} height={40} className="h-full w-full rounded-full object-cover" />
        ) : (
          authorNickname.charAt(0)
        )}
      </button>

      {/* 작성자 정보 + 한줄평 */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onAuthorPress}
            className="truncate text-[13px] font-bold transition-opacity active:opacity-70"
            style={{ color: 'var(--text)' }}
          >
            {authorNickname}
          </button>
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
          <span
            className="shrink-0 rounded-full text-[9px] font-semibold"
            style={{
              padding: '1px 6px',
              backgroundColor: `color-mix(in srgb, ${sourceColor} 12%, var(--bg))`,
              color: sourceColor,
            }}
          >
            {SOURCE_LABELS[source]}
          </span>
        </div>
        {comment && (
          <p className="mt-0.5 text-[11px] leading-relaxed" style={{ color: 'var(--text-sub)' }}>{comment}</p>
        )}
        {(scene || visitDate) && (
          <p className="mt-0.5 flex items-center gap-0.5 text-[11px]" style={{ color: 'var(--text-hint)' }}>
            {scene && <span className="shrink-0">{scene}</span>}
            {scene && visitDate && <span>·</span>}
            {visitDate && <span className="shrink-0">{visitDate}</span>}
          </p>
        )}
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
          {satisfaction != null ? satisfaction : '\u2014'}
        </span>
      </div>
    </div>
  )
}
