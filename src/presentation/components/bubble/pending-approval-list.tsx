'use client'

import Image from 'next/image'
import { Check, X } from 'lucide-react'

export interface PendingMemberInfo {
  userId: string
  nickname: string
  avatarUrl: string | null
  avatarColor: string | null
  level: number
  recordCount: number
  tasteMatchPct: number | null
  joinedAt: string
}

interface PendingApprovalListProps {
  members: PendingMemberInfo[]
  onApprove: (userId: string) => void
  onReject: (userId: string) => void
  maxPreview?: number
  onViewAll?: () => void
}

export function PendingApprovalList({ members, onApprove, onReject, maxPreview = 3, onViewAll }: PendingApprovalListProps) {
  if (members.length === 0) {
    return <p className="py-6 text-center text-[13px] text-[var(--text-hint)]">대기 중인 멤버가 없습니다</p>
  }

  const displayed = members.slice(0, maxPreview)

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <p className="text-[13px] font-semibold text-[var(--text)]">
          대기 중 ({members.length})
        </p>
        {members.length > maxPreview && onViewAll && (
          <button
            type="button"
            onClick={onViewAll}
            className="text-[12px] font-medium"
            style={{ color: 'var(--accent-social)' }}
          >
            전체보기
          </button>
        )}
      </div>
      {displayed.map((m) => (
        <div
          key={m.userId}
          className="flex items-center gap-3 rounded-xl p-3"
          style={{ backgroundColor: 'var(--bg)', border: '1px solid var(--border)' }}
        >
          {/* 아바타 */}
          {m.avatarUrl ? (
            <Image
              src={m.avatarUrl}
              alt={m.nickname}
              width={36}
              height={36}
              className="h-9 w-9 shrink-0 rounded-full object-cover"
            />
          ) : (
            <div
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[12px] font-bold text-white"
              style={{ backgroundColor: m.avatarColor ?? 'var(--accent-social)' }}
            >
              {m.nickname.charAt(0)}
            </div>
          )}

          {/* 정보 */}
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-semibold text-[var(--text)]">
              {m.nickname}
              <span className="ml-1 text-[11px] font-normal text-[var(--text-hint)]">Lv.{m.level}</span>
            </p>
            <p className="text-[11px] text-[var(--text-hint)]">
              기록 {m.recordCount}개
              {m.tasteMatchPct !== null && <span> · 일치도 {m.tasteMatchPct}%</span>}
            </p>
          </div>

          {/* 거절/승인 버튼 */}
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={() => onReject(m.userId)}
              className="flex h-8 w-8 items-center justify-center rounded-full"
              style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}
            >
              <X size={14} style={{ color: 'var(--text-sub)' }} />
            </button>
            <button
              type="button"
              onClick={() => onApprove(m.userId)}
              className="flex h-8 w-8 items-center justify-center rounded-full"
              style={{ backgroundColor: 'var(--positive)', color: '#FFFFFF' }}
            >
              <Check size={14} />
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
