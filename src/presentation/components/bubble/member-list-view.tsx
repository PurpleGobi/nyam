'use client'

import { Shield, Crown } from 'lucide-react'
import type { BubbleMember } from '@/domain/entities/bubble'

interface MemberListViewProps {
  members: BubbleMember[]
  onSelect?: (userId: string) => void
}

const ROLE_CONFIG: Record<string, { label: string; icon: typeof Crown; color: string }> = {
  owner: { label: '방장', icon: Crown, color: 'var(--accent-food)' },
  admin: { label: '관리자', icon: Shield, color: 'var(--accent-social)' },
}

export function MemberListView({ members, onSelect }: MemberListViewProps) {
  if (members.length === 0) {
    return <p className="py-6 text-center text-[14px] text-[var(--text-hint)]">멤버가 없습니다</p>
  }

  return (
    <div className="flex flex-col gap-1.5">
      {members.map((m) => {
        const roleConfig = ROLE_CONFIG[m.role]
        return (
          <button
            key={m.userId}
            type="button"
            onClick={() => onSelect?.(m.userId)}
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-left"
            style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}
          >
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[13px] font-bold"
              style={{ backgroundColor: 'var(--accent-social-light)', color: 'var(--accent-social)' }}
            >
              {m.userId.substring(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[14px] font-semibold text-[var(--text)]">
                {m.userId.substring(0, 8)}
              </p>
              <p className="text-[11px] text-[var(--text-hint)]">
                기록 {m.memberUniqueTargetCount}곳 · 평균 {m.avgSatisfaction?.toFixed(1) ?? '-'}
              </p>
            </div>
            {roleConfig && (
              <span
                className="flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-semibold"
                style={{ backgroundColor: `${roleConfig.color}15`, color: roleConfig.color }}
              >
                <roleConfig.icon size={11} />
                {roleConfig.label}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
