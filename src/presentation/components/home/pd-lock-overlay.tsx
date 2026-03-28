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
    <div className="relative rounded-xl">
      {/* Blurred content preview */}
      <div className="pointer-events-none select-none" style={{ filter: 'blur(6px)' }}>
        {children}
      </div>

      {/* Lock overlay */}
      <div
        className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-[4px] rounded-xl"
        style={{
          background: 'rgba(248,246,243,0.85)',
          backdropFilter: 'blur(6px)',
          WebkitBackdropFilter: 'blur(6px)',
        }}
      >
        <Lock size={20} style={{ color: 'var(--text-hint)' }} />
        <p
          className="text-[12px]"
          style={{ fontWeight: 600, color: 'var(--text-hint)' }}
        >
          기록 {remaining}개 더 남으면 열려요
        </p>
      </div>
    </div>
  )
}
