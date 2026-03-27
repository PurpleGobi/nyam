'use client'

import { Edit2, Trash2 } from 'lucide-react'

interface RecordActionsProps {
  onEdit: () => void
  onDelete: () => void
}

export function RecordActions({ onEdit, onDelete }: RecordActionsProps) {
  return (
    <div className="flex gap-3">
      <button
        type="button"
        onClick={onEdit}
        className="flex flex-1 items-center justify-center gap-2 rounded-xl py-3"
        style={{ border: '1px solid var(--border)', fontSize: '14px', fontWeight: 600, color: 'var(--text)' }}
      >
        <Edit2 size={16} /> 수정하기
      </button>
      <button
        type="button"
        onClick={onDelete}
        className="flex flex-1 items-center justify-center gap-2 rounded-xl py-3"
        style={{ border: '1px solid var(--border)', fontSize: '14px', fontWeight: 600, color: 'var(--negative)' }}
      >
        <Trash2 size={16} /> 삭제하기
      </button>
    </div>
  )
}
