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
  subText?: string
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
  subText,
}: SettingsItemProps) {
  const Wrapper = onPress ? 'button' : 'div'
  const wrapperProps = onPress
    ? { type: 'button' as const, onClick: onPress }
    : {}

  return (
    <Wrapper
      {...wrapperProps}
      className="settings-item-row flex w-full items-center gap-3 text-left"
      style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)' }}
    >
      {icon && (
        <span
          className="flex shrink-0 items-center justify-center"
          style={{ width: '20px', height: '20px', color: danger ? 'var(--negative)' : 'var(--text-sub)' }}
        >
          {icon}
        </span>
      )}

      <div className="min-w-0 flex-1">
        <p style={{
          fontSize: '15px',
          color: danger ? 'var(--negative)' : 'var(--text)',
        }}>
          {label}
        </p>
        {hint && (
          <p style={{ fontSize: '10px', color: 'var(--text-hint)', marginTop: '1px' }}>
            {hint}
          </p>
        )}
        {subText && (
          <p style={{ fontSize: '12px', color: 'var(--text-hint)', marginTop: '2px', lineHeight: 1.3 }}>
            {subText}
          </p>
        )}
      </div>

      {rightElement ?? (
        <div className="flex shrink-0 items-center gap-1">
          {value && (
            <span style={{ fontSize: '13px', color: 'var(--text-sub)' }}>{value}</span>
          )}
          {showChevron && (
            <ChevronRight size={16} style={{ color: 'var(--border-bold)' }} />
          )}
        </div>
      )}
    </Wrapper>
  )
}
