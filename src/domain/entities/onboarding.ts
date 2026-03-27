// src/domain/entities/onboarding.ts
// R1: 외부 의존 0

export type OnboardingScreen = 'intro' | 'restaurant_register' | 'bubble_create' | 'bubble_explore' | 'complete'

export interface OnboardingState {
  currentScreen: OnboardingScreen
  completedScreens: OnboardingScreen[]
  registeredRestaurants: string[]
  createdBubbles: string[]
  joinedBubbles: string[]
  totalXpEarned: number
}

export interface OnboardingSeedRestaurant {
  id: string
  name: string
  area: string
  genre: string | null
  address: string | null
  thumbnailUrl: string | null
}

export interface OnboardingBubbleTemplate {
  id: string
  name: string
  description: string
  icon: string
  iconBgColor: string
  joinPolicy: 'invite_only'
  focusType: 'all'
}

export interface OnboardingSeedBubble {
  id: string
  name: string
  description: string
  icon: string
  iconBgColor: string
  memberCount: number
  minLevel: number
  joinPolicy: string
}

export const ONBOARDING_AREAS = [
  '을지로',
  '광화문',
  '성수',
  '강남',
  '홍대',
  '이태원',
] as const

export type OnboardingArea = (typeof ONBOARDING_AREAS)[number]
