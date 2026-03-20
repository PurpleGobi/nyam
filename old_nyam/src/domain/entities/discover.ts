/**
 * Discover Engine domain entities.
 * Phase 1 MVP: filter-based search with DNA personalization.
 */

/** Raw candidate from Kakao API + internal DB merge */
export interface CandidateRaw {
  // Identification
  kakaoId: string
  name: string
  address: string
  roadAddress: string
  lat: number
  lng: number
  phone: string | null
  kakaoUrl: string

  // Kakao details
  category: string
  hours: string | null
  menuItems: { name: string; price: number }[]
  imageUrl: string | null

  // Internal DB (if matched)
  internalRating: number | null
  internalRecordCount: number
  tasteProfile: TasteProfileAxis | null
  flavorTags: string[]
  textureTags: string[]
  atmosphereTags: string[]
}

/** 6-axis taste profile (0-100 scale) */
export interface TasteProfileAxis {
  spicy: number
  sweet: number
  salty: number
  sour: number
  umami: number
  rich: number
}

/** Practical info extracted from blog snippets (Phase 2) or inferred */
export interface PracticalInfo {
  parking: boolean | null
  reservation: boolean | null
  waiting: string | null
  priceRange: string | null
  popularMenus: string[]
}

/** Scoring breakdown for a single result */
export interface DiscoverScores {
  overall: number
  taste: number
  quality: number
  novelty: number
}

/** 식당의 외부 플랫폼 링크 + 별점 */
export interface PlatformLink {
  platform: "kakao" | "naver" | "google"
  url: string
  rating: number | null
  reviewCount: number | null
}

/** 명성 배지 (미슐랭, 블루리본, TV 등) */
export interface ReputationBadge {
  type: "michelin" | "blue_ribbon" | "tv" | "nofo" | "specialty" | "catch_table"
  label: string      // "미슐랭 1스타", "블루리본 2", "수요미식회", "15년 노포"
  icon?: string      // 아이콘 이름 또는 이모지
}

/** 블로그/리뷰 한 줄 */
export interface ReviewSnippet {
  summary: string    // 한 줄 요약
  source: string     // "네이버 블로그", "구글 리뷰" 등
  url?: string       // 원본 링크
}

/** Single discover result returned to client */
export interface DiscoverResult {
  rank: number
  restaurant: {
    name: string
    address: string
    genre: string
    kakaoId: string
    kakaoUrl: string
    photo: string | null
    phone: string | null
    hours: string | null
  }
  practicalInfo: PracticalInfo
  scores: DiscoverScores
  reason: string
  highlights: string[]
  internalRecordCount: number
  hasVisited: boolean
  sourceCount: number
  distance?: number
  /** 대표 사진 URL 목록 */
  photos: string[]
  /** 외부 플랫폼 링크 + 별점 */
  platformLinks: PlatformLink[]
  /** 명성 배지 */
  badges: ReputationBadge[]
  /** 리뷰 스니펫 */
  reviewSnippet: ReviewSnippet | null
}

/** Pipeline debug info returned to client */
export interface DiscoverDebugInfo {
  pipeline: {
    step: string
    detail: string
    durationMs?: number
  }[]
  blendRatio: { llm: number; dna: number }
  llmCandidates: number
  verifiedCandidates: number
  scoredResults: {
    rank: number
    name: string
    blended: number
    llmScore: number
    dnaScore: number
    category: string
    reason: string
  }[]
  /** LLM prompt text (for browser console debugging) */
  prompt?: string
  /** Input context summary */
  inputContext?: string
}

/** Full discover API response */
export interface DiscoverResponse {
  success: boolean
  source: "cache" | "realtime"
  computedAt: string
  results: DiscoverResult[]
  filters: {
    area: string | null
    scene: string | null
    genre: string | null
  }
  cacheStatus: "ready" | "computing" | "expired"
  meta?: {
    blendRatio: { llm: number; dna: number }
    llmCandidates: number
    verifiedCandidates: number
    scoreDisclaimer: string
  }
  debug?: DiscoverDebugInfo
}

/** Discover feedback input */
export interface DiscoverFeedbackInput {
  restaurantName: string
  kakaoId: string | null
  feedback: "good" | "bad"
  reason?: string
  queryContext?: {
    area: string | null
    scene: string | null
    genre: string | null
  }
}

/** Parsed query from natural language (Phase 2) or filters */
export interface DiscoverQuery {
  area: string | null
  scene: string | null
  genre: string | null
  priceRange: string | null
  tags: {
    flavor: string[]
    texture: string[]
    atmosphere: string[]
  }
  keywords: string[]
  location?: { lat: number; lng: number }
}
