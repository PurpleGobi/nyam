'use client'

import { useEffect, useCallback, useSyncExternalStore } from 'react'
import { usePathname } from 'next/navigation'

const PAGE_NAMES: Record<string, string> = {
  '/': '홈',
  '/profile': '프로필',
  '/settings': '설정',
  '/search': '검색',
  '/record': '기록',
  '/onboarding': '온보딩',
}

function getPageName(path: string): string {
  if (PAGE_NAMES[path]) return PAGE_NAMES[path]
  if (path.startsWith('/restaurants/')) return '식당 상세'
  if (path.startsWith('/wines/')) return '와인 상세'

  if (path.match(/^\/bubbles\/[^/]+$/)) return '버블'
  if (path.startsWith('/users/')) return '프로필'
  return '이전'
}

const STORAGE_KEY = 'nyam_nav_history'

function getHistory(): string[] {
  if (typeof window === 'undefined') return []
  try {
    const stored = sessionStorage.getItem(STORAGE_KEY)
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

function getPreviousPath(currentPath: string): string | null {
  const history = getHistory()
  // 히스토리에서 현재 페이지 직전 항목을 찾음
  for (let i = history.length - 1; i >= 0; i--) {
    if (history[i] !== currentPath) return history[i]
  }
  return null
}

export function useReferrer() {
  const pathname = usePathname()

  // 현재 페이지를 히스토리에 기록
  useEffect(() => {
    const history = getHistory()
    if (history[history.length - 1] !== pathname) {
      history.push(pathname)
      if (history.length > 20) history.shift()
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(history))
    }
  }, [pathname])

  // SSR 호환: 서버에서는 null, 클라이언트에서 동기적으로 읽음
  const getSnapshot = useCallback(() => getPreviousPath(pathname), [pathname])
  const getServerSnapshot = useCallback(() => null, [])
  const subscribe = useCallback((cb: () => void) => {
    window.addEventListener('storage', cb)
    return () => window.removeEventListener('storage', cb)
  }, [])

  const referrerPath = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
  const referrerName = referrerPath ? getPageName(referrerPath) : '이전'

  return { referrerPath, referrerName }
}
