'use client'

import { ChevronLeft } from 'lucide-react'
import { FabAdd } from '@/presentation/components/layout/fab-add'

interface DetailFabProps {
  onBack: () => void
  onAdd: () => void
  variant?: 'food' | 'wine'
}

export function DetailFab({ onBack, onAdd, variant = 'food' }: DetailFabProps) {
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
      <FabAdd variant={variant} onClick={onAdd} />
    </>
  )
}
