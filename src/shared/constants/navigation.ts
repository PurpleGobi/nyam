// ---------------------------------------------------------------------------
// Navigation Depth Config
// ---------------------------------------------------------------------------
// - stack: depth 기반 네비게이션. 뒤로가기로 parent까지 순회
// - modal: 스택에 안 남음. 모달끼리 이동 시 replace. 뒤로가기 = 진입 전 화면
// - independent: 탭 바 밖 독립 플로우. 완료 후 지정된 화면으로 이동
// ---------------------------------------------------------------------------

export type NavType = 'stack' | 'modal' | 'independent'

export interface RouteConfig {
  depth: number | null
  parent: string | null
  type: NavType
  /** independent 전용: 플로우 완료 후 이동할 기본 경로 */
  redirectTo?: string
}

export const ROUTE_CONFIG: Record<string, RouteConfig> = {
  // ── D0: 바닥 (뒤로가기 종착점) ─────────────────────────────
  '/':                          { depth: 0, parent: null,           type: 'stack' },

  // ── D1: 홈 계열 ────────────────────────────────────────────
  '/search':                    { depth: 1, parent: '/',            type: 'stack' },
  '/restaurants/[id]':          { depth: 1, parent: '/',            type: 'stack' },
  '/wines/[id]':                { depth: 1, parent: '/',            type: 'stack' },
  '/add':                       { depth: 1, parent: '/',            type: 'stack' },
  '/record':                    { depth: 1, parent: '/',            type: 'stack' },
  '/register':                  { depth: 1, parent: '/',            type: 'stack' },

  // ── D1: 버블 계열 (홈 버블 탭에서 진입) ────────────────────
  '/bubbles/[id]':              { depth: 1, parent: '/',            type: 'stack' },
  '/bubbles/create':            { depth: 1, parent: '/',            type: 'stack' },

  // ── D2 ─────────────────────────────────────────────────────
  '/bubbles/[id]/settings':     { depth: 2, parent: '/bubbles/[id]', type: 'stack' },

  // ── Modal (스택에 안 남음, 모달끼리 replace) ───────────────
  '/profile':                   { depth: null, parent: null,        type: 'modal' },
  '/profile/wrapped':           { depth: null, parent: null,        type: 'modal' },
  '/settings':                  { depth: null, parent: null,        type: 'modal' },
  '/followers':                 { depth: null, parent: null,        type: 'modal' },
  '/users/[id]':                { depth: null, parent: null,        type: 'modal' },

  // ── Independent (탭 바 밖, 독립 플로우) ────────────────────
  '/auth/login':                { depth: null, parent: null,        type: 'independent', redirectTo: '/' },
  '/onboarding':                { depth: null, parent: null,        type: 'independent', redirectTo: '/' },
  '/bubbles/invite/[code]':     { depth: null, parent: null,        type: 'independent', redirectTo: '/bubbles/[id]' },
} as const satisfies Record<string, RouteConfig>

// ── Helpers ──────────────────────────────────────────────────

/** 실제 경로를 패턴에 매칭하여 RouteConfig 반환 */
export function getRouteConfig(pathname: string): RouteConfig | null {
  // 정확히 일치
  if (ROUTE_CONFIG[pathname]) return ROUTE_CONFIG[pathname]

  // 동적 세그먼트 매칭: /restaurants/abc → /restaurants/[id]
  for (const pattern of Object.keys(ROUTE_CONFIG)) {
    const regex = new RegExp(
      '^' + pattern.replace(/\[[\w]+\]/g, '[^/]+') + '$',
    )
    if (regex.test(pathname)) return ROUTE_CONFIG[pattern]
  }

  return null
}

/** D0 → D0 탭 전환인지 판별 */
export function isTabSwitch(from: string, to: string): boolean {
  const fromConfig = getRouteConfig(from)
  const toConfig = getRouteConfig(to)
  return fromConfig?.depth === 0 && toConfig?.depth === 0
}

/** 전환 애니메이션 방향 결정 */
export type TransitionDirection = 'slide-left' | 'slide-right' | 'fade' | 'none'

export function getTransitionDirection(
  from: string,
  to: string,
): TransitionDirection {
  const fromConfig = getRouteConfig(from)
  const toConfig = getRouteConfig(to)

  if (!fromConfig || !toConfig) return 'none'

  // 모달 진입/퇴장
  if (toConfig.type === 'modal') return 'fade'
  if (fromConfig.type === 'modal') return 'fade'

  // 탭 전환 (D0 ↔ D0)
  if (fromConfig.depth === 0 && toConfig.depth === 0) return 'fade'

  // 깊이 진입 (D0→D1, D1→D2)
  if ((fromConfig.depth ?? 0) < (toConfig.depth ?? 0)) return 'slide-left'

  // 깊이 복귀 (D2→D1, D1→D0)
  if ((fromConfig.depth ?? 0) > (toConfig.depth ?? 0)) return 'slide-right'

  // 같은 depth 간 이동
  return 'fade'
}
