import type { TasteProfileAxis, DiscoverScores, CandidateRaw } from "@/domain/entities/discover"
import { getGenreProfile } from "@/shared/constants/genre-profiles"

/**
 * Cosine similarity between two taste profiles (0-100 scale).
 * Returns 0-100 where 100 = perfect match.
 */
export function tasteSimilarity(
  userDna: TasteProfileAxis | null,
  candidateProfile: TasteProfileAxis | null,
): number {
  if (!userDna || !candidateProfile) return 0

  const a = [userDna.spicy, userDna.sweet, userDna.salty, userDna.sour, userDna.umami, userDna.rich]
  const b = [candidateProfile.spicy, candidateProfile.sweet, candidateProfile.salty, candidateProfile.sour, candidateProfile.umami, candidateProfile.rich]

  let dot = 0
  let magA = 0
  let magB = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
    magA += a[i] * a[i]
    magB += b[i] * b[i]
  }

  const mag = Math.sqrt(magA) * Math.sqrt(magB)
  if (mag === 0) return 0

  // Cosine similarity is -1 to 1, we map to 0-100
  return Math.round((dot / mag) * 100)
}

interface StyleDnaData {
  areas: Array<{ area: string; recordCount: number }>
  scenes: Array<{ scene: string; recordCount: number }>
  genres: Array<{ genre: string; recordCount: number }>
}

/**
 * Style DNA match score (0-100).
 * Considers area familiarity, scene experience, and genre preference.
 */
export function styleMatch(
  styleDna: StyleDnaData | null,
  candidate: CandidateRaw,
  scene: string | null,
  candidateGenre: string | null,
): number {
  if (!styleDna) return 0

  let score = 0
  let factors = 0

  // Area familiarity
  const areaEntry = styleDna.areas.find((a) =>
    candidate.address.includes(a.area) || candidate.roadAddress.includes(a.area),
  )
  if (areaEntry) {
    score += Math.min(areaEntry.recordCount * 5, 100)
    factors++
  }

  // Scene experience
  if (scene) {
    const sceneEntry = styleDna.scenes.find((s) => s.scene === scene)
    if (sceneEntry) {
      score += Math.min(sceneEntry.recordCount * 5, 100)
      factors++
    }
  }

  // Genre preference
  if (candidateGenre) {
    const genreEntry = styleDna.genres.find((g) => g.genre === candidateGenre)
    if (genreEntry) {
      score += Math.min(genreEntry.recordCount * 8, 100)
      factors++
    }
  }

  return factors > 0 ? Math.round(score / factors) : 0
}

/**
 * Dynamic weights based on user's record count (cold start handling).
 * Cold start with pseudo DNA: taste gets more weight since we have genre-based preferences.
 */
function getWeights(recordCount: number, hasPseudoDna: boolean): { taste: number; style: number; quality: number; novelty: number } {
  if (recordCount < 5) {
    // With pseudo DNA from onboarding, taste is more useful than pure quality fallback
    return hasPseudoDna
      ? { taste: 0.30, style: 0.05, quality: 0.40, novelty: 0.25 }
      : { taste: 0.10, style: 0.10, quality: 0.60, novelty: 0.20 }
  }
  if (recordCount < 20) return { taste: 0.20, style: 0.20, quality: 0.40, novelty: 0.20 }
  return { taste: 0.35, style: 0.25, quality: 0.25, novelty: 0.15 }
}

interface ScoringInput {
  candidate: CandidateRaw
  userTasteDna: TasteProfileAxis | null
  userStyleDna: StyleDnaData | null
  userRecordCount: number
  scene: string | null
  candidateGenre: string | null
  isNewForUser: boolean
  /** Onboarding seed genres for pseudo taste DNA (cold start) */
  seedGenres?: string[]
}

/**
 * Build a pseudo taste DNA from onboarding genre selections.
 * Averages the genre default profiles to create a rough user preference.
 */
function buildPseudoTasteDna(seedGenres: string[]): TasteProfileAxis | null {
  if (seedGenres.length === 0) return null
  const profiles = seedGenres.map(getGenreProfile)
  const sum: TasteProfileAxis = { spicy: 0, sweet: 0, salty: 0, sour: 0, umami: 0, rich: 0 }
  for (const p of profiles) {
    sum.spicy += p.spicy
    sum.sweet += p.sweet
    sum.salty += p.salty
    sum.sour += p.sour
    sum.umami += p.umami
    sum.rich += p.rich
  }
  const n = profiles.length
  return {
    spicy: Math.round(sum.spicy / n),
    sweet: Math.round(sum.sweet / n),
    salty: Math.round(sum.salty / n),
    sour: Math.round(sum.sour / n),
    umami: Math.round(sum.umami / n),
    rich: Math.round(sum.rich / n),
  }
}

/**
 * Calculate final score for a candidate.
 * Returns scores breakdown + dominant factor for reason generation.
 */
