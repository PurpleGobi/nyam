'use client'

import { ChevronDown } from 'lucide-react'

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
      <ChevronDown
        size={18}
        className="transition-transform duration-200"
        style={{
          color: 'var(--text-sub)',
          transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
        }}
      />
    </button>
  )
}
