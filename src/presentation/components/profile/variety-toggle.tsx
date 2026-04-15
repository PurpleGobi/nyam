'use client'

interface VarietyToggleProps {
  showAll: boolean
  onChange: (showAll: boolean) => void
}

export function VarietyToggle({ showAll, onChange }: VarietyToggleProps) {
  return (
    <button
      type="button"
      onClick={() => onChange(!showAll)}
      className="flex items-center gap-1.5 rounded-full px-2.5 py-1 transition-colors"
      style={{
        fontSize: '11px',
        fontWeight: 600,
        backgroundColor: showAll ? 'var(--accent-wine)' : 'var(--bg-card)',
        color: showAll ? 'var(--text-inverse)' : 'var(--text-sub)',
        border: showAll ? 'none' : '1px solid var(--border)',
      }}
    >
      {showAll ? '전체 품종' : '마신 품종만'}
    </button>
  )
}
