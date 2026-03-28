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
        className="absolute flex items-center justify-center rounded-full transition-transform active:scale-90"
        style={{
          bottom: '28px',
          left: '16px',
          width: '44px',
          height: '44px',
          backgroundColor: 'rgba(248,246,243,0.88)',
          backdropFilter: 'blur(12px)',
          border: '1px solid var(--border)',
          boxShadow: '0 2px 12px rgba(0,0,0,0.12)',
          zIndex: 85,
        }}
      >
        <ChevronLeft size={22} style={{ color: 'var(--text)' }} />
      </button>

      {/* 추가 FAB — 우하단 */}
      <button
        type="button"
        onClick={onAdd}
        className="absolute flex items-center justify-center rounded-full transition-transform active:scale-90"
        style={{
          bottom: '28px',
          right: '16px',
          width: '44px',
          height: '44px',
          backgroundColor: 'rgba(248,246,243,0.88)',
          backdropFilter: 'blur(12px)',
          border: '1px solid var(--border)',
          boxShadow: '0 2px 12px rgba(0,0,0,0.12)',
          zIndex: 85,
        }}
      >
        <Plus size={22} style={{ color: 'var(--text)' }} />
      </button>
    </>
  )
}
