'use client'

import { createContext, useCallback, useContext, useRef, useSyncExternalStore, type ReactNode } from 'react'

/* ── 타입 ── */
interface ToastItem {
  id: number
  message: string
  exiting: boolean
}

interface ToastContextValue {
  showToast: (message: string, duration?: number) => void
}

const FADE_OUT_MS = 400
const DEFAULT_DURATION = 5000

/* ── Context ── */
const ToastContext = createContext<ToastContextValue | null>(null)

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}

/* ── 외부 Store (React 렌더 사이클과 독립) ── */
type Listener = () => void

function createToastStore() {
  let toasts: ToastItem[] = []
  let nextId = 0
  const listeners = new Set<Listener>()

  function emit() {
    listeners.forEach((l) => l())
  }

  return {
    subscribe(listener: Listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    getSnapshot() {
      return toasts
    },
    show(message: string, duration: number) {
      const id = ++nextId
      toasts = [...toasts, { id, message, exiting: false }]
      emit()

      setTimeout(() => {
        toasts = toasts.map((t) => (t.id === id ? { ...t, exiting: true } : t))
        emit()
      }, duration)

      setTimeout(() => {
        toasts = toasts.filter((t) => t.id !== id)
        emit()
      }, duration + FADE_OUT_MS)
    },
  }
}

/* ── Provider ── */
export function ToastProvider({ children }: { children: ReactNode }) {
  const storeRef = useRef<ReturnType<typeof createToastStore> | null>(null)
  if (!storeRef.current) {
    storeRef.current = createToastStore()
  }
  const store = storeRef.current

  const toasts = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot)

  const showToast = useCallback((message: string, duration = DEFAULT_DURATION) => {
    store.show(message, duration)
  }, [store])

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {toasts.length > 0 && (
        <div className="toast-container">
          {toasts.map((t) => (
            <div
              key={t.id}
              className={`toast ${t.exiting ? 'toast-exit' : 'toast-enter'}`}
            >
              {t.message}
            </div>
          ))}
        </div>
      )}
    </ToastContext.Provider>
  )
}
