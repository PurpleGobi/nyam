'use client'

import useSWR, { useSWRConfig } from 'swr'
import { useCallback } from 'react'
import type { Favorite } from '@/domain/entities/collection'
import { supabaseCollectionRepository } from '@/infrastructure/repositories/supabase-collection-repository'
import { useAuth } from './use-auth'

interface UseFavoritesReturn {
  readonly favorites: readonly Favorite[]
  readonly isLoading: boolean
  readonly error: Error | undefined
  /** Toggle favorite status for a restaurant. Returns new favorite state. */
  readonly toggleFavorite: (restaurantId: string) => Promise<boolean>
  /** Check if a restaurant is in the user's favorites */
  readonly isFavorite: (restaurantId: string) => boolean
}

/**
 * Hook for managing user favorites with optimistic updates.
 */
export function useFavorites(): UseFavoritesReturn {
  const { user } = useAuth()
  const { mutate: globalMutate } = useSWRConfig()

  const swrKey = user ? ['favorites', user.id] : null

  const { data, error, isLoading, mutate } = useSWR<readonly Favorite[]>(
    swrKey,
    () => supabaseCollectionRepository.listFavorites(user!.id),
  )

  const favorites = data ?? []

  const isFavorite = useCallback(
    (restaurantId: string): boolean => {
      return favorites.some((f) => f.restaurantId === restaurantId)
    },
    [favorites],
  )

  const toggleFavorite = useCallback(
    async (restaurantId: string): Promise<boolean> => {
      if (!user) {
        throw new Error('User must be authenticated to toggle favorites')
      }

      const currentlyFavorited = isFavorite(restaurantId)

      // Optimistic update
      const optimisticFavorites = currentlyFavorited
        ? favorites.filter((f) => f.restaurantId !== restaurantId)
        : [
            ...favorites,
            {
              id: `optimistic-${restaurantId}`,
              userId: user.id,
              restaurantId,
              createdAt: new Date().toISOString(),
            } satisfies Favorite,
          ]

      await mutate(
        async () => {
          const newState = await supabaseCollectionRepository.toggleFavorite(
            user.id,
            restaurantId,
          )

          // Revalidate to get the real data from server
          const updatedFavorites = await supabaseCollectionRepository.listFavorites(user.id)

          // Also revalidate restaurant-related caches
          await globalMutate(
            (key: unknown) =>
              Array.isArray(key) && key[0] === 'restaurant' && key[1] === restaurantId,
          )

          void newState // used by the toggle API, we return the fresh list
          return updatedFavorites
        },
        {
          optimisticData: optimisticFavorites,
          rollbackOnError: true,
          revalidate: false,
        },
      )

      return !currentlyFavorited
    },
    [user, favorites, isFavorite, mutate, globalMutate],
  )

  return {
    favorites,
    isLoading,
    error,
    toggleFavorite,
    isFavorite,
  }
}
