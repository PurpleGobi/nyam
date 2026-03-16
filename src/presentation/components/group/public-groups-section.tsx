'use client'

import { Globe, Users } from 'lucide-react'

interface PublicGroupsSectionProps {
  groups: Array<{
    id: string
    name: string
    description: string | null
    type: string
    memberCount: number
  }>
  isLoading: boolean
  onJoin: (groupId: string) => void
  isJoining: boolean
}

export function PublicGroupsSection({ groups, isLoading, onJoin, isJoining }: PublicGroupsSectionProps) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Globe className="h-4 w-4 text-[var(--color-neutral-500)]" />
        <h3 className="text-sm font-semibold text-[var(--color-neutral-700)]">
          공개 그룹 둘러보기
        </h3>
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl bg-[var(--color-neutral-100)]" />
          ))}
        </div>
      ) : groups.length === 0 ? (
        <p className="py-6 text-center text-sm text-[var(--color-neutral-400)]">
          공개 그룹이 아직 없습니다
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {groups.map((group) => (
            <li
              key={group.id}
              className="flex items-center justify-between rounded-xl border border-[var(--color-neutral-200)] bg-white px-4 py-3"
            >
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-medium text-[var(--color-neutral-800)]">
                  {group.name}
                </span>
                {group.description && (
                  <span className="line-clamp-1 text-xs text-[var(--color-neutral-500)]">
                    {group.description}
                  </span>
                )}
                <div className="flex items-center gap-1 text-xs text-[var(--color-neutral-400)]">
                  <Users className="h-3 w-3" />
                  <span>{group.memberCount}명</span>
                </div>
              </div>
              <button
                type="button"
                disabled={isJoining}
                onClick={() => onJoin(group.id)}
                className="shrink-0 rounded-lg bg-[#FF6038] px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-[#e8552f] active:bg-[#d44a27] disabled:opacity-50"
              >
                {isJoining ? '...' : '참여하기'}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
