'use client'

import { useRef, useEffect, useState } from 'react'
import { SettingsCard } from './settings-card'

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
        maxHeight: visible ? `${contentHeight + 100}px` : '0px',
        opacity: visible ? 1 : 0,
        overflow: 'hidden',
        transition: visible
          ? 'max-height 0.35s ease, opacity 0.35s ease'
          : 'max-height 0.25s ease, opacity 0.25s ease',
        pointerEvents: visible ? 'auto' : 'none',
        padding: visible ? '0 20px 0' : '0 20px',
      }}
    >
      <div ref={contentRef}>
        <div className="flex items-center gap-2" style={{ padding: '10px 16px 6px' }}>
          <div
            className="shrink-0 rounded-full"
            style={{ width: '8px', height: '8px', backgroundColor: dotColor }}
          />
          <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-sub)' }}>
            {title}
          </span>
        </div>

        <SettingsCard>
          {children}
        </SettingsCard>

        {note && (
          <p style={{ fontSize: '11px', color: 'var(--text-hint)', lineHeight: 1.5, padding: '6px 4px 0' }}>
            {note}
          </p>
        )}
      </div>
    </div>
  )
}
