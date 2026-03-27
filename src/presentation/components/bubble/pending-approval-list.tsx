'use client'

import { Check, X } from 'lucide-react'
import type { BubbleMember } from '@/domain/entities/bubble'

interface PendingApprovalListProps {
  pendingMembers: BubbleMember[]
  onApprove: (userId: string) => void
  onReject: (userId: string) => void
}

export function PendingApprovalList({ pendingMembers, onApprove, onReject }: PendingApprovalListProps) {
  if (pendingMembers.length === 0) {
    return <p className="py-6 text-center text-[13px] text-[var(--text-hint)]">대기 중인 멤버가 없습니다</p>
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-[13px] font-semibold text-[var(--text)]">
        가입 대기 ({pendingMembers.length})
      </p>
      {pendingMembers.map((m) => (
        <div
          key={m.userId}
          className="flex items-center gap-3 rounded-xl p-3"
          style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}
        >
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[12px] font-bold"
            style={{ backgroundColor: 'var(--accent-social-light)', color: 'var(--accent-social)' }}
          >
            {m.userId.substring(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-semibold text-[var(--text)]">{m.userId.substring(0, 8)}</p>
            <p className="text-[11px] text-[var(--text-hint)]">
              {new Date(m.joinedAt).toLocaleDateString('ko-KR')}
            </p>
          </div>
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={() => onApprove(m.userId)}
              className="flex h-8 w-8 items-center justify-center rounded-lg"
              style={{ backgroundColor: 'var(--positive)', color: '#FFFFFF' }}
            >
              <Check size={16} />
            </button>
            <button
              type="button"
              onClick={() => onReject(m.userId)}
              className="flex h-8 w-8 items-center justify-center rounded-lg"
              style={{ backgroundColor: 'var(--bg)', border: '1px solid var(--border)' }}
            >
              <X size={16} style={{ color: 'var(--negative)' }} />
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
