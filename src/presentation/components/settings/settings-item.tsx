'use client'

import { ChevronRight } from 'lucide-react'

interface SettingsItemProps {
  icon?: React.ReactNode
  label: string
  hint?: string
  value?: string
  onPress?: () => void
  showChevron?: boolean
  danger?: boolean
  rightElement?: React.ReactNode
}

export function SettingsItem({
  icon,
  label,
  hint,
  value,
  onPress,
  showChevron = false,
  danger = false,
  rightElement,
}: SettingsItemProps) {
  const Wrapper = onPress ? 'button' : 'div'
  const wrapperProps = onPress
    ? { type: 'button' as const, onClick: onPress }
    : {}

  return (
    <Wrapper
      {...wrapperProps}
      className="flex w-full items-center gap-3 px-3.5 py-3 text-left"
      style={{ borderBottom: '1px solid var(--border)' }}
    >
      {icon && (
        <span style={{ color: danger ? 'var(--negative)' : 'var(--text-sub)' }}>
          {icon}
        </span>
      )}

      <div className="min-w-0 flex-1">
        <p style={{
          fontSize: '14px',
          color: danger ? 'var(--negative)' : 'var(--text)',
        }}>
          {label}
        </p>
        {hint && (
          <p style={{ fontSize: '12px', color: 'var(--text-hint)', marginTop: '2px' }}>
            {hint}
          </p>
        )}
      </div>

      {rightElement ?? (
        <div className="flex shrink-0 items-center gap-1">
          {value && (
            <span style={{ fontSize: '14px', color: 'var(--text-sub)' }}>{value}</span>
          )}
          {showChevron && (
            <ChevronRight size={12} style={{ color: 'var(--text-hint)' }} />
          )}
        </div>
      )}
    </Wrapper>
  )
}
