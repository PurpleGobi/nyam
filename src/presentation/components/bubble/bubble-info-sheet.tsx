'use client'

import { X, Users, BookOpen, Lock, Globe, Calendar } from 'lucide-react'
import type { Bubble } from '@/domain/entities/bubble'

interface BubbleInfoSheetProps {
  isOpen: boolean
  onClose: () => void
  bubble: Bubble
}

export function BubbleInfoSheet({ isOpen, onClose, bubble }: BubbleInfoSheetProps) {
  if (!isOpen) return null

  const createdDate = new Date(bubble.createdAt).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div
        className="w-full max-w-[430px] rounded-t-2xl pb-8"
        style={{ backgroundColor: 'var(--bg-elevated)', maxHeight: '70vh' }}
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
          <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text)' }}>버블 정보</span>
          <button type="button" onClick={onClose}>
            <X size={20} style={{ color: 'var(--text-sub)' }} />
          </button>
        </div>

        <div className="overflow-y-auto px-4 py-4" style={{ maxHeight: '55vh' }}>
          {/* 히어로 */}
          <div className="flex flex-col items-center gap-2 pb-4">
            <div
              className="flex h-14 w-14 items-center justify-center rounded-2xl"
              style={{ backgroundColor: bubble.iconBgColor ?? 'var(--accent-social-light)', fontSize: '28px' }}
            >
              {bubble.icon ?? '🫧'}
            </div>
            <span className="text-[17px] font-bold text-[var(--text)]">{bubble.name}</span>
            {bubble.description && (
              <p className="text-center text-[13px] text-[var(--text-sub)]">{bubble.description}</p>
            )}
          </div>

          {/* 정보 목록 */}
          <div className="flex flex-col gap-3 rounded-xl p-3" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <InfoRow icon={Users} label="멤버" value={`${bubble.memberCount}명`} />
            <InfoRow icon={BookOpen} label="기록" value={`${bubble.recordCount}개`} />
            <InfoRow
              icon={bubble.visibility === 'public' ? Globe : Lock}
              label="공개 설정"
              value={bubble.visibility === 'public' ? '공개' : '비공개'}
            />
            <InfoRow icon={Calendar} label="생성일" value={createdDate} />
          </div>

          {/* 규칙 */}
          {bubble.rules && bubble.rules.length > 0 && (
            <div className="mt-4 rounded-xl p-3" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
              <p className="mb-2 text-[13px] font-semibold text-[var(--text)]">버블 규칙</p>
              <ul className="flex flex-col gap-1">
                {bubble.rules.map((rule, i) => (
                  <li key={i} className="text-[12px] text-[var(--text-sub)]">· {rule}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function InfoRow({ icon: Icon, label, value }: { icon: typeof Users; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="flex items-center gap-2 text-[13px] text-[var(--text-sub)]">
        <Icon size={14} style={{ color: 'var(--text-hint)' }} />
        {label}
      </span>
      <span className="text-[13px] font-semibold text-[var(--text)]">{value}</span>
    </div>
  )
}
