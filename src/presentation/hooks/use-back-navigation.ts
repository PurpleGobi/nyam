'use client'

import { useCallback } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { getRouteConfig } from '@/shared/constants/navigation'

/**
 * navigation.ts 의 RouteConfig를 기반으로 뒤로가기 동작을 결정하는 훅.
 * - stack: parent가 있으면 parent로, 없으면 router.back()
 * - modal: router.back()
 * - independent: redirectTo가 있으면 해당 경로로, 없으면 '/'
 */
/** parent 패턴의 [param]을 현재 pathname의 실제 값으로 치환 */
function resolveParent(pattern: string, pathname: string): string {
  const patternParts = pattern.split('/')
  const pathParts = pathname.split('/')
  return patternParts
    .map((seg, i) => (seg.startsWith('[') && seg.endsWith(']') ? pathParts[i] ?? seg : seg))
    .join('/')
}

export function useBackNavigation() {
  const router = useRouter()
  const pathname = usePathname()
  const config = getRouteConfig(pathname)

  const needsBack = config ? (config.depth !== null && config.depth > 0) || config.type === 'modal' || config.type === 'independent' : false

  const goBack = useCallback(() => {
    if (!config) {
      router.back()
      return
    }

    if (config.type === 'independent') {
      router.push(config.redirectTo ?? '/')
      return
    }

    if (config.type === 'modal') {
      router.back()
      return
    }

    // stack: parent 기반
    if (config.parent) {
      router.push(resolveParent(config.parent, pathname))
    } else {
      router.back()
    }
  }, [config, router, pathname])

  return { goBack, needsBack }
}
