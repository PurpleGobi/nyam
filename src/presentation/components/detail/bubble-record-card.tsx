'use client'

import Image from 'next/image'
import { getGaugeColor } from '@/shared/utils/gauge-color'

interface BubbleRecordCardProps {
  authorNickname: string
  authorAvatar: string | null
  authorAvatarColor: string | null
  bubbleName: string
  satisfaction: number | null
  comment: string | null
  visitDate: string | null
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
  bubbleName,
  satisfaction,
  comment,
  visitDate,
  isMember,
  contentVisibility,
  onPress,
}: BubbleRecordCardProps) {
  // 멤버: 모든 필드 표시
  // 비멤버 + rating_only: 아바타 + 이름 + 점수만
  // 비멤버 + rating_and_comment: 아바타 + 이름 + 점수 + 한줄평
  const showComment = isMember || contentVisibility === 'rating_and_comment'
  const showVisitDate = isMember

  return (
    <button
      type="button"
      onClick={onPress}
      className="flex w-full items-start gap-3 rounded-xl p-3 text-left transition-colors active:scale-[0.98]"
      style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}
    >
      <div
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[12px] font-bold"
        style={{ backgroundColor: authorAvatarColor ?? 'var(--accent-social-light)', color: '#FFFFFF' }}
      >
        {authorAvatar ? (
          <Image src={authorAvatar} alt="" width={32} height={32} className="h-full w-full rounded-full object-cover" unoptimized />
        ) : (
          authorNickname.charAt(0)
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-bold" style={{ color: 'var(--text)' }}>{authorNickname}</span>
          <span className="text-[11px]" style={{ color: 'var(--text-hint)' }}>{bubbleName}</span>
        </div>
        {showComment && comment && (
          <p className="mt-1 line-clamp-1 text-[12px]" style={{ color: 'var(--text-sub)', lineHeight: 1.5 }}>
            {comment}
          </p>
        )}
        {showVisitDate && visitDate && (
          <span className="mt-1 block text-[11px]" style={{ color: 'var(--text-hint)' }}>{visitDate}</span>
        )}
      </div>

      {satisfaction !== null && (
        <div
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
          style={{ backgroundColor: getGaugeColor(satisfaction) }}
        >
          <span style={{ fontSize: '11px', fontWeight: 800, color: '#FFFFFF' }}>{satisfaction}</span>
        </div>
      )}
    </button>
  )
}
