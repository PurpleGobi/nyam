'use client'

import { X } from 'lucide-react'
import type { NudgeDisplay } from '@/domain/entities/nudge'

interface NudgeStripProps {
  nudge: NudgeDisplay | null
  onAction: () => void
  onDismiss: () => void
}

export function NudgeStrip({ nudge, onAction, onDismiss }: NudgeStripProps) {
  if (!nudge) return null

  return (
    <div
      className="mx-4 flex items-center gap-3 rounded-xl px-4 py-3"
      style={{ backgroundColor: 'var(--accent-food-light)', border: '1px solid var(--accent-food-dim)' }}
    >
      <span style={{ fontSize: '20px' }}>{nudge.icon}</span>
      <div className="min-w-0 flex-1">
        <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>{nudge.title}</p>
        <p style={{ fontSize: '11px', color: 'var(--text-sub)' }}>{nudge.subtitle}</p>
      </div>
      <button
        type="button"
        onClick={onAction}
        className="shrink-0 rounded-lg px-3 py-1.5 text-[12px] font-semibold text-white"
        style={{ backgroundColor: 'var(--accent-food)' }}
      >
        {nudge.actionLabel}
      </button>
      <button type="button" onClick={onDismiss} className="shrink-0" style={{ color: 'var(--text-hint)' }}>
        <X size={14} />
      </button>
    </div>
  )
}
