'use client'

import { useState, useCallback, useEffect } from 'react'
import { Plus, X } from 'lucide-react'

interface CompanionInputProps {
  value: string[]
  onChange: (value: string[]) => void
  aiCompanions?: string[]
}

function getAvatarGradient(name: string): string {
  const code = name.charCodeAt(0)
  const hue = (code * 37) % 360
  return `linear-gradient(135deg, hsl(${hue}, 40%, 55%), hsl(${hue}, 40%, 40%))`
}

export function CompanionInput({ value, onChange, aiCompanions }: CompanionInputProps) {
  const [isAdding, setIsAdding] = useState(false)
  const [inputValue, setInputValue] = useState('')

  // AI 인식 동행자 자동 설정 (마운트 시 1회)
  useEffect(() => {
    if (aiCompanions && aiCompanions.length > 0 && value.length === 0) {
      onChange(aiCompanions)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleAdd = useCallback(() => {
    const trimmed = inputValue.trim()
    if (trimmed && !value.includes(trimmed)) {
      onChange([...value, trimmed])
    }
    setInputValue('')
  }, [inputValue, value, onChange])

  const handleRemove = useCallback(
    (name: string) => {
      onChange(value.filter((v) => v !== name))
    },
    [value, onChange],
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        handleAdd()
      }
    },
    [handleAdd],
  )

  return (
    <div className="flex w-full flex-col gap-2">
      {value.map((name) => {
        const isAi = aiCompanions?.includes(name)
        return (
          <div
            key={name}
            className="flex items-center gap-2"
            style={{
              padding: '8px 12px',
              border: '1px solid var(--border)',
              borderRadius: '10px',
            }}
          >
            <div
              className="flex shrink-0 items-center justify-center"
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                background: getAvatarGradient(name),
              }}
            >
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#FFFFFF' }}>
                {name[0]}
              </span>
            </div>
            <span className="flex-1" style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>
              {name}
            </span>
            <button
              type="button"
              onClick={() => handleRemove(name)}
              style={{ color: 'var(--text-hint)' }}
            >
              <X size={14} />
            </button>
          </div>
        )
      })}

      {isAdding ? (
        <div className="flex items-center gap-2">
          <input
            type="text"
            maxLength={20}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="이름 입력"
            className="flex-1"
            style={{
              padding: '8px 12px',
              border: '1px solid var(--border)',
              borderRadius: '10px',
              fontSize: '13px',
              color: 'var(--text)',
              backgroundColor: 'var(--bg-card)',
              outline: 'none',
            }}
            autoFocus
          />
          <button
            type="button"
            onClick={handleAdd}
            style={{
              fontSize: '13px',
              fontWeight: 600,
              color: 'var(--accent-food)',
              padding: '8px',
            }}
          >
            추가
          </button>
        </div>
      ) : (
        <button
          type="button"
          className="flex items-center gap-1.5"
          style={{
            color: 'var(--text-hint)',
            fontSize: '13px',
            padding: '8px 0',
            cursor: 'pointer',
          }}
          onClick={() => setIsAdding(true)}
        >
          <Plus size={14} />
          <span>동반자 추가</span>
        </button>
      )}
    </div>
  )
}
