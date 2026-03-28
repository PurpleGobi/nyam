'use client'

import { Plus } from 'lucide-react'

interface FabAddProps {
  currentTab: 'restaurant' | 'wine'
  onClick: () => void
}

export function FabAdd({ currentTab, onClick }: FabAddProps) {
  return (
    <button type="button" onClick={onClick} className="fab-add">
      <Plus size={22} />
    </button>
  )
}
