'use client'

import useSWR from 'swr'
import { getTasteDnaRepository, getExperienceAtlasRepository } from '@/di/repositories'
import {
  calculateTasteSimilarity,
  calculateExperienceComplementarity,
  calculateOverallCompatibility,
  type CompatibilityResult,
} from '@/domain/services/compatibility'

async function fetchCompatibility(
  userIdA: string,
  userIdB: string,
): Promise<CompatibilityResult | null> {
  const tasteDnaRepo = getTasteDnaRepository()
  const atlasRepo = getExperienceAtlasRepository()

  const [dnaA, dnaB, regionsA, regionsB, genresA, genresB] = await Promise.all([
    tasteDnaRepo.getByUserId(userIdA),
    tasteDnaRepo.getByUserId(userIdB),
    atlasRepo.getRegionsByUserId(userIdA),
    atlasRepo.getRegionsByUserId(userIdB),
    atlasRepo.getGenresByUserId(userIdA),
    atlasRepo.getGenresByUserId(userIdB),
  ])

  if (!dnaA || !dnaB) return null

  const tasteSimilarity = calculateTasteSimilarity(dnaA, dnaB)

  const atlasA = [
    ...regionsA.map((r) => ({ name: r.region, level: r.level })),
    ...genresA.map((g) => ({ name: g.category, level: g.level })),
  ]
  const atlasB = [
    ...regionsB.map((r) => ({ name: r.region, level: r.level })),
    ...genresB.map((g) => ({ name: g.category, level: g.level })),
  ]

  const { score: experienceComplementarity, strongAreas } =
    calculateExperienceComplementarity(atlasA, atlasB)

  const overall = calculateOverallCompatibility(tasteSimilarity, experienceComplementarity)

  return { tasteSimilarity, experienceComplementarity, overall, strongAreas }
}

export function useCompatibility(
  userIdA: string | undefined,
  userIdB: string | undefined,
) {
  const { data, isLoading, error } = useSWR(
    userIdA && userIdB ? ['compatibility', userIdA, userIdB] : null,
    () => fetchCompatibility(userIdA!, userIdB!),
  )

  return {
    result: data ?? null,
    isLoading,
    error,
  }
}
