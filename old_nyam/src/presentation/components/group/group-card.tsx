'use client'

import { cn } from '@/shared/utils/cn'
import type { GroupType } from '@/domain/entities/group'

const TYPE_ICONS: Record<GroupType, string> = {
  private: '\uD83D\uDD12',
  public: '\uD83C\uDF10',
  viewonly: '\uD83D\uDC41',
  paid: '\uD83D\uDC8E',
}

function formatRelativeTime(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime()
  const minutes = Math.floor(diff / 60_000)
  if (minutes < 1) return '방금 전'
  if (minutes < 60) return `${minutes}분 전`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}시간 전`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}일 전`
  const months = Math.floor(days / 30)
  return `${months}개월 전`
}

interface GroupCardProps {
  name: string
  type: GroupType
  memberCount: number
  recordCount: number
  lastActivityAt?: string
  topCategories?: string[]
  onTap?: () => void
  className?: string
}

export function GroupCard({
  name,
  type,
  memberCount,
  recordCount,
  lastActivityAt,
  topCategories,
  onTap,
  className,
}: GroupCardProps) {
  return (
    <div
      className={cn(
        'bg-white rounded-xl border border-neutral-100 shadow-sm p-4',
        onTap && 'cursor-pointer',
        className,
      )}
      onClick={onTap}
    >
      <div className="flex items-center justify-between">
        <span className="font-semibold text-base text-[#334E68] truncate">
          {name}
        </span>
        <span className="text-base flex-shrink-0 ml-2">
          {TYPE_ICONS[type]}
        </span>
      </div>

      <p className="text-sm text-neutral-500 mt-1">
        멤버 {memberCount}명 &middot; 기록 {recordCount}개
      </p>

      {lastActivityAt && (
        <p className="text-xs text-neutral-400 mt-1">
          최근 활동: {formatRelativeTime(lastActivityAt)}
        </p>
      )}

      {topCategories && topCategories.length > 0 && (
        <p className="text-xs text-neutral-400 mt-1">
          인기: {topCategories.join(', ')}
        </p>
      )}

      <button
        type="button"
        className="w-full mt-3 text-sm font-medium bg-[#FF6038] text-white rounded-lg py-2 text-center transition-colors hover:bg-[#e8552f] active:bg-[#d44a27]"
        onClick={(e) => {
          e.stopPropagation()
        }}
      >
        {type === 'paid' ? '\u20A9 구독하기' : '참여하기'}
      </button>
    </div>
  )
}
