'use client'

import { ChevronLeft } from 'lucide-react'
import { FabAdd } from '@/presentation/components/layout/fab-add'

interface FabMenuItem {
  key: string
  icon: React.ReactNode
  label: string
  onClick: () => void
}

interface DetailFabProps {
  onBack: () => void
  onAdd: () => void
  variant?: 'food' | 'wine'
  menuItems?: FabMenuItem[]
}

export function DetailFab({ onBack, onAdd, variant = 'food', menuItems }: DetailFabProps) {
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
      <FabAdd variant={variant} menuItems={menuItems} onClick={menuItems ? undefined : onAdd} />
    </>
  )
}
