'use client'

import { useRef, useEffect, useState } from 'react'

interface PrivacyLayerProps {
  visible: boolean
  dotColor: string
  title: string
  note?: string
  children: React.ReactNode
}

export function PrivacyLayer({ visible, dotColor, title, note, children }: PrivacyLayerProps) {
  const contentRef = useRef<HTMLDivElement>(null)
  const [contentHeight, setContentHeight] = useState(0)

  useEffect(() => {
    if (contentRef.current) {
      setContentHeight(contentRef.current.scrollHeight)
    }
  }, [children, visible])

  return (
    <div
      style={{
        maxHeight: visible ? `${contentHeight + 80}px` : '0px',
        opacity: visible ? 1 : 0,
        overflow: 'hidden',
        transition: visible
          ? 'max-height 0.35s ease, opacity 0.35s ease'
          : 'max-height 0.25s ease, opacity 0.25s ease',
      }}
    >
      <div ref={contentRef} style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="flex items-center gap-3 px-4 py-3">
          <div
            className="h-2 w-2 shrink-0 rounded-full"
            style={{ backgroundColor: dotColor }}
          />
          <span style={{ fontSize: '14px', color: 'var(--text)' }}>
            {title}
          </span>
        </div>

        {note && (
          <p className="px-4 pb-2" style={{ fontSize: '12px', color: 'var(--text-hint)' }}>
            {note}
          </p>
        )}

        <div className="px-4 pb-3">
          {children}
        </div>
      </div>
    </div>
  )
}
