'use client'

import { Search, Bell } from 'lucide-react'
import { useAuthContext } from '@/presentation/providers/auth-provider'
import { useNotifications } from '@/application/hooks/use-notifications'

export function HeaderActions() {
  const { user } = useAuthContext()
  const { unreadCount } = useNotifications(user?.id)

  return (
    <div className="flex items-center gap-1">
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
  )
}
