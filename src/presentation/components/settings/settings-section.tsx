'use client'

interface SettingsSectionProps {
  icon: React.ReactNode
  title: string
  children: React.ReactNode
}

export function SettingsSection({ icon, title, children }: SettingsSectionProps) {
  return (
    <div>
      <div className="mb-2 flex items-center gap-2 px-1">
        <span style={{ color: 'var(--text-sub)' }}>{icon}</span>
        <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text)' }}>{title}</span>
      </div>
      <div className="card overflow-hidden rounded-xl">
        {children}
      </div>
    </div>
  )
}
