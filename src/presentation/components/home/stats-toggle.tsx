'use client'

import { BarChart2 } from 'lucide-react'

interface StatsToggleProps {
  isOpen: boolean
  onToggle: () => void
  label: string
}

export function StatsToggle({ isOpen, onToggle, label }: StatsToggleProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex w-full items-center justify-between rounded-xl px-4 py-3"
      style={{
        backgroundColor: 'var(--bg-card)',
        border: '1px solid var(--border)',
      }}
    >
      <span className="text-[14px] font-semibold" style={{ color: 'var(--text)' }}>
        {label}
      </span>
      <BarChart2
        size={18}
        style={{
          color: isOpen ? 'var(--text)' : 'var(--text-sub)',
        }}
      />
    </button>
  )
}
