'use client'

import { Search, Bell } from 'lucide-react'

export function HomeHeader({ unreadCount }: { unreadCount: number }) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <span
        className="text-2xl font-bold tracking-tight text-[var(--color-primary-500)]"
        style={{ fontFamily: 'var(--font-logo)' }}
      >
        nyam
      </span>
      <div className="flex items-center gap-3">
        <button
          type="button"
          className="rounded-full p-2 text-[var(--color-neutral-600)] transition-colors hover:bg-[var(--color-neutral-100)]"
        >
          <Search className="h-5 w-5" />
        </button>
        <button
          type="button"
          className="relative rounded-full p-2 text-[var(--color-neutral-600)] transition-colors hover:bg-[var(--color-neutral-100)]"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-[var(--color-primary-500)]" />
          )}
        </button>
      </div>
    </div>
  )
}
