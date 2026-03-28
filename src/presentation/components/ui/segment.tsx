'use client'

interface SegmentOption {
  value: string
  label: string
}

interface SegmentProps {
  options: SegmentOption[]
  value: string
  onChange: (value: string) => void
}

export function Segment({ options, value, onChange }: SegmentProps) {
  return (
    <div className="prv-segment">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          className={`prv-segment-btn ${value === opt.value ? 'active' : ''}`}
          onClick={() => onChange(opt.value)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}
