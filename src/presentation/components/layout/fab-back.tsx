'use client'

import { ChevronLeft } from 'lucide-react'
import { useBackNavigation } from '@/presentation/hooks/use-back-navigation'

interface FabBackProps {
  onClick?: () => void
}

export function FabBack({ onClick }: FabBackProps) {
  const { goBack } = useBackNavigation()

  return (
    <button type="button" onClick={onClick ?? goBack} className="fab-back">
      <ChevronLeft size={22} />
    </button>
  )
}
