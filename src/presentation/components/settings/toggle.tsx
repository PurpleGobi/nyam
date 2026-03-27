'use client'

interface ToggleProps {
  checked: boolean
  onChange: (value: boolean) => void
  disabled?: boolean
}

export function Toggle({ checked, onChange, disabled = false }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="relative h-[26px] w-[44px] shrink-0 rounded-full transition-colors"
      style={{
        backgroundColor: checked ? 'var(--accent-food)' : 'var(--border-bold)',
        opacity: disabled ? 0.5 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
      }}
    >
      <div
        className="absolute top-[2px] h-[22px] w-[22px] rounded-full shadow-sm transition-transform"
        style={{
          backgroundColor: 'var(--bg-elevated)',
          left: checked ? '20px' : '2px',
        }}
      />
    </button>
  )
}
