// src/domain/constants/source-priority.ts
// R1: 외부 의존 0

/** 소스 우선순위 — 홈 그루핑, 중복 제거, 점수 폴백에서 공통 사용 */
export const SOURCE_PRIORITY = ['mine', 'nyam', 'bubble'] as const
export type SourceType = typeof SOURCE_PRIORITY[number]

/** 숫자 매핑 (중복 제거/그루핑용) */
export const SOURCE_PRIORITY_MAP: Record<string, number> = Object.fromEntries(
  SOURCE_PRIORITY.map((s, i) => [s, i]),
) as Record<string, number>
