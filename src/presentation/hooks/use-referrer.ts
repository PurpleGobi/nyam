'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'

/**
 * 이전 페이지 경로와 이름을 추적하는 훅.
 * sessionStorage에 네비게이션 히스토리를 저장하여
 * 내부 페이지 헤더에서 "이전 페이지명"을 표시할 수 있게 한다.
 */

const PAGE_NAMES: Record<string, string> = {
  '/': '홈',
  '/profile': '프로필',
  '/settings': '설정',
  '/bubbles': '버블',
  '/discover': '탐색',
  '/search': '검색',
  '/record': '기록',
  '/onboarding': '온보딩',
}

function getPageName(path: string): string {
  // 정확히 매칭
  if (PAGE_NAMES[path]) return PAGE_NAMES[path]

  // 동적 라우트
  if (path.startsWith('/restaurants/')) return '식당 상세'
  if (path.startsWith('/wines/')) return '와인 상세'
  if (path.startsWith('/records/')) return '기록 상세'
  if (path.match(/^\/bubbles\/[^/]+\/members/)) return '멤버'
  if (path.match(/^\/bubbles\/[^/]+$/)) return '버블'
  if (path.startsWith('/users/')) return '프로필'

  return '이전'
}

export function useReferrer() {
  const pathname = usePathname()
  const [referrerPath, setReferrerPath] = useState<string | null>(null)
  const [referrerName, setReferrerName] = useState<string>('이전')

  useEffect(() => {
    const key = 'nyam_nav_history'
    const stored = sessionStorage.getItem(key)
    const history: string[] = stored ? JSON.parse(stored) : []

    // 이전 페이지 정보 설정 (현재 페이지 직전)
    const prev = history.length > 0 ? history[history.length - 1] : null
    if (prev && prev !== pathname) {
      setReferrerPath(prev)
      setReferrerName(getPageName(prev))
    }

    // 현재 페이지를 히스토리에 추가 (중복 방지)
    if (history[history.length - 1] !== pathname) {
      history.push(pathname)
      // 최대 20개 유지
      if (history.length > 20) history.shift()
      sessionStorage.setItem(key, JSON.stringify(history))
    }
  }, [pathname])

  return { referrerPath, referrerName }
}
