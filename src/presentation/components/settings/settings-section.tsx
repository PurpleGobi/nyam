'use client'

interface SettingsSectionProps {
  title: string
  children: React.ReactNode
  /** @deprecated Use without icon */
  icon?: React.ReactNode
}

export function SettingsSection({ title, children }: SettingsSectionProps) {
  return (
    <div style={{ padding: '20px 20px 8px' }}>
      <div
        style={{
          fontSize: '11px',
          fontWeight: 600,
          color: 'var(--text-sub)',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
          paddingBottom: '6px',
        }}
      >
        {title}
      </div>
      {children}
    </div>
  )
}
