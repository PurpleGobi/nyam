'use client'

interface SettingsCardProps {
  children: React.ReactNode
  padding?: boolean
}

export function SettingsCard({ children, padding = false }: SettingsCardProps) {
  return (
    <div
      className="overflow-hidden"
      style={{
        background: 'var(--bg-card)',
        borderRadius: '12px',
        border: '1px solid var(--border)',
        marginBottom: '4px',
        padding: padding ? '16px' : undefined,
      }}
    >
      {children}
    </div>
  )
}
