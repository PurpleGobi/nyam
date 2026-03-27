'use client'

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
    <div
      className="flex items-center gap-1 rounded-full px-2 py-0.5"
      style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border)' }}
    >
      {sourceType === 'bubble' ? (
        <span className="text-[10px]">{sourceIcon ?? '🫧'}</span>
      ) : (
        <div
          className="flex h-4 w-4 items-center justify-center rounded-full text-[8px] font-bold"
          style={{ backgroundColor: sourceAvatarColor ?? 'var(--accent-social-light)', color: '#FFFFFF' }}
        >
          {sourceAvatar ? (
            <img src={sourceAvatar} alt="" className="h-full w-full rounded-full object-cover" />
          ) : (
            sourceName.charAt(0)
          )}
        </div>
      )}
      <span className="max-w-[60px] truncate text-[10px] font-medium" style={{ color: 'var(--text-sub)' }}>
        {sourceName}
      </span>
    </div>
  )
}
