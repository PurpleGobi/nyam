'use client'

import { Lock, Users } from 'lucide-react'

interface PremiumGateProps {
  groupName: string
  description: string | null
  memberCount: number
  onRequestAccess: () => void
  isRequesting: boolean
}

/**
 * Displayed when a user does not have access to a premium (viewonly) group.
 * Shows group info and a request-access button.
 */
export function PremiumGate({
  groupName,
  description,
  memberCount,
  onRequestAccess,
  isRequesting,
}: PremiumGateProps) {
  return (
    <div className="flex flex-col items-center justify-center px-4 pt-16 pb-24">
      <div className="flex w-full max-w-sm flex-col items-center gap-5 rounded-2xl border border-[var(--color-neutral-200)] bg-white px-6 py-10">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--color-neutral-100)]">
          <Lock className="h-6 w-6 text-[var(--color-neutral-500)]" />
        </div>

        <div className="flex flex-col items-center gap-1.5">
          <h2 className="text-lg font-bold text-[var(--color-neutral-800)]">
            {groupName}
          </h2>
          {description && (
            <p className="text-center text-sm text-[var(--color-neutral-500)]">
              {description}
            </p>
          )}
        </div>

        <div className="flex items-center gap-1.5 text-sm text-[var(--color-neutral-400)]">
          <Users className="h-4 w-4" />
          <span>{memberCount}명 참여 중</span>
        </div>

        <p className="text-center text-sm font-medium text-[var(--color-neutral-600)]">
          이 버블은 승인이 필요합니다
        </p>

        <button
          type="button"
          onClick={onRequestAccess}
          disabled={isRequesting}
          className="w-full rounded-xl bg-[#FF6038] py-3 text-sm font-medium text-white transition-colors hover:bg-[#e8552f] disabled:opacity-50"
        >
          {isRequesting ? '요청 중...' : '참여 요청'}
        </button>

        <p className="text-center text-xs text-[var(--color-neutral-400)]">
          버블 운영자의 승인 후 참여할 수 있습니다
        </p>
      </div>
    </div>
  )
}
