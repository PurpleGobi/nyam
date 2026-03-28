'use client'

import { UserPlus, UserCheck, Users } from 'lucide-react'
import type { AccessLevel } from '@/domain/entities/follow'

interface FollowButtonProps {
  accessLevel: AccessLevel
  onToggle: () => void
  isLoading: boolean
}

const CONFIG: Record<AccessLevel, { label: string; icon: typeof UserPlus; variant: 'cta' | 'muted' | 'positive' }> = {
  none: { label: '팔로우', icon: UserPlus, variant: 'cta' },
  follow: { label: '팔로잉', icon: UserCheck, variant: 'muted' },
  mutual: { label: '맞팔로우', icon: Users, variant: 'positive' },
}

const VARIANT_STYLES: Record<string, { bg: string; color: string; border: string }> = {
  cta: { bg: 'var(--accent-social)', color: '#FFFFFF', border: 'none' },
  muted: { bg: 'var(--bg-section)', color: 'var(--text-sub)', border: '1px solid var(--border)' },
  positive: { bg: 'var(--positive)', color: '#FFFFFF', border: 'none' },
}

export function FollowButton({ accessLevel, onToggle, isLoading }: FollowButtonProps) {
  const { label, icon: Icon, variant } = CONFIG[accessLevel]
  const style = VARIANT_STYLES[variant]

  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={isLoading}
      className="flex items-center gap-1.5 rounded-[10px] px-4 py-[9px] text-[13px] font-bold transition-opacity active:opacity-75 disabled:opacity-50"
      style={{
        backgroundColor: style.bg,
        color: style.color,
        border: style.border,
      }}
    >
      <Icon size={14} />
      {label}
    </button>
  )
}
