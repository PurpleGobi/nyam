'use client'

import { Pencil, Share2, Trash2, Check } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

interface FabActionButton {
  label: string
  icon: LucideIcon
  onClick: () => void
  tone: 'accent' | 'neutral' | 'danger'
  disabled?: boolean
  loading?: boolean
}

interface FabActionsProps {
  variant?: 'food' | 'wine'
  /** 커스텀 버튼 배열 — 지정하면 preset 무시 */
  buttons?: FabActionButton[]
  /** preset: 상세 페이지용 수정/공유/삭제 */
  onEdit?: () => void
  onShare?: () => void
  onDelete?: () => void
}

export function FabActions({ variant = 'food', buttons, onEdit, onShare, onDelete }: FabActionsProps) {
  const accent = variant === 'wine' ? 'var(--accent-wine)' : 'var(--accent-food)'

  const resolvedButtons: FabActionButton[] = buttons ?? [
    ...(onEdit ? [{ label: '수정', icon: Pencil, onClick: onEdit, tone: 'accent' as const }] : []),
    ...(onShare ? [{ label: '공유', icon: Share2, onClick: onShare, tone: 'neutral' as const }] : []),
    ...(onDelete ? [{ label: '삭제', icon: Trash2, onClick: onDelete, tone: 'danger' as const }] : []),
  ]

  if (resolvedButtons.length === 0) return null

  function getToneStyle(tone: FabActionButton['tone']) {
    switch (tone) {
      case 'accent':
        return {
          color: accent,
          backgroundColor: `color-mix(in srgb, ${accent} 10%, var(--bg))`,
          borderColor: `color-mix(in srgb, ${accent} 25%, transparent)`,
        }
      case 'neutral':
        return {
          color: 'var(--text-sub)',
          backgroundColor: 'color-mix(in srgb, var(--bg-card) 90%, transparent)',
          borderColor: 'var(--border)',
        }
      case 'danger':
        return {
          color: 'var(--negative)',
          backgroundColor: 'color-mix(in srgb, var(--negative) 6%, var(--bg))',
          borderColor: 'color-mix(in srgb, var(--negative) 20%, transparent)',
        }
    }
  }

  return (
    <div className="fab-actions">
      {resolvedButtons.map((btn) => {
        const Icon = btn.icon
        return (
          <button
            key={btn.label}
            type="button"
            onClick={btn.onClick}
            disabled={btn.disabled || btn.loading}
            className="fab-action-btn"
            style={{
              ...getToneStyle(btn.tone),
              opacity: btn.disabled ? 0.4 : 1,
            }}
          >
            {btn.loading ? (
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
            ) : (
              <Icon size={13} />
            )}
            {btn.label}
          </button>
        )
      })}
    </div>
  )
}

// ─── Preset 버튼 팩토리 (수정 페이지용) ───

export { Check, Trash2, Pencil, Share2 }
export type { FabActionButton }
