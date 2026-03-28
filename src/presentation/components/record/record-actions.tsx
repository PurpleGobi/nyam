'use client'

import { Edit2, Trash2, Share2 } from 'lucide-react'

interface RecordActionsProps {
  onEdit: () => void
  onDelete: () => void
  onShare?: () => void
}

export function RecordActions({ onEdit, onDelete, onShare }: RecordActionsProps) {
  return (
    <div className="flex gap-3">
      <button
        type="button"
        onClick={onEdit}
        className="flex flex-1 items-center justify-center gap-2 rounded-xl py-3"
        style={{ border: '1px solid var(--border)', fontSize: '14px', fontWeight: 600, color: 'var(--text)' }}
      >
        <Edit2 size={16} /> 수정
      </button>
      {onShare && (
        <button
          type="button"
          onClick={onShare}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl py-3"
          style={{ border: '1px solid var(--border)', fontSize: '14px', fontWeight: 600, color: 'var(--accent-social)' }}
        >
          <Share2 size={16} /> 공유
        </button>
      )}
      <button
        type="button"
        onClick={onDelete}
        className="flex flex-1 items-center justify-center gap-2 rounded-xl py-3"
        style={{ border: '1px solid var(--border)', fontSize: '14px', fontWeight: 600, color: 'var(--negative)' }}
      >
        <Trash2 size={16} /> 삭제
      </button>
    </div>
  )
}
