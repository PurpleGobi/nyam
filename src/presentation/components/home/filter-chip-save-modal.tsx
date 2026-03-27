'use client'

import { useState } from 'react'
import { X } from 'lucide-react'

interface FilterChipSaveModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (name: string) => void
}

export function FilterChipSaveModal({ isOpen, onClose, onSave }: FilterChipSaveModalProps) {
  const [name, setName] = useState('')

  if (!isOpen) return null

  const handleSave = () => {
    const trimmed = name.trim()
    if (trimmed.length === 0) return
    onSave(trimmed)
    setName('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave()
    }
  }

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-6"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.4)' }}
      onClick={handleBackdropClick}
    >
      <div
        className="w-full max-w-[320px] rounded-2xl p-5"
        style={{
          backgroundColor: 'var(--bg-elevated)',
          boxShadow: 'var(--shadow-lg)',
        }}
      >
        {/* 헤더 */}
        <div className="mb-4 flex items-center justify-between">
          <h3
            className="text-[16px] font-bold"
            style={{ color: 'var(--text)' }}
          >
            필터 칩 저장
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-full transition-colors"
            style={{ color: 'var(--text-hint)' }}
          >
            <X size={16} />
          </button>
        </div>

        {/* 이름 입력 */}
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="칩 이름을 입력하세요"
          autoFocus
          maxLength={20}
          className="mb-4 h-11 w-full rounded-[10px] px-3.5 text-[14px] outline-none transition-colors"
          style={{
            backgroundColor: 'var(--bg-card)',
            color: 'var(--text)',
            border: '1px solid var(--border)',
          }}
        />

        {/* 저장 버튼 */}
        <button
          type="button"
          onClick={handleSave}
          disabled={name.trim().length === 0}
          className="h-11 w-full rounded-[10px] text-[14px] font-semibold transition-colors"
          style={{
            backgroundColor: name.trim().length > 0 ? 'var(--accent-food)' : 'var(--bg-card)',
            color: name.trim().length > 0 ? '#FFFFFF' : 'var(--text-hint)',
            cursor: name.trim().length > 0 ? 'pointer' : 'not-allowed',
          }}
        >
          저장
        </button>
      </div>
    </div>
  )
}
