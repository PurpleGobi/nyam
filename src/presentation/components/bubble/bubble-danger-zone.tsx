'use client'

import { useState } from 'react'
import { AlertTriangle } from 'lucide-react'

interface BubbleDangerZoneProps {
  bubbleName: string
  onConfirm: () => void
  onCancel: () => void
  isLoading: boolean
}

export function BubbleDangerZone({ bubbleName, onConfirm, onCancel, isLoading }: BubbleDangerZoneProps) {
  const [confirmText, setConfirmText] = useState('')
  const isMatch = confirmText === bubbleName

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-6" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="w-full max-w-[340px] rounded-2xl p-5" style={{ backgroundColor: 'var(--bg-elevated)' }}>
        <div className="flex flex-col items-center gap-3">
          <div
            className="flex h-12 w-12 items-center justify-center rounded-full"
            style={{ backgroundColor: 'var(--negative-light, rgba(239,68,68,0.1))' }}
          >
            <AlertTriangle size={24} style={{ color: 'var(--negative)' }} />
          </div>

          <span className="text-[16px] font-bold text-[var(--text)]">버블을 삭제하시겠습니까?</span>

          <p className="text-center text-[13px] leading-snug text-[var(--text-sub)]">
            삭제하면 모든 멤버, 공유 기록, 댓글이 영구적으로 삭제됩니다. 이 작업은 되돌릴 수 없습니다.
          </p>

          <div className="w-full">
            <p className="mb-1 text-[12px] text-[var(--text-hint)]">
              확인을 위해 <strong>&quot;{bubbleName}&quot;</strong>을 입력하세요
            </p>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={bubbleName}
              className="nyam-input text-[13px]"
            />
          </div>

          <div className="flex w-full gap-2 pt-1">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 rounded-xl py-3 text-center text-[13px] font-semibold text-[var(--text)]"
              style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}
            >
              취소
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={!isMatch || isLoading}
              className="flex-1 rounded-xl py-3 text-center text-[13px] font-bold transition-opacity disabled:opacity-40"
              style={{ backgroundColor: 'var(--negative)', color: '#FFFFFF' }}
            >
              {isLoading ? '삭제 중...' : '삭제'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
