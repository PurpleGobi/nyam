'use client'

import { useEffect } from 'react'
import { X, AlertTriangle } from 'lucide-react'

interface DeleteAccountSheetProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
}

export function DeleteAccountSheet({ isOpen, onClose, onConfirm }: DeleteAccountSheetProps) {
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
        style={{
          backgroundColor: 'var(--bg-elevated)',
          animation: 'slide-up 0.25s ease',
        }}
      >
        {/* Handle */}
        <div className="flex justify-center pt-2 pb-1">
          <div className="h-1 w-10 rounded-full" style={{ backgroundColor: 'var(--border-bold)' }} />
        </div>

        {/* Content */}
        <div className="px-4 py-6">
          <div className="flex flex-col items-center">
            <div
              className="flex h-12 w-12 items-center justify-center rounded-full"
              style={{ backgroundColor: 'color-mix(in srgb, var(--negative) 15%, transparent)' }}
            >
              <AlertTriangle size={24} style={{ color: 'var(--negative)' }} />
            </div>

            <h2 className="mt-4" style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text)' }}>
              계정을 삭제하시겠습니까?
            </h2>

            <p className="mt-2 text-center" style={{ fontSize: '14px', color: 'var(--text-sub)', lineHeight: 1.6 }}>
              계정 삭제를 요청하면 <strong style={{ color: 'var(--negative)' }}>30일의 유예기간</strong> 후
              모든 데이터가 영구 삭제됩니다.
            </p>

            <div
              className="mt-4 w-full rounded-xl px-4 py-3"
              style={{ backgroundColor: 'color-mix(in srgb, var(--negative) 5%, transparent)' }}
            >
              <ul className="flex flex-col gap-1.5" style={{ fontSize: '13px', color: 'var(--text-sub)' }}>
                <li>- 30일 내 재로그인 시 삭제가 취소됩니다</li>
                <li>- 모든 기록, 경험치, 버블 데이터가 삭제됩니다</li>
                <li>- 삭제된 데이터는 복구할 수 없습니다</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 px-4 pb-8">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl py-3 text-center"
            style={{
              fontSize: '15px',
              fontWeight: 600,
              border: '1px solid var(--border)',
              color: 'var(--text-sub)',
            }}
          >
            취소
          </button>
          <button
            type="button"
            onClick={() => { onConfirm(); onClose() }}
            className="flex-1 rounded-xl py-3 text-center"
            style={{
              fontSize: '15px',
              fontWeight: 700,
              backgroundColor: 'var(--negative)',
              color: '#FFFFFF',
            }}
          >
            계정 삭제
          </button>
        </div>
      </div>
    </>
  )
}
