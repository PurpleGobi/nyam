'use client'

import useSWR from 'swr'
import { getExperienceAtlasRepository } from '@/di/repositories'

export function useExperienceAtlas(userId: string | undefined) {
  const repo = getExperienceAtlasRepository()

  const regions = useSWR(
    userId ? ['atlas-regions', userId] : null,
    () => repo.getRegionsByUserId(userId!),
  )

  const genres = useSWR(
    userId ? ['atlas-genres', userId] : null,
    () => repo.getGenresByUserId(userId!),
  )

  const scenes = useSWR(
    userId ? ['atlas-scenes', userId] : null,
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
