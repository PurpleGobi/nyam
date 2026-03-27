'use client'

import { Lock, UserCheck, Zap, Globe } from 'lucide-react'
import type { BubbleJoinPolicy } from '@/domain/entities/bubble'

interface JoinPolicySelectorProps {
  selected: BubbleJoinPolicy
  onChange: (policy: BubbleJoinPolicy) => void
}

const POLICIES: {
  value: BubbleJoinPolicy
  label: string
  description: string
  icon: typeof Lock
}[] = [
  { value: 'closed', label: '비공개', description: '초대만 가능', icon: Lock },
  { value: 'manual_approve', label: '승인제', description: '관리자 승인 후 가입', icon: UserCheck },
  { value: 'auto_approve', label: '자동 승인', description: '조건 충족 시 자동 가입', icon: Zap },
  { value: 'open', label: '자유 가입', description: '누구나 바로 가입', icon: Globe },
]

export function JoinPolicySelector({ selected, onChange }: JoinPolicySelectorProps) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {POLICIES.map(({ value, label, description, icon: Icon }) => {
        const isActive = selected === value
        return (
          <button
            key={value}
            type="button"
            onClick={() => onChange(value)}
            className="flex flex-col items-center gap-1.5 rounded-xl p-3 transition-colors"
            style={{
              backgroundColor: isActive ? 'var(--accent-social-light)' : 'var(--bg-card)',
              border: `1.5px solid ${isActive ? 'var(--accent-social)' : 'var(--border)'}`,
            }}
          >
            <Icon size={20} style={{ color: isActive ? 'var(--accent-social)' : 'var(--text-hint)' }} />
            <span
              className="text-[13px] font-semibold"
              style={{ color: isActive ? 'var(--accent-social)' : 'var(--text)' }}
            >
              {label}
            </span>
            <span className="text-center text-[11px] text-[var(--text-hint)]">{description}</span>
          </button>
        )
      })}
    </div>
  )
}
