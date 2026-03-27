'use client'

import { UserPlus, UserCheck, Users } from 'lucide-react'
import type { AccessLevel } from '@/domain/entities/follow'

interface FollowButtonProps {
  accessLevel: AccessLevel
  onToggle: () => void
  isLoading: boolean
}

const CONFIG: Record<AccessLevel, { label: string; icon: typeof UserPlus; filled: boolean }> = {
  none: { label: '팔로우', icon: UserPlus, filled: true },
  follow: { label: '팔로잉', icon: UserCheck, filled: false },
  mutual: { label: '맞팔로우', icon: Users, filled: false },
}

export function FollowButton({ accessLevel, onToggle, isLoading }: FollowButtonProps) {
  const { label, icon: Icon, filled } = CONFIG[accessLevel]

  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={isLoading}
      className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-[13px] font-semibold transition-colors disabled:opacity-50"
      style={{
        backgroundColor: filled ? 'var(--accent-social)' : 'transparent',
        color: filled ? '#FFFFFF' : 'var(--accent-social)',
        border: filled ? 'none' : '1.5px solid var(--accent-social)',
      }}
    >
      <Icon size={14} />
      {label}
    </button>
  )
}
