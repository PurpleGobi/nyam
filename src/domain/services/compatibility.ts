import type { TasteDna } from '../entities/taste-dna'

export interface CompatibilityResult {
  tasteSimilarity: number
  experienceComplementarity: number
  overall: number
  strongAreas: string[]
}

interface AtlasArea {
  name: string
  level: number
}

/**
 * Extract the 6 core flavor values from TasteDna as a numeric vector.
 */
function extractFlavorVector(dna: TasteDna): number[] {
  return [
    dna.flavorSpicy,
    dna.flavorSweet,
    dna.flavorSalty,
    dna.flavorSour,
    dna.flavorUmami,
    dna.flavorRich,
  ]
}

/**
 * Cosine similarity between two numeric vectors, scaled to 0-100.
 * Returns 50 (neutral) when either vector is zero.
 */
function cosineSimilarity(a: number[], b: number[]): number {
  const dot = a.reduce((sum, ai, i) => sum + ai * b[i], 0)
  const magA = Math.sqrt(a.reduce((sum, ai) => sum + ai * ai, 0))
  const magB = Math.sqrt(b.reduce((sum, bi) => sum + bi * bi, 0))
  if (magA === 0 || magB === 0) return 50
  return Math.round((dot / (magA * magB)) * 100)
}

/**
 * Calculate taste similarity between two users' TasteDna.
 * Uses cosine similarity on the 6 core flavor dimensions.
 * Returns 0-100 scale, 50 if either vector is zero.
 */
export function calculateTasteSimilarity(
  dnaA: TasteDna,
  dnaB: TasteDna,
): number {
  const vectorA = extractFlavorVector(dnaA)
  const vectorB = extractFlavorVector(dnaB)
  return cosineSimilarity(vectorA, vectorB)
}

/**
 * Calculate experience complementarity between two users' atlas areas.
 *
 * For each area where A is weak (level <= 3) and B is strong (level >= 5),
 * accumulate the level difference, and vice versa.
 * Normalize: min(totalDiff / 30, 1) * 100.
 *
 * strongAreas: areas where B is strong and A is weak (what B can offer A).
 */
export function calculateExperienceComplementarity(
  atlasA: AtlasArea[],
  atlasB: AtlasArea[],
): { score: number; strongAreas: string[] } {
  const mapA = new Map(atlasA.map((a) => [a.name, a.level]))
  const mapB = new Map(atlasB.map((b) => [b.name, b.level]))

  let totalDiff = 0
  const strongAreas: string[] = []
  const allNames = new Set([...mapA.keys(), ...mapB.keys()])

  for (const name of allNames) {
    const levelA = mapA.get(name) ?? 0
    const levelB = mapB.get(name) ?? 0

    if (levelA <= 3 && levelB >= 5) {
      totalDiff += levelB - levelA
      strongAreas.push(name)
    }
    if (levelB <= 3 && levelA >= 5) {
      totalDiff += levelA - levelB
    }
  }

  const score = Math.round(Math.min(totalDiff / 30, 1) * 100)
  return { score, strongAreas }
}

/**
 * Overall compatibility score: similarity * 0.6 + complementarity * 0.4.
 */
export function calculateOverallCompatibility(
  similarity: number,
  complementarity: number,
): number {
  return Math.round(similarity * 0.6 + complementarity * 0.4)
}
