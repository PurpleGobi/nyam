'use client'

import { Search } from 'lucide-react'

interface LoadingStateProps {
  message?: string
  icon?: React.ElementType
}

export function LoadingState({ message = '로딩 중...', icon: Icon = Search }: LoadingStateProps) {
  return (
    <div className="loading-state">
      <Icon size={24} />
      <span>{message}</span>
    </div>
  )
}
