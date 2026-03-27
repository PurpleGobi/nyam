'use client'

import { ChevronLeft, Plus } from 'lucide-react'

interface DetailFabProps {
  variant: 'food' | 'wine'
  onBack: () => void
  onAdd: () => void
}

export function DetailFab({ variant, onBack, onAdd }: DetailFabProps) {
  const accentColor = variant === 'food' ? 'var(--accent-food)' : 'var(--accent-wine)'

  return (
    <>
      {/* 뒤로 FAB */}
      <button
        type="button"
        onClick={onBack}
        className="fixed left-4 top-[env(safe-area-inset-top,12px)] z-50 flex h-10 w-10 items-center justify-center rounded-full"
        style={{
          marginTop: '12px',
          backgroundColor: 'rgba(0,0,0,0.3)',
          backdropFilter: 'blur(8px)',
        }}
      >
        <ChevronLeft size={22} color="#FFFFFF" />
      </button>

      {/* 추가 FAB */}
      <button
        type="button"
        onClick={onAdd}
        className="fixed bottom-6 right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-transform active:scale-90"
        style={{
          backgroundColor: accentColor,
          marginBottom: 'env(safe-area-inset-bottom, 0px)',
        }}
      >
        <Plus size={28} color="#FFFFFF" />
      </button>
    </>
  )
}
