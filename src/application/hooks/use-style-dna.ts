'use client'

import useSWR from 'swr'
import { getStyleDnaRepository } from '@/di/repositories'

export function useStyleDna(userId: string | undefined) {
  const repo = getStyleDnaRepository()

  const regions = useSWR(
    userId ? ['style-dna-regions', userId] : null,
    () => repo.getRegionsByUserId(userId!),
  )

  const genres = useSWR(
    userId ? ['style-dna-genres', userId] : null,
    () => repo.getGenresByUserId(userId!),
  )

  const scenes = useSWR(
    userId ? ['style-dna-scenes', userId] : null,
    () => repo.getScenesByUserId(userId!),
  )

  return {
    regions: regions.data ?? [],
    genres: genres.data ?? [],
    scenes: scenes.data ?? [],
    isLoading: regions.isLoading || genres.isLoading || scenes.isLoading,
    error: regions.error || genres.error || scenes.error,
  }
}
