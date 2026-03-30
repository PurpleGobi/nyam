'use client'

import { Lock, Eye, ShieldCheck, Zap, DoorOpen } from 'lucide-react'
import type { BubbleJoinPolicy } from '@/domain/entities/bubble'

interface JoinPolicySelectorProps {
  selected: BubbleJoinPolicy
  onChange: (policy: BubbleJoinPolicy) => void
}

const POLICIES: {
  value: BubbleJoinPolicy
  label: string
  description: string
  icon: typeof Eye
}[] = [
  { value: 'invite_only', label: '초대만', description: '초대 링크로만 가입 가능', icon: Lock },
  { value: 'closed', label: '팔로우만', description: '가입 안 받음. 팔로워는 이름+점수만 열람', icon: Eye },
  { value: 'manual_approve', label: '승인 가입', description: '가입 신청 → 프로필 보고 승인/거절', icon: ShieldCheck },
  { value: 'auto_approve', label: '자동 승인', description: '검증 기록 N개 이상이면 자동 가입', icon: Zap },
  { value: 'open', label: '자유 가입', description: '누구나 바로 가입 가능', icon: DoorOpen },
]

export function JoinPolicySelector({ selected, onChange }: JoinPolicySelectorProps) {
  return (
    <div className="flex flex-col gap-2">
      {POLICIES.map(({ value, label, description, icon: Icon }) => {
        const isActive = selected === value
        return (
          <button
            key={value}
            type="button"
            onClick={() => onChange(value)}
            className="flex items-center gap-3 rounded-xl p-3 text-left transition-colors"
            style={{
              backgroundColor: isActive ? 'var(--accent-social-light)' : 'var(--bg-card)',
              border: `1.5px solid ${isActive ? 'var(--accent-social)' : 'var(--border)'}`,
            }}
          >
            <Icon size={24} style={{ color: isActive ? 'var(--accent-social)' : 'var(--text-hint)', flexShrink: 0 }} />
            <div className="min-w-0">
              <span
                className="text-[13px] font-semibold"
                style={{ color: isActive ? 'var(--accent-social)' : 'var(--text)' }}
              >
                {label}
              </span>
              <p className="mt-0.5 text-[11px] text-[var(--text-hint)]">{description}</p>
            </div>
          </button>
        )
      })}
    </div>
  )
}
