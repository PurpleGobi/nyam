'use client'

import type { BubbleMember } from '@/domain/entities/bubble'

interface MemberGridProps {
  members: BubbleMember[]
  onSelect?: (userId: string) => void
}

export function MemberGrid({ members, onSelect }: MemberGridProps) {
  if (members.length === 0) {
    return <p className="py-6 text-center text-[14px] text-[var(--text-hint)]">멤버가 없습니다</p>
  }

  return (
    <div className="grid grid-cols-4 gap-3">
      {members.map((m) => (
        <button
          key={m.userId}
          type="button"
          onClick={() => onSelect?.(m.userId)}
          className="flex flex-col items-center gap-1.5"
        >
          <div
            className="flex h-14 w-14 items-center justify-center rounded-full text-[14px] font-bold"
            style={{ backgroundColor: 'var(--accent-social-light)', color: 'var(--accent-social)' }}
          >
            {m.userId.substring(0, 2).toUpperCase()}
          </div>
          <span className="w-full truncate text-center text-[11px] text-[var(--text)]">
            {m.userId.substring(0, 6)}
          </span>
          {m.role !== 'member' && (
            <span
              className="rounded-full px-1.5 py-0.5 text-[9px] font-semibold"
              style={{
                backgroundColor: m.role === 'owner' ? 'var(--accent-food-light)' : 'var(--accent-social-light)',
                color: m.role === 'owner' ? 'var(--accent-food)' : 'var(--accent-social)',
              }}
            >
              {m.role === 'owner' ? '방장' : m.role === 'admin' ? '관리자' : m.role}
            </span>
          )}
        </button>
      ))}
    </div>
  )
}
