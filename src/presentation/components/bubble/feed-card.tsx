'use client'

import Image from 'next/image'
import { Clock, Heart, MessageCircle, Bookmark, CheckCircle2, Flame } from 'lucide-react'
import type { ReactionType } from '@/domain/entities/reaction'

interface FeedCardProps {
  recordId: string
  authorName: string
  authorAvatar: string | null
  authorAvatarColor: string | null
  authorLevel: number
  sharedAt: string
  targetName: string
  targetType: 'restaurant' | 'wine'
  targetMeta: string | null
  satisfaction: number | null
  comment: string | null
  photoUrls: string[]
  reactions: Record<string, number>
  myReactions: ReactionType[]
  likeCount: number
  commentCount: number
  readCount: number
  onReactionToggle: (type: ReactionType) => void
  onCommentClick: () => void
  onClick: () => void
}

export function FeedCard({
  authorName,
  authorAvatarColor,
  authorLevel,
  sharedAt,
  targetName,
  targetType,
  targetMeta,
  satisfaction,
  comment,
  photoUrls,
  reactions,
  myReactions,
  likeCount,
  commentCount,
  readCount,
  onReactionToggle,
  onCommentClick,
  onClick,
}: FeedCardProps) {
  const timeAgo = formatTimeAgo(sharedAt)
  const scoreColor = targetType === 'restaurant' ? 'var(--accent-food)' : 'var(--accent-wine)'

  return (
    <button
      type="button"
      onClick={onClick}
      className="card flex w-full flex-col overflow-hidden rounded-xl text-left"
    >
      {/* 사진 그리드 */}
      {photoUrls.length > 0 && (
        <div className="relative">
          <PhotoGrid photos={photoUrls} />
          {satisfaction !== null && (
            <div
              className="absolute bottom-2 left-2 flex items-center justify-center rounded-lg px-2 py-1 backdrop-blur-sm"
              style={{ backgroundColor: 'rgba(0,0,0,0.6)', border: `1.5px solid ${scoreColor}` }}
            >
              <span className="text-[20px] font-black text-white">{Math.round(satisfaction)}</span>
            </div>
          )}
        </div>
      )}

      <div className="flex flex-col gap-2 p-3.5">
        {/* 유저 행 */}
        <div className="flex items-center gap-2">
          <div
            className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full text-[9px] font-bold"
            style={{ backgroundColor: authorAvatarColor ?? 'var(--accent-social-light)', color: '#FFFFFF' }}
          >
            {authorName.charAt(0)}
          </div>
          <span className="flex-1 text-[13px] font-semibold" style={{ color: 'var(--text)' }}>{authorName}</span>
          <span
            className="rounded-full px-1.5 py-0.5 text-[9px] font-bold"
            style={{ backgroundColor: 'var(--accent-social-light)', color: 'var(--accent-social)' }}
          >
            Lv.{authorLevel}
          </span>
          <span className="flex items-center gap-0.5 text-[11px]" style={{ color: 'var(--text-hint)' }}>
            <Clock size={10} />
            {timeAgo}
          </span>
        </div>

        {/* 장소명 + 메타 */}
        <div>
          <p className="text-[15px] font-bold" style={{ color: 'var(--text)' }}>{targetName}</p>
          {targetMeta && (
            <p className="mt-0.5 text-[11px]" style={{ color: 'var(--text-hint)' }}>{targetMeta}</p>
          )}
        </div>

        {/* 점수 (사진 없을 때) */}
        {photoUrls.length === 0 && satisfaction !== null && (
          <div
            className="inline-flex w-fit items-center gap-1 rounded-lg px-2 py-1"
            style={{ backgroundColor: `${scoreColor}15` }}
          >
            <span className="text-[15px] font-black" style={{ color: scoreColor }}>{Math.round(satisfaction)}</span>
          </div>
        )}

        {/* 한줄평 */}
        {comment && (
          <p className="line-clamp-2 text-[12px] leading-relaxed" style={{ color: 'var(--text-sub)' }}>{comment}</p>
        )}

        {/* 리액션 + 액션 */}
        <div className="flex items-center justify-between pt-1" style={{ borderTop: '1px solid var(--border)' }}>
          <div className="flex items-center gap-3">
            <ReactionChip icon={Bookmark} type="want" count={reactions.want ?? 0} active={myReactions.includes('want')} onToggle={onReactionToggle} activeColor="var(--accent-food)" />
            <ReactionChip icon={CheckCircle2} type="check" count={reactions.check ?? 0} active={myReactions.includes('check')} onToggle={onReactionToggle} activeColor="var(--positive)" />
            <ReactionChip icon={Flame} type="fire" count={reactions.fire ?? 0} active={myReactions.includes('fire')} onToggle={onReactionToggle} activeColor="#E55A35" />
          </div>
          <div className="flex items-center gap-3">
            <ReactionChip icon={Heart} type="like" count={likeCount} active={myReactions.includes('like')} onToggle={onReactionToggle} activeColor="var(--negative)" />
            <button type="button" onClick={(e) => { e.stopPropagation(); onCommentClick() }} className="flex items-center gap-1">
              <MessageCircle size={14} style={{ color: 'var(--text-hint)' }} />
              {commentCount > 0 && <span className="text-[11px]" style={{ color: 'var(--text-hint)' }}>{commentCount}</span>}
            </button>
          </div>
        </div>

        {/* readCount */}
        {readCount > 0 && (
          <p className="text-[10px]" style={{ color: 'var(--text-hint)' }}>
            {readCount}명이 봤어요
          </p>
        )}
      </div>
    </button>
  )
}

