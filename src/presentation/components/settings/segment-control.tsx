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

export function SegmentControl({ options, value, onChange }: SegmentControlProps) {
  return (
    <div className="prv-segment">
      {options.map((option) => {
        const isActive = value === option.value
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={`prv-segment-btn${isActive ? ' active' : ''}`}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
