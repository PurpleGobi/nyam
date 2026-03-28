'use client'

interface SettingsCardProps {
  children: React.ReactNode
}

export function SettingsCard({ children }: SettingsCardProps) {
  return (
    <div className="card overflow-hidden rounded-xl">
      {children}
    </div>
  )
}
