'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

interface ToastProps {
  message: string
  visible: boolean
  duration?: number
  onHide?: () => void
}

export function Toast({ message, visible, duration = 2000, onHide }: ToastProps) {
  const [show, setShow] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const dismiss = useCallback(() => {
    setShow(false)
    onHide?.()
  }, [onHide])

  useEffect(() => {
    if (!visible) return
    const frame = requestAnimationFrame(() => setShow(true))
    timerRef.current = setTimeout(dismiss, duration)
    return () => {
      cancelAnimationFrame(frame)
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [visible, duration, dismiss])

  if (!show) return null

  return <div className="toast">{message}</div>
}
