'use client'

import type { ActionStatus } from '@/domain/entities/notification'

interface NotificationActionsProps {
  actionStatus: ActionStatus
  onAccept: () => void
  onReject: () => void
}

export function NotificationActions({ actionStatus, onAccept, onReject }: NotificationActionsProps) {
  if (actionStatus === 'accepted') {
    return (
      <p className="mt-1" style={{ fontSize: '11px', color: 'var(--positive)' }}>
        수락 완료
      </p>
    )
  }

  if (actionStatus === 'rejected') {
    return (
      <p className="mt-1" style={{ fontSize: '11px', color: 'var(--text-hint)' }}>
        거절됨
      </p>
    )
  }

  if (actionStatus !== 'pending') return null

  return (
    <div className="mt-2 flex gap-2">
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onAccept() }}
        className="rounded-md px-2.5 text-[11px] font-semibold"
        style={{ backgroundColor: 'var(--text)', color: 'var(--text-inverse)', paddingTop: '3px', paddingBottom: '3px' }}
      >
        수락
      </button>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onReject() }}
        className="rounded-md px-2.5 text-[11px] font-semibold"
        style={{ border: '1px solid var(--border)', color: 'var(--text-hint)', paddingTop: '3px', paddingBottom: '3px' }}
      >
        거절
      </button>
    </div>
  )
}
