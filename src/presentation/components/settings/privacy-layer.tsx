'use client'

import { useState, useRef, useEffect } from 'react'
import { ChevronDown } from 'lucide-react'

interface PrivacyLayerProps {
  visible: boolean
  dotColor: string
  title: string
  note?: string
  children: React.ReactNode
}

export function PrivacyLayer({ visible, dotColor, title, note, children }: PrivacyLayerProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const contentRef = useRef<HTMLDivElement>(null)
  const [contentHeight, setContentHeight] = useState(0)

  useEffect(() => {
    if (contentRef.current) {
      setContentHeight(contentRef.current.scrollHeight)
    }
  }, [children, isExpanded])

  if (!visible) return null

  return (
    <div style={{ borderBottom: '1px solid var(--border)' }}>
      <button
        type="button"
        onClick={() => setIsExpanded((prev) => !prev)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left"
      >
        <div
          className="h-2 w-2 shrink-0 rounded-full"
          style={{ backgroundColor: dotColor }}
        />
        <span className="flex-1" style={{ fontSize: '14px', color: 'var(--text)' }}>
          {title}
        </span>
        <ChevronDown
          size={16}
          style={{
            color: 'var(--text-hint)',
            transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s ease',
          }}
        />
      </button>

      {note && isExpanded && (
        <p className="px-4 pb-2" style={{ fontSize: '12px', color: 'var(--text-hint)' }}>
          {note}
        </p>
      )}

      <div
        style={{
          maxHeight: isExpanded ? `${contentHeight}px` : '0px',
          opacity: isExpanded ? 1 : 0,
          overflow: 'hidden',
          transition: isExpanded
            ? 'max-height 0.35s ease, opacity 0.35s ease'
            : 'max-height 0.25s ease, opacity 0.25s ease',
        }}
      >
        <div ref={contentRef} className="px-4 pb-3">
          {children}
        </div>
      </div>
    </div>
  )
}
