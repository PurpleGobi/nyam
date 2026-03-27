'use client'

import { X, Users, Utensils } from 'lucide-react'
import type { Bubble } from '@/domain/entities/bubble'

interface BubblePreviewPopupProps {
  isOpen: boolean
  onClose: () => void
  bubble: Bubble
  onJoin: () => void
  isLoading: boolean
}

export function BubblePreviewPopup({ isOpen, onClose, bubble, onJoin, isLoading }: BubblePreviewPopupProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-6" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="w-full max-w-[360px] rounded-2xl" style={{ backgroundColor: 'var(--bg-elevated)' }}>
        {/* 닫기 */}
        <div className="flex justify-end px-3 pt-3">
          <button type="button" onClick={onClose}>
            <X size={18} style={{ color: 'var(--text-hint)' }} />
          </button>
        </div>

        {/* 히어로 */}
        <div className="flex flex-col items-center gap-2 px-5 pb-4">
          <div
            className="flex h-16 w-16 items-center justify-center rounded-2xl"
            style={{ backgroundColor: bubble.iconBgColor ?? 'var(--accent-social-light)', fontSize: '32px' }}
          >
            {bubble.icon ?? '🫧'}
          </div>
          <span className="text-[17px] font-bold text-[var(--text)]">{bubble.name}</span>
          {bubble.description && (
            <p className="text-center text-[13px] leading-snug text-[var(--text-sub)]">{bubble.description}</p>
          )}
        </div>

        {/* 통계 */}
        <div className="mx-5 grid grid-cols-3 gap-2 rounded-xl p-3" style={{ backgroundColor: 'var(--bg-card)' }}>
          <div className="flex flex-col items-center gap-0.5">
            <Users size={16} style={{ color: 'var(--accent-social)' }} />
            <span className="text-[14px] font-bold text-[var(--text)]">{bubble.memberCount}</span>
            <span className="text-[10px] text-[var(--text-hint)]">멤버</span>
          </div>
          <div className="flex flex-col items-center gap-0.5">
            <Utensils size={16} style={{ color: 'var(--accent-food)' }} />
            <span className="text-[14px] font-bold text-[var(--text)]">{bubble.recordCount}</span>
            <span className="text-[10px] text-[var(--text-hint)]">기록</span>
          </div>
          <div className="flex flex-col items-center gap-0.5">
            <span className="text-[16px]">😋</span>
            <span className="text-[14px] font-bold text-[var(--text)]">
              {bubble.avgSatisfaction?.toFixed(1) ?? '-'}
            </span>
            <span className="text-[10px] text-[var(--text-hint)]">평균</span>
          </div>
        </div>

        {/* 가입 조건 */}
        {(bubble.minRecords > 0 || bubble.minLevel > 0) && (
          <div className="mx-5 mt-3 rounded-lg p-2.5" style={{ backgroundColor: 'var(--bg)', border: '1px solid var(--border)' }}>
            <p className="text-[11px] font-semibold text-[var(--text-sub)]">가입 조건</p>
            {bubble.minRecords > 0 && (
              <p className="text-[11px] text-[var(--text-hint)]">기록 {bubble.minRecords}개 이상</p>
            )}
            {bubble.minLevel > 0 && (
              <p className="text-[11px] text-[var(--text-hint)]">레벨 {bubble.minLevel} 이상</p>
            )}
          </div>
        )}

        {/* CTA */}
        <div className="p-5">
          <button
            type="button"
            onClick={onJoin}
            disabled={isLoading}
            className="w-full rounded-xl py-3 text-center text-[15px] font-bold text-white transition-opacity disabled:opacity-50"
            style={{ backgroundColor: 'var(--accent-social)' }}
          >
            {isLoading ? '처리 중...' : '가입하기'}
          </button>
        </div>
      </div>
    </div>
  )
}
