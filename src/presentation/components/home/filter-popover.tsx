'use client'

import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'

/* ── 포탈 팝오버 (버튼 기준 위치) ── */
export function FilterPopover({
  anchorRef,
  align = 'left',
  children,
  onClose,
}: {
  anchorRef: React.RefObject<HTMLButtonElement | null>
  align?: 'left' | 'right'
  children: React.ReactNode
  onClose: () => void
}) {
  const popRef = useRef<HTMLDivElement>(null)
  const [style, setStyle] = useState<React.CSSProperties>({})

  useEffect(() => {
    const btn = anchorRef.current
    if (!btn) return
    const r = btn.getBoundingClientRect()
    const popWidth = 170
    if (align === 'right') {
      if (r.right < popWidth + 8) {
        setStyle({ top: r.bottom + 4, left: Math.max(8, r.left) })
      } else {
        setStyle({ top: r.bottom + 4, right: window.innerWidth - r.right })
      }
    } else {
      setStyle({ top: r.bottom + 4, left: r.left })
    }
  }, [anchorRef, align])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (popRef.current?.contains(e.target as Node)) return
      if (anchorRef.current?.contains(e.target as Node)) return
      onClose()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [anchorRef, onClose])

  return createPortal(
    <div
      ref={popRef}
      className="fixed z-[200] min-w-[170px] rounded-xl py-1 shadow-lg"
      style={{
        ...style,
        backgroundColor: 'var(--bg-elevated)',
        border: '1px solid var(--border)',
        maxHeight: '340px',
        overflowY: 'auto',
      }}
    >
      {children}
    </div>,
    document.body,
  )
}
