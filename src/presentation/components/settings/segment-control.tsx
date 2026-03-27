'use client'

interface SegmentOption {
  value: string
  label: string
}

interface SegmentControlProps {
  options: SegmentOption[]
  value: string
  onChange: (value: string) => void
}

export function SegmentControl({ options, value, onChange }: SegmentControlProps) {
  return (
    <div
      className="flex overflow-hidden rounded-lg"
      style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border)' }}
    >
      {options.map((option) => {
        const isActive = value === option.value
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className="flex-1 py-1.5 transition-colors"
            style={{
              fontSize: '12px',
              fontWeight: isActive ? 700 : 500,
              backgroundColor: isActive ? 'var(--accent-food)' : 'transparent',
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
