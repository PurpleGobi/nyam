'use client'

import type { ReactNode } from 'react'
import { Lock } from 'lucide-react'

interface PdLockOverlayProps {
  minRecords: number
  currentCount: number
  accentColor?: string
  children: ReactNode
}

export function PdLockOverlay({
  minRecords,
  currentCount,
  accentColor = 'var(--text-hint)',
  children,
}: PdLockOverlayProps) {
  const isLocked = currentCount < minRecords
  const remaining = minRecords - currentCount

  if (!isLocked) {
    return <>{children}</>
  }

  return (
    <div className="relative overflow-hidden rounded-[14px]">
      {/* Blurred content preview */}
      <div className="pointer-events-none select-none" style={{ filter: 'blur(6px)', opacity: 0.5 }}>
        {children}
      </div>

      {/* Lock overlay */}
      <div
        className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-[6px] rounded-[14px]"
        style={{
          background: 'color-mix(in srgb, var(--bg-card) 85%, transparent)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
        }}
      >
        <div
          className="flex items-center justify-center rounded-full"
          style={{
            width: 36,
            height: 36,
            backgroundColor: 'color-mix(in srgb, var(--border) 60%, transparent)',
          }}
        >
          <Lock size={16} style={{ color: accentColor }} />
        </div>
        <p
          className="text-[13px] font-semibold"
          style={{ color: 'var(--text-sub)' }}
        >
          기록 {remaining}개 더 추가하면 열려요
        </p>
        <p
          className="text-[11px]"
          style={{ color: 'var(--text-hint)' }}
        >
          현재 {currentCount}개 / {minRecords}개 필요
        </p>
      </div>
    </div>
  )
}