export function calculateFinalScore(input: ScoringInput): {
  scores: DiscoverScores
  dominantFactor: "taste" | "style" | "quality" | "novelty"
} {
  const {
    candidate, userTasteDna, userStyleDna, userRecordCount,
    scene, candidateGenre, isNewForUser, seedGenres,
  } = input

  // Taste: use real DNA, or fall back to pseudo DNA from onboarding genres
  const effectiveTasteDna = userTasteDna ?? (seedGenres ? buildPseudoTasteDna(seedGenres) : null)
  const hasPseudoDna = !userTasteDna && effectiveTasteDna != null
  const weights = getWeights(userRecordCount, hasPseudoDna)

  const candidateProfile = candidate.tasteProfile ?? (candidateGenre ? getGenreProfile(candidateGenre) : null)
  const tasteScore = tasteSimilarity(effectiveTasteDna, candidateProfile)

  const styleScore = styleMatch(userStyleDna, candidate, scene, candidateGenre)

  // Quality: internal rating if available, else base estimate + genre preference bonus
  const baseQuality = candidate.internalRating
    ?? Math.min(candidate.internalRecordCount * 10 + 50, 85)
  // Boost quality if the restaurant's genre matches one of the user's preferred genres
  const genrePreferenceBonus = (seedGenres && candidateGenre && seedGenres.includes(candidateGenre)) ? 10 : 0
  const qualityScore = Math.min(baseQuality + genrePreferenceBonus, 100)

  const noveltyScore = isNewForUser ? 80 : 10

  const overall = Math.round(
    tasteScore * weights.taste +
    styleScore * weights.style +
    qualityScore * weights.quality +
    noveltyScore * weights.novelty,
  )

  const scores: DiscoverScores = {
    overall,
    taste: tasteScore,
    quality: qualityScore,
    novelty: noveltyScore,
  }

  // Determine dominant factor
  const factorScores = [
    { factor: "taste" as const, value: tasteScore * weights.taste },
    { factor: "style" as const, value: styleScore * weights.style },
    { factor: "quality" as const, value: qualityScore * weights.quality },
    { factor: "novelty" as const, value: noveltyScore * weights.novelty },
  ]
  const dominantFactor = factorScores.sort((a, b) => b.value - a.value)[0].factor

  return { scores, dominantFactor }
}

/**
 * Template-based reason generation (MVP, no LLM).
 */
export function generateReason(
  candidate: CandidateRaw,
  dominantFactor: "taste" | "style" | "quality" | "novelty",
  context: {
    scene: string | null
    area: string | null
    candidateGenre: string | null
    topTasteAxis: string | null
    isFrequentArea: boolean
  },
): string {
  const TASTE_AXIS_LABELS: Record<string, string> = {
    spicy: "매운맛", sweet: "단맛", salty: "짭짤한 맛",
    sour: "새콤한 맛", umami: "감칠맛", rich: "풍미",
  }

  switch (dominantFactor) {
    case "taste": {
      const axisLabel = context.topTasteAxis ? TASTE_AXIS_LABELS[context.topTasteAxis] : null
      if (axisLabel) return `${axisLabel} 좋아하시잖아요. 여기 딱이에요`
      return "취향에 잘 맞는 곳이에요"
    }
    case "style": {
      if (context.isFrequentArea && context.area) {
        return `${context.area} 자주 가시는데, 아직 안 가본 곳이에요`
      }
      if (context.scene) {
        return `${context.scene} 갈 때 딱인 곳이에요`
      }
      return "패턴에 잘 맞는 곳이에요"
    }
    case "quality": {
      if (candidate.internalRecordCount > 0) {
        return "이 지역 평점 최상위 식당이에요"
      }
      return "평판이 좋은 곳이에요"
    }
    case "novelty": {
      const genreLabel = context.candidateGenre ?? "새로운 맛"
      return `새로운 ${genreLabel}도 한번 시도해보세요`
    }
  }
}

/**
 * Find the user's top taste axis from DNA.
 */
export function getTopTasteAxis(dna: TasteProfileAxis | null): string | null {
  if (!dna) return null
  const entries: [string, number][] = [
    ["spicy", dna.spicy], ["sweet", dna.sweet], ["salty", dna.salty],
    ["sour", dna.sour], ["umami", dna.umami], ["rich", dna.rich],
  ]
  entries.sort((a, b) => b[1] - a[1])
  return entries[0][0]
}

/**
 * Infer genre from Kakao category string.
 * e.g. "음식점 > 일식 > 초밥,롤" → "japanese"
 */
export function inferGenreFromCategory(category: string): string | null {
  const lower = category.toLowerCase()
  const map: [string[], string][] = [
    [["한식", "korean"], "korean"],
    [["중식", "중국", "chinese"], "chinese"],
    [["일식", "초밥", "라멘", "japanese", "sushi"], "japanese"],
    [["양식", "이탈리안", "프랑스", "western", "pasta", "italian"], "western"],
    [["치킨", "chicken"], "chicken"],
    [["피자", "pizza"], "pizza"],
    [["버거", "햄버거", "burger"], "burger"],
    [["분식", "떡볶이", "snack"], "snack"],
    [["족발", "보쌈", "jokbal"], "jokbal"],
    [["찌개", "탕", "전골", "stew"], "stew"],
    [["돈까스", "카츠", "katsu"], "katsu"],
    [["고기", "구이", "삼겹", "갈비", "bbq", "소고기"], "bbq"],
    [["해물", "해산물", "회", "생선", "seafood"], "seafood"],
    [["아시안", "베트남", "태국", "인도", "asian", "thai"], "asian"],
    [["카페", "디저트", "베이커리", "cafe", "dessert"], "cafe"],
    [["샐러드", "salad"], "salad"],
  ]

  for (const [keywords, genre] of map) {
    if (keywords.some((kw) => lower.includes(kw))) return genre
  }
  return null
}
