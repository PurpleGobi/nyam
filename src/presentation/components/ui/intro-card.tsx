'use client'

import { Check } from 'lucide-react'

interface IntroCardProps {
  selected?: boolean
  variant?: 'food' | 'wine'
  icon?: React.ReactNode
  title: string
  description?: string
  onClick?: () => void
}

export function IntroCard({ selected, variant = 'food', icon, title, description, onClick }: IntroCardProps) {
  return (
    <div
      className={`intro-card${selected ? ` selected${variant === 'wine' ? ' wine' : ''}` : ''}`}
      style={{ padding: '16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px' }}
      onClick={onClick}
    >
      {icon && (
        <div style={{
          width: '44px', height: '44px', borderRadius: 'var(--r-md)',
          background: selected
            ? (variant === 'wine' ? 'var(--accent-wine-light)' : 'var(--accent-food-light)')
            : 'var(--bg)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          {icon}
        </div>
      )}
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)' }}>{title}</div>
        {description && <div style={{ fontSize: '11px', color: 'var(--text-hint)' }}>{description}</div>}
      </div>
      <div
        className="intro-card-check"
        style={{
          background: selected
            ? (variant === 'wine' ? 'var(--accent-wine)' : 'var(--accent-food)')
            : 'var(--border)',
          color: selected ? 'var(--text-inverse)' : 'transparent',
        }}
      >
        <Check size={14} />
      </div>
    </div>
  )
}
