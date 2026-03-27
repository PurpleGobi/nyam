'use client'

import { Camera, X } from 'lucide-react'
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
      className="mx-4 flex items-center gap-2 rounded-xl px-3 py-2"
      style={{ backgroundColor: 'var(--accent-food-light)', border: '1px solid var(--border)' }}
    >
      <div
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
        style={{ backgroundColor: 'var(--accent-food)' }}
      >
        <Camera size={14} color="#fff" />
      </div>
      <p className="min-w-0 flex-1 truncate text-[12px]" style={{ color: 'var(--text)' }}>
        <strong>{nudge.title}</strong>
        <span style={{ color: 'var(--text-hint)' }}> · {nudge.subtitle}</span>
      </p>
      <button
        type="button"
        onClick={onAction}
        className="shrink-0 text-[12px] font-bold"
        style={{ color: 'var(--accent-food)' }}
      >
        {nudge.actionLabel}
      </button>
      <button type="button" onClick={onDismiss} className="shrink-0 text-[12px]" style={{ color: 'var(--text-hint)' }}>
        <X size={14} />
      </button>
    </div>
  )
}
