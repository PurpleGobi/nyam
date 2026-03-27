'use client'

import { useEffect, useRef } from 'react'
import { Bell, Check, Trophy, UserPlus, CheckCircle, UserCheck } from 'lucide-react'
import type { Notification, ActionStatus, NotificationType } from '@/domain/entities/notification'

const NOTIF_ICON_MAP: Record<NotificationType, { icon: typeof Bell; color: string }> = {
  level_up: { icon: Trophy, color: '#C9A96E' },
  bubble_join_request: { icon: UserPlus, color: '#7A9BAE' },
  bubble_join_approved: { icon: CheckCircle, color: '#7EAE8B' },
  follow_request: { icon: UserPlus, color: '#8B7396' },
  follow_accepted: { icon: UserCheck, color: '#7EAE8B' },
  bubble_invite: { icon: Bell, color: '#7A9BAE' },
  bubble_new_record: { icon: Bell, color: '#C17B5E' },
  bubble_member_joined: { icon: UserPlus, color: '#7A9BAE' },
  reaction_like: { icon: Bell, color: '#B87272' },
  comment_reply: { icon: Bell, color: '#8B7396' },
}

interface NotificationDropdownProps {
  isOpen: boolean
  onClose: () => void
  notifications: Notification[]
  unreadCount: number
  onMarkAsRead: (id: string) => void
  onMarkAllAsRead: () => void
  onAction: (id: string, status: ActionStatus) => void
}

export function NotificationDropdown({
  isOpen, onClose, notifications, unreadCount, onMarkAsRead, onMarkAllAsRead, onAction,
}: NotificationDropdownProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <>
      <div className="fixed inset-0 z-[190]" style={{ backgroundColor: 'rgba(0,0,0,0.15)', backdropFilter: 'blur(4px)' }} onClick={onClose} />
      <div
        ref={ref}
        className="fixed right-4 z-[200] flex flex-col overflow-hidden"
        style={{
          top: '90px',
          width: '300px',
          maxHeight: '400px',
          backgroundColor: 'var(--bg-elevated)',
          borderRadius: '14px',
          boxShadow: 'var(--shadow-lg)',
          animation: 'dropdown-in 0.16s ease',
        }}
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
          <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text)' }}>알림</span>
          {unreadCount > 0 && (
            <button type="button" onClick={onMarkAllAsRead} className="flex items-center gap-1 text-[12px]" style={{ color: 'var(--accent-food)' }}>
              <Check size={12} /> 모두 읽음
            </button>
          )}
        </div>

        {/* 목록 */}
        <div className="flex-1 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center py-10">
              <Bell size={28} style={{ color: 'var(--text-hint)' }} />
              <p className="mt-2" style={{ fontSize: '13px', color: 'var(--text-hint)' }}>아직 알림이 없어요</p>
            </div>
          ) : (
            notifications.map((n) => (
              <button
                key={n.id}
                type="button"
                onClick={() => {
                  if (!n.isRead) onMarkAsRead(n.id)
                }}
                className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors"
                style={{
                  backgroundColor: n.isRead ? 'transparent' : 'color-mix(in srgb, var(--accent-food) 5%, transparent)',
                  borderBottom: '1px solid var(--border)',
                }}
              >
                <div
                  className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
                  style={{ backgroundColor: `${NOTIF_ICON_MAP[n.notificationType]?.color ?? 'var(--text-sub)'}15` }}
                >
                  {(() => {
                    const config = NOTIF_ICON_MAP[n.notificationType]
                    const Icon = config?.icon ?? Bell
                    return <Icon size={14} style={{ color: config?.color ?? 'var(--text-sub)' }} />
                  })()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] text-[var(--text)]">{formatNotification(n)}</p>
                  <p className="mt-0.5 text-[11px] text-[var(--text-hint)]">{formatTimeAgo(n.createdAt)}</p>

                  {n.actionStatus === 'pending' && (
                    <div className="mt-2 flex gap-2">
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); onAction(n.id, 'accepted') }}
                        className="rounded-lg px-3 py-1 text-[12px] font-semibold"
                        style={{ backgroundColor: 'var(--accent-food)', color: '#FFFFFF' }}
                      >
                        수락
                      </button>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); onAction(n.id, 'rejected') }}
                        className="rounded-lg px-3 py-1 text-[12px] font-semibold"
                        style={{ border: '1px solid var(--border)', color: 'var(--text-sub)' }}
                      >
                        거절
                      </button>
                    </div>
                  )}
                  {n.actionStatus === 'accepted' && (
                    <p className="mt-1 text-[11px]" style={{ color: 'var(--positive)' }}>수락 완료</p>
                  )}
                  {n.actionStatus === 'rejected' && (
                    <p className="mt-1 text-[11px]" style={{ color: 'var(--text-hint)' }}>거절됨</p>
                  )}
                </div>
                {!n.isRead && (
                  <div className="mt-2 h-[7px] w-[7px] shrink-0 rounded-full" style={{ backgroundColor: 'var(--negative)' }} />
                )}
              </button>
            ))
          )}
        </div>
      </div>
    </>
  )
}

function formatNotification(n: Notification): string {
  const meta = n.metadata as Record<string, string> | null
  switch (n.notificationType) {
    case 'level_up': return `${meta?.axis ?? ''} 레벨 ${meta?.level ?? ''} 달성!`
    case 'bubble_join_request': return `${meta?.nickname ?? ''}님이 가입 신청`
    case 'bubble_join_approved': return `가입이 승인되었습니다`
    case 'follow_request': return `${meta?.nickname ?? ''}님이 팔로우 요청`
    case 'follow_accepted': return `${meta?.nickname ?? ''}님이 팔로우 수락`
    default: return '새 알림'
  }
}

function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return '방금'
  if (mins < 60) return `${mins}분 전`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}시간 전`
  const days = Math.floor(hours / 24)
  return `${days}일 전`
}
