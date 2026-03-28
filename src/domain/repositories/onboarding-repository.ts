// src/domain/repositories/onboarding-repository.ts
// R1: 외부 의존 0

import type { OnboardingSeedRestaurant, OnboardingSeedBubble } from '@/domain/entities/onboarding'

export interface OnboardingRepository {
  getSeedRestaurants(area: string): Promise<OnboardingSeedRestaurant[]>
  searchSeedRestaurants(area: string, query: string): Promise<OnboardingSeedRestaurant[]>
  registerRestaurant(restaurantId: string, userId: string): Promise<void>
  unregisterRestaurant(restaurantId: string, userId: string): Promise<void>
  getSeedBubbles(): Promise<OnboardingSeedBubble[]>
  completeOnboarding(userId: string): Promise<void>
}
