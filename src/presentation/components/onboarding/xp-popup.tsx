'use client'

import { useState, useEffect } from 'react'
import { Sparkles } from 'lucide-react'

interface XpPopupProps {
  amount: number
  isVisible: boolean
  onDismiss: () => void
}

export function XpPopup({ amount, isVisible, onDismiss }: XpPopupProps) {
  useEffect(() => {
    if (!isVisible) return
    const timer = setTimeout(onDismiss, 2000)
    return () => clearTimeout(timer)
  }, [isVisible, onDismiss])

  if (!isVisible && !isVisible) return null

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center pointer-events-none"
      style={{ opacity: isVisible ? 1 : 0, transition: 'opacity 300ms ease-out' }}
    >
      <div
        className="flex items-center gap-2 rounded-2xl px-6 py-4 shadow-lg"
        style={{
          backgroundColor: 'var(--accent-food)',
          transform: isVisible ? 'scale(1) translateY(0)' : 'scale(0.8) translateY(20px)',
          transition: 'transform 400ms cubic-bezier(0.34, 1.56, 0.64, 1)',
        }}
      >
        <Sparkles size={20} color="var(--text-inverse)" />
        <span className="text-[20px] font-extrabold" style={{ color: 'var(--text-inverse)' }}>+{amount} XP</span>
      </div>
    </div>
  )
}
