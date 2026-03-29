'use client'

import Image from 'next/image'
import { Heart, MessageCircle } from 'lucide-react'
import { getGaugeColor } from '@/shared/utils/gauge-color'

interface BubbleRecordCardProps {
  authorNickname: string
  authorAvatar: string | null
  authorAvatarColor: string | null
  authorLevel: number
  authorLevelTitle: string
  bubbleName: string
  satisfaction: number | null
  comment: string | null
  scene: string | null
  visitDate: string | null
  likeCount: number
  commentCount: number
  /** 현재 뷰어가 해당 버블 멤버인지 */
  isMember: boolean
  /** 버블의 콘텐츠 가시성 설정 */
  contentVisibility: 'rating_only' | 'rating_and_comment'
  onPress?: () => void
}

export function BubbleRecordCard({
  authorNickname,
  authorAvatar,
  authorAvatarColor,
  authorLevel,
  authorLevelTitle,
  bubbleName,
  satisfaction,
  comment,
  scene,
  visitDate,
  likeCount,
  commentCount,
  isMember,
  contentVisibility,
  onPress,
}: BubbleRecordCardProps) {
  // 멤버: 모든 필드 표시
  // 비멤버 + rating_only: 아바타 + 레벨 + 점수만
  // 비멤버 + rating_and_comment: 아바타 + 레벨 + 점수 + 한줄평
  const showComment = isMember || contentVisibility === 'rating_and_comment'
  const showBottomRow = isMember

  return (
    <button
      type="button"
      onClick={onPress}
      className="flex w-full items-start gap-3 rounded-xl p-3 text-left transition-transform active:scale-[0.98]"
      style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}
    >
      <div
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[12px] font-bold"
        style={{ backgroundColor: authorAvatarColor ?? 'var(--accent-social-light)', color: '#FFFFFF' }}
      >
        {authorAvatar ? (
          <Image src={authorAvatar} alt="" width={32} height={32} className="h-full w-full rounded-full object-cover" />
        ) : (
          authorNickname.charAt(0)
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="text-[13px] font-bold" style={{ color: 'var(--text)' }}>{authorNickname}</span>
          <span
            className="text-[11px] font-medium"
            style={{
              backgroundColor: 'var(--bg-section)',
              color: 'var(--text-sub)',
              borderRadius: '4px',
              padding: '1px 5px',
            }}
          >
            {authorLevelTitle} Lv.{authorLevel}
          </span>
          <span className="text-[11px]" style={{ color: 'var(--text-hint)' }}>{bubbleName}</span>
        </div>
        {showComment && comment && (
          <p className="mt-1 line-clamp-1 text-[12px]" style={{ color: 'var(--text-sub)', lineHeight: 1.5 }}>
            {comment}
          </p>
        )}
        {showBottomRow && (
          <div className="mt-1 flex items-center gap-1" style={{ color: 'var(--text-hint)', fontSize: '11px' }}>
            {scene && <><span>{scene}</span><span>·</span></>}
            {visitDate && <span>{visitDate}</span>}
            {(likeCount > 0 || commentCount > 0) && (
              <span className="ml-auto flex items-center gap-2">
                {likeCount > 0 && (
                  <span className="flex items-center gap-0.5">
                    <Heart size={12} />
                    {likeCount}
                  </span>
                )}
                {commentCount > 0 && (
                  <span className="flex items-center gap-0.5">
                    <MessageCircle size={12} />
                    {commentCount}
                  </span>
                )}
              </span>
            )}
          </div>
        )}
      </div>

      {satisfaction !== null && (
        <span className="shrink-0 text-[14px] font-extrabold" style={{ color: getGaugeColor(satisfaction) }}>
          {satisfaction}
        </span>
      )}
    </button>
  )
}
