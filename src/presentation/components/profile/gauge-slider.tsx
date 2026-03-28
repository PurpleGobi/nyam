'use client'

import type { LucideIcon } from 'lucide-react'

interface GaugeSliderProps {
  icon?: LucideIcon
  label: string
  options: string[]
  value: 0 | 1 | 2
  onChange: (value: 0 | 1 | 2) => void
}

export function GaugeSlider({ icon: Icon, label, options, value, onChange }: GaugeSliderProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-1.5">
        {Icon && <Icon size={14} style={{ color: 'var(--text-hint)' }} />}
        <span style={{ fontSize: '13px', color: 'var(--text-sub)' }}>
          {label}
        </span>
      </div>

      <div
        className="flex rounded-lg p-0.5"
        style={{ backgroundColor: 'var(--bg-page)' }}
      >
        {options.map((option, index) => {
          const isActive = value === index

          return (
            <button
              key={option}
              type="button"
              onClick={() => onChange(index as 0 | 1 | 2)}
              className="flex-1 rounded-md py-2 px-3 text-center"
              style={{
                fontSize: '13px',
                fontWeight: isActive ? 600 : 400,
                backgroundColor: isActive ? 'var(--accent-food)' : 'var(--bg-page)',
                color: isActive ? '#fff' : 'var(--text-sub)',
                transition: 'all 0.2s',
              }}
            >
              {option}
            </button>
          )
        })}
      </div>
    </div>
  )
}
