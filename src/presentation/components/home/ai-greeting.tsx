'use client'

import { useEffect, useState } from 'react'
import { X } from 'lucide-react'

interface AiGreetingProps {
  message: string
  onDismiss: () => void
}

export function AiGreeting({ message, onDismiss }: AiGreetingProps) {
  const [opacity, setOpacity] = useState(1)
  const [shouldRender, setShouldRender] = useState(true)

  useEffect(() => {
    const fadeTimer = setTimeout(() => {
      setOpacity(0)
    }, 4400)

    const removeTimer = setTimeout(() => {
      setShouldRender(false)
      onDismiss()
    }, 5000)

    return () => {
      clearTimeout(fadeTimer)
      clearTimeout(removeTimer)
    }
  }, [onDismiss])

  if (!shouldRender) return null

  return (
    <div
      className="mx-4 flex items-center justify-between rounded-xl px-4 py-3"
      style={{
        backgroundColor: 'var(--bg-card)',
        border: '1px solid var(--border)',
        opacity,
        transition: 'opacity 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
      }}
    >
      <p
        className="min-w-0 flex-1 truncate text-[14px] font-medium"
        style={{ color: 'var(--text)' }}
      >
        {message}
      </p>
      <button
        type="button"
        onClick={() => {
          setOpacity(0)
          setTimeout(() => {
            setShouldRender(false)
            onDismiss()
          }, 600)
        }}
        className="ml-2 shrink-0"
        style={{ color: 'var(--text-hint)' }}
      >
        <X size={14} />
      </button>
    </div>
  )
}
