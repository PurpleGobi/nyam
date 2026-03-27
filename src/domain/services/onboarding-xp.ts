// src/domain/services/onboarding-xp.ts
// R1: 외부 의존 0

/**
 * 온보딩 완료 시 보너스 XP
 */
export const ONBOARDING_COMPLETION_XP = 10

/**
 * 온보딩 버블 생성 XP 계산
 * 첫 버블 생성 시 bonus_first_bubble XP 포함
 */
export function calculateOnboardingBubbleXp(isFirstBubble: boolean): number {
  const baseXp = 5
  const firstBubbleBonus = 5
  return isFirstBubble ? baseXp + firstBubbleBonus : baseXp
}

/**
 * 온보딩 식당 등록 XP (등록 건당)
 */
export function calculateOnboardingRegisterXp(): number {
  return 3
}
