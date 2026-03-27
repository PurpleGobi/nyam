'use client'

import { useEffect, useState, useCallback } from 'react'

interface AiGreetingProps {
  title: string
  description: string
  onDismiss: () => void
  onClick?: () => void
}

export function AiGreeting({ title, description, onDismiss, onClick }: AiGreetingProps) {
  const [collapsed, setCollapsed] = useState(false)
  const [shouldRender, setShouldRender] = useState(true)

  const collapse = useCallback(() => {
    setCollapsed(true)
    setTimeout(() => {
      setShouldRender(false)
      onDismiss()
    }, 600)
  }, [onDismiss])

  useEffect(() => {
    const timer = setTimeout(collapse, 5000)
    return () => clearTimeout(timer)
  }, [collapse])

  if (!shouldRender) return null

  return (
    <button
      type="button"
      onClick={onClick}
      className="mx-4 rounded-xl px-4 py-3 text-left"
      style={{
        backgroundColor: 'var(--bg-card)',
        border: '1px solid var(--border)',
        opacity: collapsed ? 0 : 1,
        maxHeight: collapsed ? '0px' : '80px',
        overflow: 'hidden',
        transition: 'opacity 0.5s ease, max-height 0.5s ease',
      }}
    >
      <p style={{ fontSize: '14px', color: 'var(--text)', lineHeight: 1.5 }}>
        <strong>{title}</strong>
        <br />
        {description}
      </p>
      <div className="mt-1 flex items-center gap-1">
        <span
          style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--accent-food), var(--accent-wine))',
            display: 'inline-block',
          }}
        />
        <span style={{ fontSize: '11px', color: 'var(--text-hint)' }}>nyam AI · 나의 기록 기반</span>
      </div>
    </button>
  )
}
