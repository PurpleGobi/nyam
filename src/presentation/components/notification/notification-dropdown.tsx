'use client'

import { useRef, useState, useEffect, useCallback, type RefObject } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2, CheckSquare, Square, CheckCircle2 } from 'lucide-react'
import type { Notification } from '@/domain/entities/notification'
import { NOTIFICATION_TYPE_CONFIG } from '@/domain/entities/notification'
import { NotificationIcon } from '@/presentation/components/notification/notification-icon'
import { NotificationActions } from '@/presentation/components/notification/notification-actions'
import { NotificationEmpty } from '@/presentation/components/notification/notification-empty'
import { PopupWindow } from '@/presentation/components/ui/popup-window'
import { formatTimeAgo } from '@/shared/utils/date-format'

const DROPDOWN_PADDING = 12

function calcPosition(anchorEl: HTMLElement | null) {
  if (!anchorEl) return { top: 56, left: 0 }
  const rect = anchorEl.getBoundingClientRect()
  const dropdownWidth = Math.min(360, window.innerWidth - DROPDOWN_PADDING * 2)
  const bellCenter = rect.left + rect.width / 2
  const idealLeft = bellCenter - dropdownWidth / 2
  const maxLeft = window.innerWidth - dropdownWidth - DROPDOWN_PADDING
  return {
    top: rect.bottom + 8,
    left: Math.max(DROPDOWN_PADDING, Math.min(idealLeft, maxLeft)),
  }
}

interface NotificationDropdownProps {
  isOpen: boolean
  onClose: () => void
  notifications: Notification[]
  unreadCount: number
  onMarkAsRead: (id: string) => void
  onMarkAllAsRead: () => void
  onAction: (id: string, status: 'accepted' | 'rejected') => void
  onNavigate?: (notification: Notification) => void
  anchorRef: RefObject<HTMLDivElement | null>
  isSelectMode: boolean
  selectedIds: Set<string>
  onToggleSelectMode: () => void
  onToggleSelect: (id: string) => void
  onSelectAll: () => void
  onDeleteSelected: () => void
}

export function NotificationDropdown({
  isOpen, onClose, notifications, unreadCount,
  onMarkAsRead, onMarkAllAsRead, onAction, onNavigate, anchorRef,
  isSelectMode, selectedIds, onToggleSelectMode, onToggleSelect, onSelectAll, onDeleteSelected,
}: NotificationDropdownProps) {
  const ref = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const [pos, setPos] = useState({ top: 56, left: 0 })

  const updatePos = useCallback(() => {
    setPos(calcPosition(anchorRef.current))
  }, [anchorRef])

  useEffect(() => {
    if (!isOpen) return
    updatePos()
    window.addEventListener('resize', updatePos)
    return () => window.removeEventListener('resize', updatePos)
  }, [isOpen, updatePos])

  const handleItemClick = (n: Notification) => {
    if (isSelectMode) {
      onToggleSelect(n.id)
      return
    }
    if (!n.isRead) onMarkAsRead(n.id)
    if (n.actionStatus === 'pending') return

    if (onNavigate) {
      onNavigate(n)
    } else {
      const config = NOTIFICATION_TYPE_CONFIG[n.type]
      if (config.navigationTarget === 'profile') router.push('/profile')
      else if (config.navigationTarget === 'bubble_detail' && n.bubbleId) router.push(`/bubbles/${n.bubbleId}`)
      else if (config.navigationTarget === 'actor_profile' && n.actorId) router.push(`/bubbler/${n.actorId}`)
      else if (config.navigationTarget === 'record_detail' && n.bubbleId) router.push(`/bubbles/${n.bubbleId}`)
    }
    onClose()
  }

  const allSelected = notifications.length > 0 && selectedIds.size === notifications.length

  return (
    <PopupWindow isOpen={isOpen} onClose={onClose}>
      <div
        ref={ref}
        className="notif-dropdown"
        style={{ position: 'fixed', top: `${pos.top}px`, left: `${pos.left}px` }}
      >
        {/* 헤더 */}
        <div className="notif-header" style={{ borderBottom: '1px solid var(--border)' }}>
          <span className="notif-header-title">알림</span>
          <div className="flex items-center gap-2">
            {isSelectMode ? (
              <>
                <button type="button" onClick={onSelectAll} className="notif-header-action flex items-center gap-1">
                  {allSelected ? <CheckSquare size={14} /> : <Square size={14} />}
                  전체선택
                </button>
                <button
                  type="button"
                  onClick={onDeleteSelected}
                  disabled={selectedIds.size === 0}
                  className="notif-header-action flex items-center gap-1"
                  style={{ color: selectedIds.size > 0 ? 'var(--negative)' : 'var(--text-hint)' }}
                >
                  <Trash2 size={14} />
                  삭제 {selectedIds.size > 0 && `(${selectedIds.size})`}
                </button>
                <button type="button" onClick={onToggleSelectMode} className="notif-header-action">
                  취소
                </button>
              </>
            ) : (
              <>
                {unreadCount > 0 && (
                  <button type="button" onClick={onMarkAllAsRead} className="notif-header-action">
                    모두 읽음
                  </button>
                )}
                {notifications.length > 0 && (
                  <button type="button" onClick={onToggleSelectMode} className="notif-header-action">
                    선택
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {/* 목록 */}
        <div className="flex-1 overflow-y-auto">
          {notifications.length === 0 ? (
            <NotificationEmpty />
          ) : (
            notifications.map((n) => (
              <div
                key={n.id}
                role="button"
                tabIndex={0}
                onClick={() => handleItemClick(n)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleItemClick(n) }}
                className={`notif-item w-full text-left ${!n.isRead ? 'unread' : ''}`}
                style={{
                  cursor: 'pointer',
                  backgroundColor: isSelectMode && selectedIds.has(n.id)
                    ? 'color-mix(in srgb, var(--accent-food) 12%, transparent)'
                    : n.isRead ? 'transparent' : 'color-mix(in srgb, var(--accent-food) 5%, transparent)',
                  borderBottom: '1px solid var(--border)',
                }}
              >
                {isSelectMode ? (
                  <div className="mt-0.5 flex-shrink-0" style={{ color: selectedIds.has(n.id) ? 'var(--accent-food)' : 'var(--text-hint)' }}>
                    {selectedIds.has(n.id) ? <CheckCircle2 size={20} /> : <div className="rounded-full border-2" style={{ width: 20, height: 20, borderColor: 'var(--border)' }} />}
                  </div>
                ) : (
                  <div className="notif-icon mt-0.5">
                    <NotificationIcon type={n.type} />
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  <p className="notif-title">{n.title}</p>
                  {n.body && <p className="notif-body mt-0.5">{n.body}</p>}
                  <p className="notif-time mt-0.5">{formatTimeAgo(n.createdAt)}</p>

                  {!isSelectMode && (
                    <NotificationActions
                      actionStatus={n.actionStatus}
                      onAccept={() => onAction(n.id, 'accepted')}
                      onReject={() => onAction(n.id, 'rejected')}
                    />
                  )}
                </div>

                {!isSelectMode && !n.isRead && <div className="notif-unread-dot mt-2" />}
              </div>
            ))
          )}
        </div>

        {/* 푸터 */}
        <div className="notif-footer" style={{ borderTop: '1px solid var(--border)' }}>
          <button type="button" onClick={() => { router.push('/settings'); onClose() }} className="notif-footer">
            알림 설정 →
          </button>
        </div>
      </div>
    </PopupWindow>
  )
}

