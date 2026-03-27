'use client'

import type { ReactNode } from 'react'
import { Lock } from 'lucide-react'

interface PdLockOverlayProps {
  minRecords: number
  currentCount: number
  children: ReactNode
}

export function PdLockOverlay({ minRecords, currentCount, children }: PdLockOverlayProps) {
  const isLocked = currentCount < minRecords
  const remaining = minRecords - currentCount

  if (!isLocked) {
    return <>{children}</>
  }

  return (
    <div className="relative">
      {/* Blurred content */}
      <div className="pointer-events-none select-none" style={{ filter: 'blur(6px)' }}>
        {children}
      </div>

      {/* Lock overlay */}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-xl">
        <div
          className="flex h-10 w-10 items-center justify-center rounded-full"
          style={{ backgroundColor: 'var(--bg)', border: '1px solid var(--border)' }}
        >
          <Lock size={18} style={{ color: 'var(--text-hint)' }} />
        </div>
        <p className="text-center text-[12px]" style={{ color: 'var(--text-sub)' }}>
          {remaining}개 더 기록하면 열려요
        </p>
      </div>
    </div>
  )
}
