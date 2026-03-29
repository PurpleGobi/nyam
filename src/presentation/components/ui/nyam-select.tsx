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
  placeholder?: string
  disabled?: boolean
  accentColor?: string
}

export function NyamSelect({ options, value, onChange, placeholder, disabled = false, accentColor = 'var(--accent-food)' }: NyamSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const matched = options.find((o) => o.value === value)
  const selectedLabel = matched ? matched.label : (value || placeholder || '')
  const isWine = accentColor === 'var(--accent-wine)'

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
    <div ref={containerRef} className="nyam-select-wrap min-w-0 flex-1">
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`nyam-select w-full ${isOpen ? 'open' : ''} ${isWine ? 'wine' : ''} ${disabled ? 'disabled' : ''}`}
        style={disabled ? { opacity: 0.4, cursor: 'not-allowed' } : undefined}
      >
        <span className="truncate" style={!value && placeholder ? { color: 'var(--text-hint)' } : undefined}>{selectedLabel}</span>
        <ChevronDown size={12} className="nyam-select-arrow shrink-0" />
      </button>

      {isOpen && (
        <div className="nyam-dropdown absolute right-0 top-full z-[100] mt-1 w-full" style={{ maxHeight: '280px', overflowY: 'auto' }}>
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => handleSelect(option.value)}
              className={`nyam-dropdown-item w-full text-left ${option.value === value ? 'selected' : ''}`}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