function ReactionChip({
  icon: Icon,
  type,
  count,
  active,
  onToggle,
  activeColor,
}: {
  icon: typeof Bookmark
  type: string
  count: number
  active: boolean
  onToggle: (type: ReactionType) => void
  activeColor: string
}) {
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); onToggle(type as ReactionType) }}
      className="flex items-center gap-0.5"
    >
      <Icon size={14} style={{ color: active ? activeColor : 'var(--text-hint)' }} />
      {count > 0 && (
        <span className="text-[11px] font-semibold" style={{ color: active ? activeColor : 'var(--text-hint)' }}>
          {count}
        </span>
      )}
    </button>
  )
}

function PhotoGrid({ photos }: { photos: string[] }) {
  if (photos.length === 1) {
    return (
      <div className="relative aspect-video w-full">
        <Image src={photos[0]} alt="" fill className="object-cover" sizes="100vw" />
      </div>
    )
  }
  if (photos.length === 2) {
    return (
      <div className="flex gap-0.5" style={{ aspectRatio: '16/9' }}>
        {photos.map((url, i) => (
          <div key={i} className="relative flex-1">
            <Image src={url} alt="" fill className="object-cover" sizes="50vw" />
          </div>
        ))}
      </div>
    )
  }
  // 3+: 좌 1장(큰) + 우 2장(작은) 스택
  return (
    <div className="flex gap-0.5" style={{ aspectRatio: '16/9' }}>
      <div className="relative flex-1">
        <Image src={photos[0]} alt="" fill className="object-cover" sizes="67vw" />
      </div>
      <div className="flex w-1/3 flex-col gap-0.5">
        <div className="relative flex-1">
          <Image src={photos[1]} alt="" fill className="object-cover" sizes="33vw" />
        </div>
        {photos[2] && (
          <div className="relative flex-1">
            <Image src={photos[2]} alt="" fill className="object-cover" sizes="33vw" />
          </div>
        )}
      </div>
    </div>
  )
}

function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return '방금'
  if (minutes < 60) return `${minutes}분 전`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}시간 전`
  const days = Math.floor(hours / 24)
  return `${days}일 전`
}
