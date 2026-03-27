'use client'

interface SettingsCardProps {
  children: React.ReactNode
}

export function SettingsCard({ children }: SettingsCardProps) {
  return (
    <div
      className="overflow-hidden rounded-xl"
      style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}
    >
      {children}
    </div>
  )
}
