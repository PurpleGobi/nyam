'use client'

interface SegmentOption {
  value: string
  label: string
}

interface SegmentControlProps {
  options: SegmentOption[]
  value: string
  onChange: (value: string) => void
  variant?: 'default' | 'privacy'
}

const PRIVACY_COLORS: Record<string, string> = {
  public: 'var(--positive)',
  bubble_only: 'var(--accent-social)',
  private: 'var(--caution)',
}

export function SegmentControl({ options, value, onChange, variant = 'default' }: SegmentControlProps) {
  return (
    <div
      className="flex overflow-hidden rounded-lg"
      style={{ backgroundColor: 'var(--bg-page)', border: '1px solid var(--border)' }}
    >
      {options.map((option) => {
        const isActive = value === option.value
        const activeColor = variant === 'privacy'
          ? (PRIVACY_COLORS[option.value] ?? 'var(--accent-food)')
          : 'var(--accent-food)'
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className="flex-1 py-1.5 transition-colors"
            style={{
              fontSize: '12px',
              fontWeight: isActive ? 700 : 500,
              backgroundColor: isActive ? activeColor : 'transparent',
              color: isActive ? '#FFFFFF' : 'var(--text-sub)',
            }}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
