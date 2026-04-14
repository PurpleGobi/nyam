'use client'

import { useState } from 'react'
import type { VisibilityConfig } from '@/domain/entities/settings'
import { Toggle } from '@/presentation/components/settings/toggle'
import { BottomSheet } from '@/presentation/components/ui/bottom-sheet'

interface BubblePrivacySheetProps {
  isOpen: boolean
  onClose: () => void
  bubble: { id: string; name: string } | null
  defaultConfig: VisibilityConfig
  currentOverride: VisibilityConfig | null
  onSave: (override: VisibilityConfig | null) => void
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

export function BubblePrivacySheet({ isOpen, onClose, bubble, defaultConfig, currentOverride, onSave }: BubblePrivacySheetProps) {
  const [useCustom, setUseCustom] = useState(currentOverride !== null)
  const [config, setConfig] = useState<VisibilityConfig>(currentOverride ?? defaultConfig)
  const [prevOverride, setPrevOverride] = useState(currentOverride)

  if (currentOverride !== prevOverride) {
    setPrevOverride(currentOverride)
    setUseCustom(currentOverride !== null)
    setConfig(currentOverride ?? defaultConfig)
  }

  if (!bubble) return null

  const handleToggle = (key: keyof VisibilityConfig) => {
    setConfig((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const handleSave = () => {
    onSave(useCustom ? config : null)
    onClose()
  }

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title={`${bubble.name} 공개 설정`} maxHeight="75dvh">
      {/* Radio selection: 기본값 사용 / 커스텀 설정 */}
      <div className="mb-3 flex flex-col gap-2">
        <label className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5" style={{ border: `1.5px solid ${!useCustom ? 'var(--accent-social)' : 'var(--border)'}`, backgroundColor: !useCustom ? 'color-mix(in srgb, var(--accent-social) 6%, transparent)' : 'transparent' }}>
          <input type="radio" name="privacyMode" checked={!useCustom} onChange={() => setUseCustom(false)} className="sr-only" />
          <div className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full" style={{ border: `2px solid ${!useCustom ? 'var(--accent-social)' : 'var(--border)'}` }}>
            {!useCustom && <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: 'var(--accent-social)' }} />}
          </div>
          <div>
            <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)' }}>기본값 사용</p>
            <p style={{ fontSize: '11px', color: 'var(--text-hint)', marginTop: '2px' }}>버블 멤버 기본 공개 설정을 따릅니다</p>
          </div>
        </label>

        <label className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5" style={{ border: `1.5px solid ${useCustom ? 'var(--accent-social)' : 'var(--border)'}`, backgroundColor: useCustom ? 'color-mix(in srgb, var(--accent-social) 6%, transparent)' : 'transparent' }}>
          <input type="radio" name="privacyMode" checked={useCustom} onChange={() => setUseCustom(true)} className="sr-only" />
          <div className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full" style={{ border: `2px solid ${useCustom ? 'var(--accent-social)' : 'var(--border)'}` }}>
            {useCustom && <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: 'var(--accent-social)' }} />}
          </div>
          <div>
            <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)' }}>커스텀 설정</p>
            <p style={{ fontSize: '11px', color: 'var(--text-hint)', marginTop: '2px' }}>이 버블에서 보이는 항목을 개별로 설정합니다</p>
          </div>
        </label>
      </div>

      {/* 커스텀 선택 시에만 Toggle 목록 노출 */}
      <div
        style={{
          maxHeight: useCustom ? '500px' : '0px',
          opacity: useCustom ? 1 : 0,
          overflow: 'hidden',
          transition: useCustom
            ? 'max-height 0.35s ease, opacity 0.35s ease'
            : 'max-height 0.25s ease, opacity 0.25s ease',
        }}
      >
        <div className="card overflow-hidden rounded-xl">
          {VISIBILITY_FIELDS.map((field) => (
            <div key={field.key} className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
              <span style={{ fontSize: '14px', color: 'var(--text)' }}>{field.label}</span>
              <Toggle checked={config[field.key]} onChange={() => handleToggle(field.key)} />
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="mt-4">
        <button type="button" onClick={handleSave} className="btn-primary w-full rounded-xl py-3 text-center">
          저장
        </button>
      </div>
    </BottomSheet>
  )
}
