'use client'

import { X, Users } from 'lucide-react'
import type { Bubble } from '@/domain/entities/bubble'
import { BubbleIcon } from '@/presentation/components/bubble/bubble-icon'

interface JoinFlowProps {
  isOpen: boolean
  onClose: () => void
  bubble: Bubble
  onJoin: () => void
  isLoading: boolean
  eligibilityError: string | null
}

export function JoinFlow({ isOpen, onClose, bubble, onJoin, isLoading, eligibilityError }: JoinFlowProps) {
  if (!isOpen) return null

  const policyLabel: Record<string, string> = {
    closed: '초대만 가능',
    manual_approve: '승인 후 가입',
    auto_approve: '자동 승인',
    open: '자유 가입',
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="w-full max-w-[430px] rounded-t-2xl pb-8" style={{ backgroundColor: 'var(--bg-elevated)' }}>
        {/* 헤더 */}
        <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
          <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text)' }}>버블 가입</span>
          <button type="button" onClick={onClose}>
            <X size={20} style={{ color: 'var(--text-sub)' }} />
          </button>
        </div>

        {/* 버블 프리뷰 */}
        <div className="flex flex-col items-center gap-3 px-4 py-6">
          <div
            className="flex h-16 w-16 items-center justify-center rounded-2xl"
            style={{ backgroundColor: bubble.iconBgColor ?? 'var(--accent-social-light)', color: '#FFFFFF' }}
          >
            <BubbleIcon icon={bubble.icon} size={32} />
          </div>
          <span className="text-[17px] font-bold text-[var(--text)]">{bubble.name}</span>
          {bubble.description && (
            <p className="text-center text-[13px] text-[var(--text-sub)]">{bubble.description}</p>
          )}
          <div className="flex items-center gap-1.5 text-[12px] text-[var(--text-hint)]">
            <Users size={14} />
            <span>멤버 {bubble.memberCount}명</span>
            <span>·</span>
            <span>{policyLabel[bubble.joinPolicy] ?? bubble.joinPolicy}</span>
          </div>
        </div>

        {/* 가입 조건 */}
        {(bubble.minRecords > 0 || bubble.minLevel > 0) && (
          <div className="mx-4 mb-4 rounded-xl p-3" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <p className="mb-1 text-[12px] font-semibold text-[var(--text-sub)]">가입 조건</p>
            {bubble.minRecords > 0 && (
              <p className="text-[12px] text-[var(--text-hint)]">최소 기록 {bubble.minRecords}개</p>
            )}
            {bubble.minLevel > 0 && (
              <p className="text-[12px] text-[var(--text-hint)]">최소 레벨 {bubble.minLevel}</p>
            )}
          </div>
        )}

        {/* 에러 메시지 */}
        {eligibilityError && (
          <p className="mx-4 mb-3 text-center text-[13px]" style={{ color: 'var(--negative)' }}>
            {eligibilityError}
          </p>
        )}

        {/* CTA */}
        <div className="px-4">
          <button
            type="button"
            onClick={onJoin}
            disabled={isLoading || !!eligibilityError}
            className="w-full rounded-xl py-3.5 text-center text-[15px] font-bold text-white transition-opacity disabled:opacity-50"
            style={{ backgroundColor: 'var(--accent-social)' }}
          >
            {isLoading ? '가입 중...' : bubble.joinPolicy === 'manual_approve' ? '가입 신청' : '가입하기'}
          </button>
        </div>
      </div>
    </div>
  )
}
