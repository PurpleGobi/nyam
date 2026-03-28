'use client'

import { useState, useCallback, useEffect } from 'react'

export function useDropdown(containerRef: React.RefObject<HTMLElement | null>) {
  const [isOpen, setIsOpen] = useState(false)

  const toggle = useCallback(() => setIsOpen((prev) => !prev), [])
  const close = useCallback(() => setIsOpen(false), [])

  useEffect(() => {
    if (!isOpen) return

    const handleKeydown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }

    const handleMousedown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        close()
      }
    }

    document.addEventListener('keydown', handleKeydown)
    document.addEventListener('mousedown', handleMousedown)
    return () => {
      document.removeEventListener('keydown', handleKeydown)
      document.removeEventListener('mousedown', handleMousedown)
    }
  }, [isOpen, close, containerRef])

  return { isOpen, toggle, close }
}
