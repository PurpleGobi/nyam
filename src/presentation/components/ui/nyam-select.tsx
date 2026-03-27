'use client'

import { useState, useRef, useEffect } from 'react'
import { ChevronDown } from 'lucide-react'

interface NyamSelectOption {
  value: string
  label: string
}

interface NyamSelectProps {
  options: NyamSelectOption[]
  value: string
  onChange: (value: string) => void
}

export function NyamSelect({ options, value, onChange }: NyamSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const selectedLabel = options.find((o) => o.value === value)?.label ?? value

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSelect = (optionValue: string) => {
    onChange(optionValue)
    setIsOpen(false)
  }

  return (
    <div ref={containerRef} className="relative min-w-0 flex-1">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex h-9 w-full items-center justify-between gap-1.5 rounded-[10px] px-3 text-[13px] transition-colors"
        style={{
          backgroundColor: 'var(--bg-card)',
          color: 'var(--text)',
          border: '1px solid var(--border)',
        }}
      >
        <span className="truncate">{selectedLabel}</span>
        <ChevronDown
          size={14}
          className="shrink-0 transition-transform"
          style={{
            color: 'var(--text-hint)',
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
          }}
        />
      </button>

      {isOpen && (
        <div
          className="absolute left-0 top-full z-50 mt-1 max-h-[200px] w-full overflow-y-auto rounded-[10px] py-1"
          style={{
            backgroundColor: 'var(--bg-elevated)',
            border: '1px solid var(--border)',
            boxShadow: 'var(--shadow-md)',
          }}
        >
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => handleSelect(option.value)}
              className="flex w-full items-center px-3 py-2 text-left text-[13px] transition-colors"
              style={{
                color: option.value === value ? 'var(--accent-food)' : 'var(--text)',
                backgroundColor: option.value === value ? 'var(--bg-card)' : 'transparent',
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
