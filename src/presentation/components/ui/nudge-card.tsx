'use client'

import { X } from 'lucide-react'

interface NudgeCardProps {
  icon?: React.ReactNode
  title: string
  description?: string
  onConfirm?: () => void
  onDismiss?: () => void
  onClose?: () => void
  confirmLabel?: string
  dismissLabel?: string
}

export function NudgeCard({
  icon, title, description,
  onConfirm, onDismiss, onClose,
  confirmLabel = '확인', dismissLabel = '닫기',
}: NudgeCardProps) {
  return (
    <div className="nudge-card">
      {icon && (
        <div style={{
          width: '48px', height: '48px', borderRadius: '10px',
          background: 'linear-gradient(135deg, var(--accent-food-light), var(--accent-food-dim))',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          {icon}
        </div>
      )}
      <div style={{ flex: 1 }}>
        <p style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)' }}>{title}</p>
        {description && <p style={{ fontSize: '11px', color: 'var(--text-hint)' }}>{description}</p>}
        {(onConfirm || onDismiss) && (
          <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
            {onConfirm && (
              <button type="button" onClick={onConfirm} style={{
                fontSize: '11px', fontWeight: 600, padding: '4px 10px',
                borderRadius: 'var(--r-xs)', background: 'var(--accent-food)',
                color: '#fff', border: 'none', cursor: 'pointer',
              }}>{confirmLabel}</button>
            )}
            {onDismiss && (
              <button type="button" onClick={onDismiss} style={{
                fontSize: '11px', fontWeight: 600, padding: '4px 10px',
                borderRadius: 'var(--r-xs)', background: 'var(--bg)',
                color: 'var(--text-sub)', border: '1px solid var(--border)', cursor: 'pointer',
              }}>{dismissLabel}</button>
            )}
          </div>
        )}
      </div>
      {onClose && (
        <button type="button" onClick={onClose} style={{
          position: 'absolute', top: '8px', right: '8px',
          background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-hint)',
        }}>
          <X size={16} />
        </button>
      )}
    </div>
  )
}
