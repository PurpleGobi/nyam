'use client'

import { X, Users, Lock } from 'lucide-react'
import type { OnboardingSeedBubble } from '@/domain/entities/onboarding'

interface BubbleExplorePopupProps {
  bubble: OnboardingSeedBubble | null
  userLevel: number
  isOpen: boolean
  onClose: () => void
  onJoin: (bubbleId: string) => void
}

export function BubbleExplorePopup({ bubble, userLevel, isOpen, onClose, onJoin }: BubbleExplorePopupProps) {
  if (!isOpen || !bubble) return null

  const isLocked = bubble.minLevel > userLevel
  const canJoin = !isLocked && (bubble.joinPolicy === 'open' || bubble.joinPolicy === 'auto_approve')

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div
        className="w-full max-w-[430px] rounded-t-2xl pb-8"
        style={{ backgroundColor: 'var(--bg-elevated)' }}
      >
        <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
          <span className="text-[15px] font-bold" style={{ color: 'var(--text)' }}>버블 상세</span>
          <button type="button" onClick={onClose}>
            <X size={20} style={{ color: 'var(--text-sub)' }} />
          </button>
        </div>

        <div className="flex flex-col items-center px-6 py-6">
          <div
            className="flex h-16 w-16 items-center justify-center rounded-2xl text-[28px]"
            style={{ backgroundColor: bubble.iconBgColor }}
          >
            {bubble.icon}
          </div>
          <h3 className="mt-3 text-[18px] font-bold" style={{ color: 'var(--text)' }}>{bubble.name}</h3>
          <p className="mt-2 text-center text-[13px]" style={{ color: 'var(--text-sub)', lineHeight: 1.6 }}>
            {bubble.description}
          </p>

          <div className="mt-4 flex items-center gap-4">
            <div className="flex items-center gap-1">
              <Users size={14} style={{ color: 'var(--text-hint)' }} />
              <span className="text-[12px]" style={{ color: 'var(--text-sub)' }}>{bubble.memberCount}명</span>
            </div>
            {bubble.minLevel > 0 && (
              <div className="flex items-center gap-1">
                <Lock size={14} style={{ color: isLocked ? 'var(--accent-wine)' : 'var(--text-hint)' }} />
                <span className="text-[12px]" style={{ color: isLocked ? 'var(--accent-wine)' : 'var(--text-sub)' }}>
                  Lv.{bubble.minLevel} 이상
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="px-6">
          {isLocked ? (
            <div className="flex flex-col items-center gap-2">
              <p className="text-[13px] font-semibold" style={{ color: 'var(--accent-wine)' }}>
                레벨이 부족합니다 (현재 Lv.{userLevel})
              </p>
              <button
                type="button"
                onClick={onClose}
                className="w-full rounded-xl py-3 text-[14px] font-semibold"
                style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-sub)', border: '1px solid var(--border)' }}
              >
                닫기
              </button>
            </div>
          ) : canJoin ? (
            <button
              type="button"
              onClick={() => onJoin(bubble.id)}
              className="w-full rounded-xl py-3 text-[15px] font-semibold"
              style={{ backgroundColor: 'var(--accent-social)', color: '#FFFFFF' }}
            >
              가입하기
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="w-full rounded-xl py-3 text-[14px] font-semibold"
              style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-sub)', border: '1px solid var(--border)' }}
            >
              승인 대기 필요
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
