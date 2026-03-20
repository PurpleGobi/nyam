import type { DiscoverFeedbackInput } from "@/domain/entities/discover"

/** Internal DB candidate data for enrichment */
export interface InternalCandidate {
  externalId: string
  avgRating: number | null
  recordCount: number
  tasteProfile: {
    spicy: number
    sweet: number
    salty: number
    sour: number
    umami: number
    rich: number
  } | null
  flavorTags: string[]
  textureTags: string[]
  atmosphereTags: string[]
  genre: string | null
}

export interface DiscoverRepository {
  /** Fetch internal DB records matching external IDs for enrichment */
  getInternalCandidates(
    externalIds: string[],
  ): Promise<InternalCandidate[]>

  /** Check which restaurants the user has visited */
  getUserVisitedRestaurants(userId: string, externalIds: string[]): Promise<Set<string>>

  /** Get user's total record count (for weight calculation) */
  getUserRecordCount(userId: string): Promise<number>

  /** Save discover feedback */
  saveFeedback(userId: string, input: DiscoverFeedbackInput): Promise<void>

  /** Get user's blacklisted restaurant kakao IDs (bad feedback >= 3) */
  getBlacklistedRestaurants(userId: string): Promise<Set<string>>
}
