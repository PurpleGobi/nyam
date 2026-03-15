'use client'

import useSWR, { useSWRConfig } from 'swr'
import { useState, useCallback, useEffect } from 'react'
import type { Favorite } from '@/domain/entities/collection'
import { supabaseCollectionRepository } from '@/infrastructure/repositories/supabase-collection-repository'
import { useAuth } from './use-auth'

const LOCAL_STORAGE_KEY = 'nyam-favorites'

function getLocalFavorites(): string[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY)
    return raw ? (JSON.parse(raw) as string[]) : []
  } catch {
    return []
  }
}

function setLocalFavorites(ids: string[]): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(ids))
}

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
 * Hook for managing user favorites.
 * Uses Supabase when logged in, localStorage when not.
 */
export function useFavorites(): UseFavoritesReturn {
  const { user } = useAuth()
  const { mutate: globalMutate } = useSWRConfig()

  // --- Supabase mode (logged in) ---
  const swrKey = user ? ['favorites', user.id] : null

  const { data, error, isLoading: swrLoading, mutate } = useSWR<readonly Favorite[]>(
    swrKey,
    () => supabaseCollectionRepository.listFavorites(user!.id),
  )

  // --- localStorage mode (not logged in) ---
  const [localIds, setLocalIds] = useState<string[]>([])

  useEffect(() => {
    if (!user) {
      setLocalIds(getLocalFavorites())
    }
  }, [user])

  const favorites: readonly Favorite[] = user
    ? (data ?? [])
    : localIds.map((id) => ({
        id: `local-${id}`,
        userId: 'anonymous',
        restaurantId: id,
        createdAt: new Date().toISOString(),
      }))

  const isLoading = user ? swrLoading : false

  const isFavorite = useCallback(
    (restaurantId: string): boolean => {
      return favorites.some((f) => f.restaurantId === restaurantId)
    },
    [favorites],
  )

  const toggleFavorite = useCallback(
    async (restaurantId: string): Promise<boolean> => {
      if (!user) {
        // localStorage mode
        const current = getLocalFavorites()
        const idx = current.indexOf(restaurantId)
        const newFav = idx >= 0
        if (idx >= 0) {
          current.splice(idx, 1)
        } else {
          current.push(restaurantId)
        }
        setLocalFavorites(current)
        setLocalIds([...current])
        return !newFav
      }

      // Supabase mode
      const currentlyFavorited = isFavorite(restaurantId)

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

          const updatedFavorites = await supabaseCollectionRepository.listFavorites(user.id)

          await globalMutate(
            (key: unknown) =>
              Array.isArray(key) && key[0] === 'restaurant' && key[1] === restaurantId,
          )

          void newState
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
