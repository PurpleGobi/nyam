'use client'

import Image from 'next/image'
import { BubbleIcon } from '@/presentation/components/bubble/bubble-icon'

interface FollowingSourceBadgeProps {
  sourceType: 'bubble' | 'user'
  sourceName: string
  sourceIcon: string | null
  sourceAvatar: string | null
  sourceAvatarColor: string | null
}

export function FollowingSourceBadge({
  sourceType,
  sourceName,
  sourceIcon,
  sourceAvatar,
  sourceAvatarColor,
}: FollowingSourceBadgeProps) {
  return (
    <div className="flex items-center gap-1.5">
      {sourceType === 'bubble' ? (
        <div className="flex h-4 w-4 shrink-0 items-center justify-center overflow-hidden rounded">
          <BubbleIcon icon={sourceIcon} size={16} />
        </div>
      ) : (
        <div
          className="flex h-4 w-4 items-center justify-center rounded-full text-[8px] font-bold"
          style={{ backgroundColor: sourceAvatarColor ?? 'var(--accent-social-light)', color: 'var(--text-inverse)' }}
        >
          {sourceAvatar ? (
            <Image src={sourceAvatar} alt="" width={16} height={16} className="h-full w-full rounded-full object-cover" />
          ) : (
            sourceName.charAt(0)
          )}
        </div>
      )}
      <span
        className="max-w-[60px] truncate text-[11px] font-semibold"
        style={{ color: sourceType === 'bubble' ? 'var(--accent-social)' : 'var(--text-sub)' }}
      >
        {sourceName}
      </span>
    </div>
  )
}
