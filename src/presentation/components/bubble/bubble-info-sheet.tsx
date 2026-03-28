'use client'

import { X, ShieldCheck, ScrollText, FileCheck, PencilLine, Star, Users } from 'lucide-react'
import type { Bubble } from '@/domain/entities/bubble'

interface BubbleInfoSheetProps {
  isOpen: boolean
  onClose: () => void
  bubble: Bubble
}

export function BubbleInfoSheet({ isOpen, onClose, bubble }: BubbleInfoSheetProps) {
  if (!isOpen) return null

  const joinConditions = getJoinConditions(bubble)

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div
        className="w-full max-w-[430px] rounded-t-2xl pb-8"
        style={{ backgroundColor: 'var(--bg-elevated)', maxHeight: '70vh' }}
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
          <span className="text-[15px] font-bold" style={{ color: 'var(--text)' }}>버블 정보</span>
          <button type="button" onClick={onClose}>
            <X size={20} style={{ color: 'var(--text-sub)' }} />
          </button>
        </div>

        <div className="overflow-y-auto px-4 py-4" style={{ maxHeight: '55vh' }}>
          {/* 가입 조건 */}
          <div className="mb-4">
            <div className="mb-2 flex items-center gap-2">
              <ShieldCheck size={16} style={{ color: 'var(--accent-social)' }} />
              <span className="text-[13px] font-semibold" style={{ color: 'var(--text)' }}>가입 조건</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {joinConditions.map((cond, i) => (
                <span
                  key={i}
                  className="flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold"
                  style={{
                    backgroundColor: cond.highlight ? 'var(--accent-social-light)' : 'var(--bg-card)',
                    color: cond.highlight ? 'var(--accent-social)' : 'var(--text-sub)',
                    border: cond.highlight ? 'none' : '1px solid var(--border)',
                  }}
                >
                  <cond.icon size={12} />
                  {cond.label}
                </span>
              ))}
            </div>
          </div>

          {/* 버블 규칙 */}
          {bubble.rules && bubble.rules.length > 0 && (
            <div>
              <div className="mb-2 flex items-center gap-2">
                <ScrollText size={16} style={{ color: 'var(--accent-food)' }} />
                <span className="text-[13px] font-semibold" style={{ color: 'var(--text)' }}>버블 규칙</span>
              </div>
              <ul className="flex flex-col gap-1.5">
                {bubble.rules.map((rule, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: 'var(--accent-food)' }} />
                    <span className="text-[12px] leading-relaxed" style={{ color: 'var(--text-sub)' }}>{rule}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function getJoinConditions(bubble: Bubble) {
  const conditions: Array<{ icon: typeof FileCheck; label: string; highlight: boolean }> = []

  if (bubble.joinPolicy === 'manual_approve') {
    conditions.push({ icon: FileCheck, label: '승인 필요', highlight: true })
  }
  if (bubble.minRecords > 0) {
    conditions.push({ icon: PencilLine, label: `기록 ${bubble.minRecords}개+`, highlight: false })
  }
  if (bubble.minLevel > 0) {
    conditions.push({ icon: Star, label: `Lv.${bubble.minLevel}+`, highlight: false })
  }
  if (bubble.maxMembers !== null) {
    conditions.push({ icon: Users, label: `최대 ${bubble.maxMembers}명`, highlight: false })
  }

  if (conditions.length === 0) {
    conditions.push({ icon: Users, label: '자유 가입', highlight: false })
  }

  return conditions
}
