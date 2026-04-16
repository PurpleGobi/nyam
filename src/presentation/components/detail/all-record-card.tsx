'use client'

import Image from 'next/image'
import { ThumbsUp, ThumbsDown, MessageCircle } from 'lucide-react'
import { getGaugeColor } from '@/shared/utils/gauge-color'
import type { ReactionType } from '@/domain/entities/reaction'
import type { RecordSource } from '@/application/hooks/use-all-target-records'
import type { RecordPhoto } from '@/domain/entities/record-photo'

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
  photos: RecordPhoto[]
  onAuthorPress: () => void
  onPhotoPress?: (photos: RecordPhoto[], index: number) => void
  reactionCounts?: { good: number; bad: number }
  myReactions?: Set<string>
  onReactionToggle?: (reactionType: ReactionType) => void
  onCommentPress?: () => void
  commentCount?: number
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
  comment,
  scene,
  visitDate,
  source,
  accentType,
  photos,
  onAuthorPress,
  onPhotoPress,
  reactionCounts,
  myReactions,
  onReactionToggle,
  onCommentPress,
  commentCount,
}: AllRecordCardProps) {
  const accentColor = accentType === 'wine' ? 'var(--accent-wine)' : 'var(--accent-food)'
  const sourceColor = SOURCE_COLORS[source]
  const goodCount = reactionCounts?.good ?? 0
  const badCount = reactionCounts?.bad ?? 0
  const cCount = commentCount ?? 0

  return (
    <div
      className="rounded-xl"
      style={{ padding: '12px', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}
    >
      {/* 헤더: 아바타 + 작성자 + 메타 + 점수 */}
      <div className="flex items-center gap-2.5">
        <button
          type="button"
          onClick={onAuthorPress}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold transition-opacity active:opacity-70"
          style={{ backgroundColor: authorAvatarColor ?? 'var(--accent-social-light)', color: 'var(--text-inverse)' }}
        >
          {authorAvatar ? (
            <Image src={authorAvatar} alt="" width={32} height={32} className="h-full w-full rounded-full object-cover" />
          ) : (
            authorNickname.charAt(0)
          )}
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={onAuthorPress}
              className="truncate text-[13px] font-semibold transition-opacity active:opacity-70"
              style={{ color: 'var(--text)' }}
            >
              {authorNickname}
            </button>
            <span
              className="shrink-0 rounded-full text-[9px] font-semibold"
              style={{
                padding: '1px 6px',
                backgroundColor: `color-mix(in srgb, ${sourceColor} 12%, transparent)`,
                color: sourceColor,
              }}
            >
              {SOURCE_LABELS[source]}
            </span>
          </div>
          <p className="flex items-center gap-1 text-[10px]" style={{ color: 'var(--text-hint)' }}>
            <span>{authorLevelTitle} Lv.{authorLevel}</span>
            {visitDate && <><span>·</span><span>{visitDate}</span></>}
            {scene && <><span>·</span><span>{scene}</span></>}
          </p>
        </div>
        {/* 점수 */}
        <span
          className="shrink-0 text-[20px] font-extrabold"
          style={{ color: satisfaction != null ? getGaugeColor(satisfaction) : 'var(--border-bold)' }}
        >
          {satisfaction != null ? satisfaction : '\u2014'}
        </span>
      </div>

      {/* 한줄평 */}
      {comment && (
        <p
          className="mt-2 text-[13px] leading-relaxed"
          style={{ color: 'var(--text-sub)' }}
        >
          {comment}
        </p>
      )}

      {/* 사진 */}
      {photos.length > 0 && (
        <div className="mt-2 flex gap-1.5 overflow-x-auto">
          {photos.slice(0, 5).map((p, pi) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={p.id}
              src={p.url}
              alt=""
              className="shrink-0 rounded-lg object-cover"
              style={{ width: '64px', height: '64px', cursor: 'pointer' }}
              onClick={() => onPhotoPress?.(photos, pi)}
            />
          ))}
        </div>
      )}

      {/* 하단: 리액션 + 댓글 */}
      <div
        className="mt-2 flex items-center gap-1 border-t pt-2"
        style={{ borderColor: 'var(--border)' }}
      >
        <button
          type="button"
          onClick={onReactionToggle ? () => onReactionToggle('good') : undefined}
          disabled={!onReactionToggle}
          className="flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors active:opacity-70 disabled:opacity-50"
          style={{
            backgroundColor: myReactions?.has('good') ? 'color-mix(in srgb, var(--positive) 12%, transparent)' : 'transparent',
            color: myReactions?.has('good') ? 'var(--positive)' : 'var(--text-hint)',
          }}
        >
          <ThumbsUp size={13} fill={myReactions?.has('good') ? 'currentColor' : 'none'} />
          {goodCount > 0 && <span>{goodCount}</span>}
        </button>
        <button
          type="button"
          onClick={onReactionToggle ? () => onReactionToggle('bad') : undefined}
          disabled={!onReactionToggle}
          className="flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors active:opacity-70 disabled:opacity-50"
          style={{
            backgroundColor: myReactions?.has('bad') ? 'color-mix(in srgb, var(--negative) 12%, transparent)' : 'transparent',
            color: myReactions?.has('bad') ? 'var(--negative)' : 'var(--text-hint)',
          }}
        >
          <ThumbsDown size={13} fill={myReactions?.has('bad') ? 'currentColor' : 'none'} />
          {badCount > 0 && <span>{badCount}</span>}
        </button>
        {onCommentPress && (
          <button
            type="button"
            onClick={onCommentPress}
            className="ml-auto flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors active:opacity-70"
            style={{ color: cCount > 0 ? 'var(--accent-social)' : 'var(--text-hint)' }}
          >
            <MessageCircle size={13} />
            {cCount > 0 ? <span>{cCount}</span> : <span>댓글</span>}
          </button>
        )}
      </div>
    </div>
  )
}
