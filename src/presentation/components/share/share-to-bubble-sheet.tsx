'use client'

import { X } from 'lucide-react'

interface BubbleSelectItem {
  id: string
  name: string
  icon: string | null
  iconBgColor: string | null
  isAlreadyShared: boolean
}

interface ShareToBubbleSheetProps {
  isOpen: boolean
  onClose: () => void
  bubbles: BubbleSelectItem[]
  onShare: (bubbleId: string) => void
}

export function ShareToBubbleSheet({ isOpen, onClose, bubbles, onShare }: ShareToBubbleSheetProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div
        className="w-full max-w-[430px] rounded-t-2xl pb-8"
        style={{ backgroundColor: 'var(--bg-elevated)', maxHeight: '60vh' }}
      >
        <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
          <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text)' }}>버블에 공유</span>
          <button type="button" onClick={onClose}><X size={20} style={{ color: 'var(--text-sub)' }} /></button>
        </div>

        <div className="flex flex-col overflow-y-auto px-4 py-2" style={{ maxHeight: '40vh' }}>
          {bubbles.map((b) => (
            <button
              key={b.id}
              type="button"
              onClick={() => !b.isAlreadyShared && onShare(b.id)}
              disabled={b.isAlreadyShared}
              className="flex items-center gap-3 rounded-xl py-3 disabled:opacity-50"
            >
              <div
                className="flex h-10 w-10 items-center justify-center rounded-xl"
                style={{ backgroundColor: b.iconBgColor ?? 'var(--accent-social-light)', fontSize: '18px' }}
              >
                {b.icon ?? '🫧'}
              </div>
              <span className="flex-1 text-left text-[14px] font-semibold text-[var(--text)]">{b.name}</span>
              {b.isAlreadyShared && (
                <span className="text-[12px] text-[var(--text-hint)]">공유됨</span>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
