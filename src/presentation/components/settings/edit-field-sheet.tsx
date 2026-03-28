'use client'

import { useState, useRef, useEffect } from 'react'
import { X } from 'lucide-react'

interface EditFieldSheetProps {
  isOpen: boolean
  title: string
  initialValue: string
  placeholder: string
  maxLength?: number
  onSave: (value: string) => void
  onClose: () => void
}

export function EditFieldSheet({ isOpen, title, initialValue, placeholder, maxLength = 30, onSave, onClose }: EditFieldSheetProps) {
  if (!isOpen) return null

  return (
    <EditFieldSheetInner
      title={title}
      initialValue={initialValue}
      placeholder={placeholder}
      maxLength={maxLength}
      onSave={onSave}
      onClose={onClose}
    />
  )
}

function EditFieldSheetInner({
  title,
  initialValue,
  placeholder,
  maxLength = 30,
  onSave,
  onClose,
}: Omit<EditFieldSheetProps, 'isOpen'>) {
  const [value, setValue] = useState(initialValue)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  return (
    <>
      <div
        className="bottom-sheet-overlay"
        onClick={onClose}
      />
      <div
        className="fixed-in-shell fixed bottom-0 left-0 right-0 z-[200] rounded-t-2xl"
        style={{ backgroundColor: 'var(--bg-card)', padding: '20px 24px 32px' }}
      >
        <div className="mb-4 flex items-center justify-between">
          <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text)' }}>{title}</span>
          <button type="button" onClick={onClose} className="flex h-8 w-8 items-center justify-center">
            <X size={18} style={{ color: 'var(--text-hint)' }} />
          </button>
        </div>

        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value.slice(0, maxLength))}
          placeholder={placeholder}
          className="nyam-input"
        />

        <div className="mt-1 text-right" style={{ fontSize: '11px', color: 'var(--text-hint)' }}>
          {value.length}/{maxLength}
        </div>

        <button
          type="button"
          onClick={() => { onSave(value); onClose() }}
          disabled={value.trim() === ''}
          className="mt-4 w-full rounded-lg py-3"
          style={{
            fontSize: '14px',
            fontWeight: 700,
            backgroundColor: value.trim() ? 'var(--text)' : 'var(--bg-elevated)',
            color: value.trim() ? '#FFFFFF' : 'var(--text-hint)',
          }}
        >
          저장
        </button>
      </div>
    </>
  )
}
