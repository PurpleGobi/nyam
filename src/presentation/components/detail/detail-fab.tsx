'use client'

import { ChevronLeft, Plus } from 'lucide-react'

interface DetailFabProps {
  onBack: () => void
  onAdd: () => void
}

export function DetailFab({ onBack, onAdd }: DetailFabProps) {
  return (
    <>
      {/* 뒤로 FAB — 좌하단 */}
      <button
        type="button"
        onClick={onBack}
        className="fab-back"
      >
        <ChevronLeft size={22} style={{ color: 'var(--text)' }} />
      </button>

      {/* 추가 FAB — 우하단 */}
      <button
        type="button"
        onClick={onAdd}
        className="fab-add"
      >
        <Plus size={22} style={{ color: 'var(--text)' }} />
      </button>
    </>
  )
}
