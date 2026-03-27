'use client'

import { getGaugeColor } from '@/shared/utils/gauge-color'

interface BubbleRecordCardProps {
  authorNickname: string
  authorAvatar: string | null
  authorAvatarColor: string | null
  bubbleName: string
  satisfaction: number | null
  comment: string | null
  visitDate: string | null
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
  onPress,
}: BubbleRecordCardProps) {
  return (
    <button
      type="button"
      onClick={onPress}
      className="flex w-full items-start gap-3 rounded-xl p-3 text-left transition-colors active:scale-[0.98]"
      style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}
    >
      <div
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[13px] font-bold"
        style={{ backgroundColor: authorAvatarColor ?? 'var(--accent-social-light)', color: '#FFFFFF' }}
      >
        {authorAvatar ? (
          <img src={authorAvatar} alt="" className="h-full w-full rounded-full object-cover" />
        ) : (
          authorNickname.charAt(0)
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-semibold" style={{ color: 'var(--text)' }}>{authorNickname}</span>
          <span className="text-[10px]" style={{ color: 'var(--text-hint)' }}>{bubbleName}</span>
        </div>
        {comment && (
          <p className="mt-1 line-clamp-2 text-[12px]" style={{ color: 'var(--text-sub)', lineHeight: 1.5 }}>
            {comment}
          </p>
        )}
        {visitDate && (
          <span className="mt-1 block text-[10px]" style={{ color: 'var(--text-hint)' }}>{visitDate}</span>
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
