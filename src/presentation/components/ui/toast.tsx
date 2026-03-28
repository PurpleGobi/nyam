'use client'

import { useEffect, useState } from 'react'

interface ToastProps {
  message: string
  visible: boolean
  duration?: number
  onHide?: () => void
}

export function Toast({ message, visible, duration = 2000, onHide }: ToastProps) {
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (visible) {
      setShow(true)
      const timer = setTimeout(() => {
        setShow(false)
        onHide?.()
      }, duration)
      return () => clearTimeout(timer)
    }
  }, [visible, duration, onHide])

  if (!show) return null

  return <div className="toast">{message}</div>
}
