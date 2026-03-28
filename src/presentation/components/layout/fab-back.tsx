'use client'

import { ChevronLeft } from 'lucide-react'

interface FabBackProps {
  onClick: () => void
}

export function FabBack({ onClick }: FabBackProps) {
  return (
    <button type="button" onClick={onClick} className="fab-back">
      <ChevronLeft size={22} />
    </button>
  )
}
