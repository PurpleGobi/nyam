interface SettingsSectionProps {
  title: string
  children: React.ReactNode
}

export function SettingsSection({ title, children }: SettingsSectionProps) {
  return (
    <div>
      <h3 className="px-4 pb-1.5 text-xs font-semibold uppercase tracking-wider text-neutral-400">
        {title}
      </h3>
      <div className="rounded-2xl bg-card overflow-hidden shadow-[var(--shadow-sm)]">
        {children}
      </div>
    </div>
  )
}
