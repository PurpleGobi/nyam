'use client'

import { useEffect, useState } from 'react'
import { X, AlertTriangle, EyeOff, Trash2 } from 'lucide-react'
import type { DeleteMode } from '@/domain/entities/settings'

interface DeleteAccountSheetProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (mode: DeleteMode) => void
}

const DELETE_OPTIONS: { mode: DeleteMode; icon: typeof EyeOff; title: string; desc: string }[] = [
  { mode: 'anonymize', icon: EyeOff, title: '익명화', desc: '기록은 남기되 개인정보를 삭제합니다' },
  { mode: 'hard_delete', icon: Trash2, title: '완전 삭제', desc: '모든 데이터를 영구 삭제합니다' },
]

export function DeleteAccountSheet({ isOpen, onClose, onConfirm }: DeleteAccountSheetProps) {
  const [selectedMode, setSelectedMode] = useState<DeleteMode>('anonymize')

  useEffect(() => {
    if (!isOpen) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [isOpen, onClose])

  if (!isOpen) return null

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
        style={{ maxHeight: '75%', backgroundColor: 'var(--bg-elevated)', animation: 'slide-up 0.25s ease' }}
      >
        {/* Handle */}
        <div className="flex justify-center pt-2 pb-1">
          <div className="h-1 w-10 rounded-full" style={{ backgroundColor: 'var(--border-bold)' }} />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3">
          <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text)' }}>계정 삭제</h2>
          <button type="button" onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full" style={{ backgroundColor: 'var(--bg)' }}>
            <X size={16} style={{ color: 'var(--text-sub)' }} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 pb-4">
          <div className="flex flex-col items-center">
            <div
              className="flex h-12 w-12 items-center justify-center rounded-full"
              style={{ backgroundColor: 'color-mix(in srgb, var(--negative) 15%, transparent)' }}
            >
              <AlertTriangle size={24} style={{ color: 'var(--negative)' }} />
            </div>

            <p className="mt-3 text-center" style={{ fontSize: '14px', color: 'var(--text-sub)', lineHeight: 1.6 }}>
              삭제를 요청하면 30일간 복구 가능합니다. 30일 후 선택한 모드에 따라 처리됩니다.
            </p>
          </div>

          {/* Mode selection */}
          <div className="mt-4 flex flex-col gap-3">
            {DELETE_OPTIONS.map((opt) => {
              const isSelected = selectedMode === opt.mode
              return (
                <button
                  key={opt.mode}
                  type="button"
                  onClick={() => setSelectedMode(opt.mode)}
                  className="flex items-start gap-3 rounded-xl px-4 py-3 text-left transition-colors"
                  style={{
                    border: `2px solid ${isSelected ? 'var(--negative)' : 'var(--border)'}`,
                    backgroundColor: isSelected ? 'color-mix(in srgb, var(--negative) 5%, transparent)' : 'var(--bg-card)',
                  }}
                >
                  <div
                    className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                    style={{ backgroundColor: `color-mix(in srgb, var(--negative) 15%, transparent)` }}
                  >
                    <opt.icon size={16} style={{ color: 'var(--negative)' }} />
                  </div>
                  <div>
                    <p style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text)' }}>{opt.title}</p>
                    <p style={{ fontSize: '12px', color: 'var(--text-hint)', marginTop: '2px' }}>{opt.desc}</p>
                  </div>
                  {/* Radio indicator */}
                  <div className="ml-auto mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full" style={{ border: `2px solid ${isSelected ? 'var(--negative)' : 'var(--border)'}` }}>
                    {isSelected && <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: 'var(--negative)' }} />}
                  </div>
                </button>
              )
            })}
          </div>

          {/* Info box */}
          <div
            className="mt-4 rounded-xl px-4 py-3"
            style={{ backgroundColor: 'color-mix(in srgb, var(--negative) 5%, transparent)' }}
          >
            <ul className="flex flex-col gap-1.5" style={{ fontSize: '13px', color: 'var(--text-sub)' }}>
              <li>• 가입한 버블에서 자동 탈퇴됩니다</li>
              <li>• 버블 owner인 경우 소유권 이전이 필요합니다</li>
              <li>• 모든 팔로우/팔로워 관계가 삭제됩니다</li>
              <li>• 소셜 로그인 연동이 해제됩니다</li>
            </ul>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 px-4 pb-8 pt-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl py-3 text-center"
            style={{ fontSize: '15px', fontWeight: 600, border: '1px solid var(--border)', color: 'var(--text-sub)' }}
          >
            취소
          </button>
          <button
            type="button"
            onClick={() => onConfirm(selectedMode)}
            className="flex-1 rounded-xl py-3 text-center"
            style={{ fontSize: '15px', fontWeight: 700, backgroundColor: 'var(--negative)', color: '#FFFFFF' }}
          >
            계정 삭제 요청
          </button>
        </div>
      </div>
    </>
  )
}
