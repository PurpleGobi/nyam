'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'

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
  /** true면 선택된 값 텍스트 폭에 맞춤 (Notion 스타일) */
  autoWidth?: boolean
}

export function NyamSelect({ options, value, onChange, placeholder, disabled = false, accentColor = 'var(--accent-food)', autoWidth = false }: NyamSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [canScrollUp, setCanScrollUp] = useState(false)
  const [canScrollDown, setCanScrollDown] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const matched = options.find((o) => o.value === value)
  const selectedLabel = matched ? matched.label : (value || placeholder || '')
  const isWine = accentColor === 'var(--accent-wine)'

  const checkScroll = useCallback(() => {
    const el = dropdownRef.current
    if (!el) return
    setCanScrollUp(el.scrollTop > 4)
    setCanScrollDown(el.scrollHeight - el.scrollTop - el.clientHeight > 4)
  }, [])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (isOpen) {
      requestAnimationFrame(checkScroll)
    }
  }, [isOpen, checkScroll])

  const handleSelect = (optionValue: string) => {
    onChange(optionValue)
    setIsOpen(false)
  }

  return (
    <div ref={containerRef} className={autoWidth ? 'nyam-select-wrap' : 'nyam-select-wrap min-w-0 flex-1'}>
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`nyam-select ${autoWidth ? 'w-auto' : 'w-full'} ${isOpen ? 'open' : ''} ${isWine ? 'wine' : ''} ${disabled ? 'disabled' : ''}`}
        style={disabled ? { opacity: 0.4, cursor: 'not-allowed' } : undefined}
      >
        <span className="truncate" style={!value && placeholder ? { color: 'var(--text-hint)' } : undefined}>{selectedLabel}</span>
        <ChevronDown size={12} className="nyam-select-arrow shrink-0" />
      </button>

      {isOpen && (
        <div
          className="nyam-dropdown absolute right-0 top-full z-[100] mt-1 min-w-full"
          style={{ width: autoWidth ? 'max-content' : undefined }}
        >
          {canScrollUp && (
            <div className="nyam-dropdown-scroll-hint top">
              <ChevronUp size={14} />
            </div>
          )}
          <div
            ref={dropdownRef}
            onScroll={checkScroll}
            className="nyam-dropdown-scroll"
            style={{ maxHeight: 'min(var(--dropdown-max, 999px), 50dvh)' }}
          >
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
          {canScrollDown && (
            <div className="nyam-dropdown-scroll-hint bottom">
              <ChevronDown size={14} />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
