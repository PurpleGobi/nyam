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
        className="fixed inset-0 z-[190]"
        style={{ backgroundColor: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        className="fixed inset-x-0 bottom-0 z-[200] flex flex-col rounded-t-2xl"
        style={{
          maxHeight: '70dvh',
          backgroundColor: 'var(--bg-elevated)',
          animation: 'slide-up 0.25s ease',
        }}
      >
        {/* Handle */}
        <div className="flex justify-center pt-2 pb-1">
          <div className="h-1 w-10 rounded-full" style={{ backgroundColor: 'var(--border-bold)' }} />
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

          <div
            className="overflow-hidden rounded-xl"
            style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}
          >
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
            className="w-full rounded-xl py-3 text-center"
            style={{
              fontSize: '15px',
              fontWeight: 700,
              backgroundColor: 'var(--accent-food)',
              color: '#FFFFFF',
            }}
          >
            저장
          </button>
        </div>
      </div>
    </>
  )
}
