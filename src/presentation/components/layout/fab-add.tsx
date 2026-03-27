'use client'

import { Plus } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface FabAddProps {
  currentTab: 'restaurant' | 'wine'
}

export function FabAdd({ currentTab }: FabAddProps) {
  const router = useRouter()
  const accentColor = currentTab === 'restaurant' ? 'var(--accent-food)' : 'var(--accent-wine)'

  return (
    <button
      type="button"
      onClick={() => router.push(`/add?type=${currentTab}`)}
      className="fixed z-50 flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-transform active:scale-90"
      style={{
        bottom: '28px',
        right: '16px',
        backgroundColor: accentColor,
        marginBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      <Plus size={28} color="#FFFFFF" />
    </button>
  )
}
