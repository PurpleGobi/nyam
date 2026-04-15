'use client'

import { useState } from 'react'

interface FilterChipSaveModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (name: string) => void
  accentColor?: string
}

export function FilterChipSaveModal({ isOpen, onClose, onSave, accentColor = 'var(--accent-food)' }: FilterChipSaveModalProps) {
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

  return (
    <div
      style={{
        padding: '12px 16px',
        borderTop: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
      }}
    >
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="필터칩 이름 입력..."
        autoFocus
        maxLength={20}
        className="min-w-0 flex-1 rounded-[10px] px-3 py-2 text-[13px] outline-none"
        style={{
          backgroundColor: 'var(--bg)',
          color: 'var(--text)',
          border: '1px solid var(--border)',
        }}
      />

      <button
        type="button"
        onClick={handleSave}
        disabled={name.trim().length === 0}
        className="shrink-0 rounded-lg px-3 py-1.5 text-[13px] font-semibold transition-colors"
        style={{
          backgroundColor: name.trim().length > 0 ? accentColor : 'var(--bg-card)',
          color: name.trim().length > 0 ? 'var(--text-inverse)' : 'var(--text-hint)',
          cursor: name.trim().length > 0 ? 'pointer' : 'not-allowed',
        }}
      >
        저장
      </button>
    </div>
  )
}
