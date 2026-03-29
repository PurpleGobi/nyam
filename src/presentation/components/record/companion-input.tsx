'use client'

import { useState, useCallback, useEffect } from 'react'
import { Plus, X, Clock } from 'lucide-react'

interface CompanionInputProps {
  value: string[]
  onChange: (value: string[]) => void
  aiCompanions?: string[]
  recentCompanions?: string[]
}

function getAvatarGradient(name: string): string {
  const code = name.charCodeAt(0)
  const hue = (code * 37) % 360
  return `linear-gradient(135deg, hsl(${hue}, 40%, 55%), hsl(${hue}, 40%, 40%))`
}

export function CompanionInput({ value, onChange, aiCompanions, recentCompanions }: CompanionInputProps) {
  const [isAdding, setIsAdding] = useState(false)
  const [inputValue, setInputValue] = useState('')
  const [showRecent, setShowRecent] = useState(false)

  // AI 인식 동행자 자동 설정 (마운트 시 1회)
  useEffect(() => {
    if (aiCompanions && aiCompanions.length > 0 && value.length === 0) {
      onChange(aiCompanions)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 이미 선택된 동행자를 제외한 최근 목록
  const filteredRecent = (recentCompanions ?? []).filter((name) => !value.includes(name))

  const handleAdd = useCallback(() => {
    const trimmed = inputValue.trim()
    if (trimmed && !value.includes(trimmed)) {
      onChange([...value, trimmed])
    }
    setInputValue('')
  }, [inputValue, value, onChange])

  const handleAddRecent = useCallback(
    (name: string) => {
      if (!value.includes(name)) {
        onChange([...value, name])
      }
    },
    [value, onChange],
  )

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
      {value.map((name) => (
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
      ))}

      {isAdding ? (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <input
              type="text"
              maxLength={20}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => setShowRecent(true)}
              onBlur={() => {
                // 클릭 이벤트가 먼저 실행되도록 약간의 지연
                setTimeout(() => setShowRecent(false), 150)
              }}
              placeholder="이름 입력"
              className="nyam-input flex-1"
              style={{ backgroundColor: 'var(--bg-card)', fontSize: '13px' }}
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

          {/* 최근 동행자 목록 */}
          {showRecent && filteredRecent.length > 0 && (
            <div
              className="flex flex-col gap-0.5 rounded-xl"
              style={{
                padding: '8px',
                backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--border)',
              }}
            >
              <span
                className="flex items-center gap-1 px-1 pb-1"
                style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-hint)' }}
              >
                <Clock size={10} />
                최근 함께한 사람
              </span>
              <div className="flex flex-wrap gap-1.5">
                {filteredRecent.map((name) => (
                  <button
                    key={name}
                    type="button"
                    onClick={() => handleAddRecent(name)}
                    className="flex items-center gap-1.5 transition-colors active:opacity-70"
                    style={{
                      padding: '5px 10px',
                      borderRadius: '9999px',
                      backgroundColor: 'var(--bg)',
                      border: '1px solid var(--border)',
                    }}
                  >
                    <div
                      className="flex shrink-0 items-center justify-center"
                      style={{
                        width: '18px',
                        height: '18px',
                        borderRadius: '50%',
                        background: getAvatarGradient(name),
                      }}
                    >
                      <span style={{ fontSize: '9px', fontWeight: 700, color: '#FFFFFF' }}>
                        {name[0]}
                      </span>
                    </div>
                    <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text)' }}>
                      {name}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
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
