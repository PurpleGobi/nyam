'use client'

import { useState, useCallback } from 'react'
import type { OnboardingScreen, OnboardingState } from '@/domain/entities/onboarding'

const SCREEN_ORDER: OnboardingScreen[] = [
  'intro',
  'restaurant_register',
  'bubble_create',
  'bubble_explore',
  'complete',
]

const initialState: OnboardingState = {
  currentScreen: 'intro',
  completedScreens: [],
  registeredRestaurants: [],
  createdBubbles: [],
  joinedBubbles: [],
  totalXpEarned: 0,
}

interface UseOnboardingResult {
  state: OnboardingState
  currentScreen: OnboardingScreen
  currentStep: number
  totalSteps: number
  navigateNext: () => void
  navigateBack: () => void
  navigateTo: (screen: OnboardingScreen) => void
  addXp: (amount: number) => void
  addRegisteredRestaurant: (id: string) => void
  removeRegisteredRestaurant: (id: string) => void
  addCreatedBubble: (id: string) => void
  addJoinedBubble: (id: string) => void
  complete: () => void
  isComplete: boolean
}

export function useOnboarding(): UseOnboardingResult {
  const [state, setState] = useState<OnboardingState>(initialState)

  const currentStep = SCREEN_ORDER.indexOf(state.currentScreen)
  const totalSteps = SCREEN_ORDER.length - 2 // exclude intro and complete

  const navigateNext = useCallback(() => {
    setState((prev) => {
      const idx = SCREEN_ORDER.indexOf(prev.currentScreen)
      if (idx >= SCREEN_ORDER.length - 1) return prev
      const nextScreen = SCREEN_ORDER[idx + 1]
      return {
        ...prev,
        currentScreen: nextScreen,
        completedScreens: prev.completedScreens.includes(prev.currentScreen)
          ? prev.completedScreens
          : [...prev.completedScreens, prev.currentScreen],
      }
    })
  }, [])

  const navigateBack = useCallback(() => {
    setState((prev) => {
      const idx = SCREEN_ORDER.indexOf(prev.currentScreen)
      if (idx <= 0) return prev
      return { ...prev, currentScreen: SCREEN_ORDER[idx - 1] }
    })
  }, [])

  const navigateTo = useCallback((screen: OnboardingScreen) => {
    setState((prev) => ({ ...prev, currentScreen: screen }))
  }, [])

  const addXp = useCallback((amount: number) => {
    setState((prev) => ({ ...prev, totalXpEarned: prev.totalXpEarned + amount }))
  }, [])

  const addRegisteredRestaurant = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      registeredRestaurants: prev.registeredRestaurants.includes(id)
        ? prev.registeredRestaurants
        : [...prev.registeredRestaurants, id],
    }))
  }, [])

  const removeRegisteredRestaurant = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      registeredRestaurants: prev.registeredRestaurants.filter((r) => r !== id),
    }))
  }, [])

  const addCreatedBubble = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      createdBubbles: [...prev.createdBubbles, id],
    }))
  }, [])

  const addJoinedBubble = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      joinedBubbles: [...prev.joinedBubbles, id],
    }))
  }, [])

  const complete = useCallback(() => {
    setState((prev) => ({
      ...prev,
      currentScreen: 'complete',
      completedScreens: [...prev.completedScreens, 'bubble_explore'],
    }))
  }, [])

  return {
    state,
    currentScreen: state.currentScreen,
    currentStep: Math.max(0, currentStep - 1),
    totalSteps,
    navigateNext,
    navigateBack,
    navigateTo,
    addXp,
    addRegisteredRestaurant,
    removeRegisteredRestaurant,
    addCreatedBubble,
    addJoinedBubble,
    complete,
    isComplete: state.currentScreen === 'complete',
  }
}
