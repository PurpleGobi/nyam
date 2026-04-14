'use client'

import { useState, useRef, useEffect } from 'react'
import { BottomSheet } from '@/presentation/components/ui/bottom-sheet'

interface EditFieldSheetProps {
  isOpen: boolean
  title: string
  initialValue: string
  placeholder: string
  maxLength?: number
  /** 입력 필드 앞에 표시할 접두사 (예: @) */
  prefix?: string
  /** 형식 안내 텍스트 */
  description?: string
  /** 입력 값 필터 (허용되지 않는 문자 제거) */
  inputFilter?: (value: string) => string
  onSave: (value: string) => void
  onClose: () => void
}

export function EditFieldSheet({ isOpen, title, initialValue, placeholder, maxLength = 30, prefix, description, inputFilter, onSave, onClose }: EditFieldSheetProps) {
  if (!isOpen) return null

  return (
    <EditFieldSheetInner
      title={title}
      initialValue={initialValue}
      placeholder={placeholder}
      maxLength={maxLength}
      prefix={prefix}
      description={description}
      inputFilter={inputFilter}
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
  prefix,
  description,
  inputFilter,
  onSave,
  onClose,
}: Omit<EditFieldSheetProps, 'isOpen'>) {
  const [value, setValue] = useState(initialValue)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const handleChange = (raw: string) => {
    const filtered = inputFilter ? inputFilter(raw) : raw
    setValue(filtered.slice(0, maxLength))
  }

  return (
    <BottomSheet isOpen={true} onClose={onClose} title={title}>
      {description && (
        <p className="mb-2" style={{ fontSize: '12px', color: 'var(--text-hint)' }}>{description}</p>
      )}

      <div className="flex items-center gap-0">
        {prefix && (
          <span style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-hint)', marginRight: '4px' }}>{prefix}</span>
        )}
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          placeholder={placeholder}
          className="nyam-input flex-1"
        />
      </div>

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
    </BottomSheet>
  )
}
