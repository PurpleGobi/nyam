'use client'

import Image from 'next/image'
import { PencilLine, MapPin } from 'lucide-react'
import type { BubbleMemberRole } from '@/domain/entities/bubble'

export type FollowStatus = 'none' | 'following' | 'follower' | 'mutual'

export interface MemberGridItem {
  userId: string
  nickname: string
  avatarUrl: string | null
  avatarColor: string | null
  level: number
  levelTitle: string
  role: BubbleMemberRole
  isMe: boolean
  followStatus: FollowStatus
  tasteMatchPct: number | null
  recordCount: number
  uniqueTargetCount: number
  badgeLabel: string | null
}

interface MemberGridProps {
  members: MemberGridItem[]
  onMemberClick: (userId: string) => void
  onFollowToggle: (userId: string) => void
}

export function MemberGrid({ members, onMemberClick, onFollowToggle }: MemberGridProps) {
  if (members.length === 0) {
    return <p className="py-6 text-center text-[14px]" style={{ color: 'var(--text-hint)' }}>멤버가 없습니다</p>
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      {members.map((m) => (
        <div
          key={m.userId}
          role="button"
          tabIndex={0}
          onClick={() => onMemberClick(m.userId)}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onMemberClick(m.userId) }}
          className="relative flex cursor-pointer flex-col items-center gap-1.5 rounded-xl p-3"
          style={{
            backgroundColor: m.isMe ? 'var(--accent-social-light)' : 'var(--bg-card)',
            border: m.isMe ? '2px solid var(--accent-social)' : '1px solid var(--border)',
          }}
        >
          {/* 배지 (우상단) */}
          {m.badgeLabel && (
            <span
              className="absolute right-2 top-2 rounded-full px-1.5 py-0.5 text-[9px] font-semibold"
              style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-sub)' }}
            >
              {m.badgeLabel}
            </span>
          )}

          {/* 아바타 48×48 */}
          <div
            className="flex h-12 w-12 items-center justify-center rounded-full text-[16px] font-bold"
            style={{ backgroundColor: m.avatarColor ?? 'var(--accent-social-light)', color: '#FFFFFF' }}
          >
            {m.avatarUrl ? (
              <Image src={m.avatarUrl} alt="" width={48} height={48} className="h-full w-full rounded-full object-cover" />
            ) : (
              m.nickname.charAt(0)
            )}
          </div>

          {/* 이름 */}
          <span className="w-full truncate text-center text-[13px] font-bold" style={{ color: 'var(--text)' }}>
            {m.nickname}
          </span>

          {/* 레벨 pill */}
          <span
            className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
            style={{
              backgroundColor: m.level >= 7 ? 'var(--accent-food-light)' : 'var(--accent-social-light)',
              color: m.level >= 7 ? 'var(--accent-food)' : 'var(--accent-social)',
            }}
          >
            Lv.{m.level} {m.levelTitle}
          </span>

          {/* 일치도 바 */}
          {m.tasteMatchPct !== null && (
            <div className="flex w-full items-center gap-1.5">
              <div className="h-1 flex-1 rounded-full" style={{ backgroundColor: 'var(--border)' }}>
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${m.tasteMatchPct}%`,
                    backgroundColor: m.tasteMatchPct > 70 ? 'var(--positive)' : m.tasteMatchPct >= 60 ? 'var(--accent-social)' : 'var(--text-hint)',
                  }}
                />
              </div>
              <span className="text-[10px] font-semibold" style={{ color: 'var(--text-sub)' }}>{m.tasteMatchPct}%</span>
            </div>
          )}

          {/* 미니 통계 */}
          <div className="flex items-center gap-2 text-[10px]" style={{ color: 'var(--text-hint)' }}>
            <span className="flex items-center gap-0.5">
              <PencilLine size={10} />
              {m.recordCount}개
            </span>
            <span className="flex items-center gap-0.5">
              <MapPin size={10} />
              {m.uniqueTargetCount}곳
            </span>
          </div>

          {/* 팔로우 버튼 */}
          {!m.isMe && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onFollowToggle(m.userId) }}
              className="mt-0.5 w-full rounded-lg py-1.5 text-[11px] font-semibold"
              style={getFollowButtonStyle(m.followStatus)}
            >
              {getFollowLabel(m.followStatus)}
            </button>
          )}
          {m.isMe && (
            <span className="mt-0.5 w-full rounded-lg py-1.5 text-center text-[11px] font-semibold opacity-50" style={{ color: 'var(--text-hint)' }}>
              나
            </span>
          )}
        </div>
      ))}
    </div>
  )
}

function getFollowButtonStyle(status: FollowStatus): React.CSSProperties {
  switch (status) {
    case 'mutual':
      return { backgroundColor: 'var(--positive-light)', color: 'var(--positive)', border: '1px solid var(--positive)' }
    case 'following':
      return { backgroundColor: 'transparent', color: 'var(--text-sub)', border: '1px solid var(--border)' }
    default:
      return { backgroundColor: 'var(--accent-social)', color: '#FFFFFF' }
  }
}

function getFollowLabel(status: FollowStatus): string {
  switch (status) {
    case 'mutual': return '맞팔'
    case 'following': return '팔로잉'
    case 'follower': return '팔로우'
    default: return '팔로우'
  }
}
