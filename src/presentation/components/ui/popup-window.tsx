'use client'

import { useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'

interface PopupWindowProps {
  isOpen: boolean
  onClose: () => void
  children: React.ReactNode
}

/**
 * 공통 팝업 윈도우 — 어두운 배경 + 블러 오버레이
 * Portal로 body에 직접 렌더링하여 부모 stacking context에 갇히지 않음.
 * 오버레이 클릭 또는 Escape 키로 닫힘.
 */
export function PopupWindow({ isOpen, onClose, children }: PopupWindowProps) {
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose()
  }, [onClose])

  useEffect(() => {
    if (!isOpen) return
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, handleKeyDown])

  if (!isOpen) return null

  return createPortal(
    <>
      <div
        className="popup-window-overlay"
        style={{ backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' }}
        onClick={onClose}
      />
      <div style={{ position: 'relative', zIndex: 200 }}>
        {children}
      </div>
    </>,
    document.body,
  )
}
