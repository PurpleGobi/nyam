'use client'

import { Share2, Pencil, Trash2, X } from 'lucide-react'

interface RecordActionSheetProps {
  isOpen: boolean
  onClose: () => void
  onEdit: () => void
  onShare: () => void
  onDelete: () => void
}

export function RecordActionSheet({ isOpen, onClose, onEdit, onShare, onDelete }: RecordActionSheetProps) {
  if (!isOpen) return null

  return (
    <>
      {/* 백드롭 */}
      <div
        className="fixed inset-0 z-[200] bg-black/40"
        onClick={onClose}
      />

      {/* 시트 */}
      <div
        className="fixed inset-x-0 bottom-0 z-[201] rounded-t-2xl"
        style={{ backgroundColor: 'var(--bg)', paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <div className="flex items-center justify-between px-5 py-4">
          <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text)' }}>
            기록 관리
          </span>
          <button type="button" onClick={onClose}>
            <X size={20} style={{ color: 'var(--text-hint)' }} />
          </button>
        </div>

        <div className="flex flex-col gap-1 px-4 pb-4">
          <button
            type="button"
            onClick={onEdit}
            className="flex items-center gap-3 rounded-xl px-4 py-3 transition-colors hover:bg-[var(--bg-elevated)]"
          >
            <Pencil size={18} style={{ color: 'var(--accent-food)' }} />
            <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text)' }}>수정</span>
          </button>
          <button
            type="button"
            onClick={onShare}
            className="flex items-center gap-3 rounded-xl px-4 py-3 transition-colors hover:bg-[var(--bg-elevated)]"
          >
            <Share2 size={18} style={{ color: 'var(--text-sub)' }} />
            <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text)' }}>버블에 공유</span>
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="flex items-center gap-3 rounded-xl px-4 py-3 transition-colors hover:bg-[var(--bg-elevated)]"
          >
            <Trash2 size={18} style={{ color: 'var(--negative)' }} />
            <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--negative)' }}>삭제</span>
          </button>
        </div>
      </div>
    </>
  )
}
