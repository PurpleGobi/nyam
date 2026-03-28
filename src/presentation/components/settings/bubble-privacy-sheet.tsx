'use client'

import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import type { VisibilityConfig } from '@/domain/entities/settings'
import { Toggle } from '@/presentation/components/settings/toggle'

interface BubblePrivacySheetProps {
  isOpen: boolean
  onClose: () => void
  bubble: { id: string; name: string } | null
  defaultConfig: VisibilityConfig
  onSave: (config: VisibilityConfig) => void
}

const VISIBILITY_FIELDS: { key: keyof VisibilityConfig; label: string }[] = [
  { key: 'score', label: '점수' },
  { key: 'comment', label: '코멘트' },
  { key: 'photos', label: '사진' },
  { key: 'level', label: '레벨' },
  { key: 'quadrant', label: '사분면' },
  { key: 'bubbles', label: '버블 목록' },
  { key: 'price', label: '가격' },
]

export function BubblePrivacySheet({ isOpen, onClose, bubble, defaultConfig, onSave }: BubblePrivacySheetProps) {
  const [config, setConfig] = useState<VisibilityConfig>(defaultConfig)

  useEffect(() => {
    setConfig(defaultConfig)
  }, [defaultConfig])

  useEffect(() => {
    if (!isOpen) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [isOpen, onClose])

  if (!isOpen || !bubble) return null

  const handleToggle = (key: keyof VisibilityConfig) => {
    setConfig((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="bottom-sheet-overlay"
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        className="bottom-sheet flex flex-col"
        style={{ maxHeight: '70dvh' }}
      >
        {/* Handle */}
        <div className="flex justify-center">
          <div className="bottom-sheet-handle" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3">
          <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text)' }}>
            {bubble.name} 공개 설정
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full"
            style={{ backgroundColor: 'var(--bg)' }}
          >
            <X size={16} style={{ color: 'var(--text-sub)' }} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 pb-4">
          <p className="mb-3" style={{ fontSize: '12px', color: 'var(--text-hint)' }}>
            이 버블에서 보이는 항목을 개별로 설정합니다
          </p>

          <div className="card overflow-hidden rounded-xl">
            {VISIBILITY_FIELDS.map((field) => (
              <div
                key={field.key}
                className="flex items-center justify-between px-4 py-3"
                style={{ borderBottom: '1px solid var(--border)' }}
              >
                <span style={{ fontSize: '14px', color: 'var(--text)' }}>{field.label}</span>
                <Toggle
                  checked={config[field.key]}
                  onChange={() => handleToggle(field.key)}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 pb-8 pt-2">
          <button
            type="button"
            onClick={() => { onSave(config); onClose() }}
            className="btn-primary w-full rounded-xl py-3 text-center"
          >
            저장
          </button>
        </div>
      </div>
    </>
  )
}
