'use client'

import Link from 'next/link'
import { Users } from 'lucide-react'
import type { GroupRole } from '@/domain/entities/group'

interface GroupMemberListProps {
  members: Array<{ userId: string; role: GroupRole; joinedAt: string }>
  currentUserId?: string
}

const ROLE_CONFIG: Record<GroupRole, { label: string; className: string }> = {
  owner: { label: '방장', className: 'bg-red-50 text-red-600 border-red-200' },
  admin: { label: '관리자', className: 'bg-blue-50 text-blue-600 border-blue-200' },
  member: { label: '멤버', className: 'bg-gray-50 text-gray-600 border-gray-200' },
}

export function GroupMemberList({ members, currentUserId }: GroupMemberListProps) {
  if (members.length === 0) {
    return (
      <p className="py-4 text-center text-sm text-[var(--color-neutral-400)]">
        멤버가 없습니다
      </p>
    )
  }

  return (
    <ul className="flex flex-col gap-2">
      {members.map((member) => {
        const config = ROLE_CONFIG[member.role]
        const isCurrentUser = member.userId === currentUserId
        return (
          <li
            key={member.userId}
            className="flex items-center justify-between rounded-lg border border-[var(--color-neutral-200)] bg-white px-4 py-3"
          >
            <div className="flex flex-col">
              <span className="text-sm font-medium text-[var(--color-neutral-800)]">
                {member.userId}
              </span>
              <span className="mt-0.5 text-xs text-[var(--color-neutral-400)]">
                {new Date(member.joinedAt).toLocaleDateString('ko-KR')}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {!isCurrentUser && (
                <Link
                  href={`/compatibility?with=${member.userId}`}
                  className="flex h-7 items-center gap-1 rounded-full border border-[#FF6038]/20 bg-[#FF6038]/5 px-2.5 text-xs font-medium text-[#FF6038] transition-colors hover:bg-[#FF6038]/10"
                >
                  <Users className="h-3.5 w-3.5" />
                  <span>궁합</span>
                </Link>
              )}
              <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${config.className}`}>
                {config.label}
              </span>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
