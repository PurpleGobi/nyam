'use client'

import type { FriendFeedItem } from '@/domain/entities/friend-feed'

export function FriendsFeedCard({ items }: { items: FriendFeedItem[] }) {
  if (items.length === 0) return null

  return (
    <div className="rounded-2xl bg-white p-4 shadow-[var(--shadow-sm)]">
      <h3 className="mb-3 text-sm font-semibold text-[var(--color-neutral-800)]">
        친구들 소식
      </h3>
      <div className="flex flex-col">
        {items.map((item, index) => (
          <div key={item.id}>
            <div className="flex items-start gap-3 py-2.5">
              {/* Avatar */}
              <div
                className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
                style={{ backgroundColor: item.avatarColor }}
              >
                {item.avatarInitial}
              </div>

              {/* Content */}
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-[var(--color-neutral-800)]">
                    {item.restaurantName}
                  </span>
                  <span className="ml-2 flex-shrink-0 text-sm font-semibold text-[var(--color-primary-500)]">
                    {item.ratingOverall}
                  </span>
                </div>
                {item.comment && (
                  <p className="truncate text-xs italic text-[var(--color-neutral-500)]">
                    {item.comment}
                  </p>
                )}
                <span className="text-[11px] text-[var(--color-neutral-400)]">
                  {item.nickname} · {item.groupName} · {item.area}
                </span>
              </div>
            </div>

            {/* Divider (except last) */}
            {index < items.length - 1 && (
              <div className="ml-10 border-b border-[var(--color-neutral-100)]" />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
