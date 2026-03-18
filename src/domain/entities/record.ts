import type { RecordType, Visibility, TasteProfileSource } from "@/infrastructure/supabase/types"

export interface FoodRecord {
  id: string
  userId: string
  restaurantId: string | null
  recordType: RecordType
  menuName: string | null
  genre: string | null
  subGenre: string | null
  // Ratings (0-100)
  ratingOverall: number | null
  ratingTaste: number | null
  ratingValue: number | null
  ratingService: number | null
  ratingAtmosphere: number | null
  ratingCleanliness: number | null
  ratingPortion: number | null
  // Cooking-only ratings
  ratingBalance: number | null
  ratingDifficulty: number | null
  ratingTimeSpent: number | null
  ratingReproducibility: number | null
  ratingPlating: number | null
  ratingMaterialCost: number | null
  // Common
  comment: string | null
  tags: string[]
  flavorTags: string[]
  textureTags: string[]
  atmosphereTags: string[]
  visibility: Visibility
  aiRecognized: boolean
  completenessScore: number
  locationLat: number | null
  locationLng: number | null
  pricePerPerson: number | null
  // Phase
  phaseStatus: number
  phase1CompletedAt: string | null
  phase2CompletedAt: string | null
  phase3CompletedAt: string | null
  // Phase 3
  scaledRating: number | null
  comparisonCount: number
  // Scene
  scene: string | null
  // Wine-only
  pairingFood: string | null
  purchasePrice: number | null
  // Visit info
  visitTime: string | null
  companionCount: number | null
  totalCost: number | null
  createdAt: string
}

export interface RecordPhoto {
  id: string
  recordId: string
  photoUrl: string
  thumbnailUrl: string | null
  orderIndex: number
  aiLabels: string[]
}

export interface RecordTasteProfile {
  id: string
  recordId: string
  // Restaurant/Cooking common 6-axis
  spicy: number | null
  sweet: number | null
  salty: number | null
  sour: number | null
  umami: number | null
  rich: number | null
  // Wine WSET 7-axis
  wineAcidity: number | null
  wineBody: number | null
  wineTannin: number | null
  wineSweetness: number | null
  wineBalance: number | null
  wineFinish: number | null
  wineAroma: number | null
  // Wine user WSET input
  wineAcidityUser: number | null
  wineBodyUser: number | null
  wineTanninUser: number | null
  wineSweetnessUser: number | null
  wineBalanceUser: number | null
  wineFinishUser: number | null
  wineAromaUser: number | null
  // Meta
  source: TasteProfileSource
  confidence: number
  reviewCount: number
  summary: string | null
  createdAt: string
}

export interface RecordAiAnalysis {
  id: string
  recordId: string
  rawResponse: Record<string, unknown> | null
  identifiedRestaurant: {
    name: string
    matchedPlaceId: string | null
    confidence: number
  } | null
  extractedMenuItems: Array<{ name: string; price: number }> | null
  orderedItems: Array<{ name: string; estimatedPrice: number }> | null
  receiptData: {
    totalCost: number
    perPersonCost: number
    itemCount: number
  } | null
  companionData: {
    count: number
    occasion: string
  } | null
  wineInfo: {
    name: string | null
    vintage: number | null
    winery: string | null
    origin: string | null
    variety: string | null
    estimatedPriceKrw: number | null
    criticScore: number | null
  } | null
  pairingFood: string | null
  wineTastingAi: {
    acidity: number
    body: number
    tannin: number
    sweetness: number
    balance: number
    finish: number
    aroma: number
  } | null
  photoClassifications: Array<{
    photoIndex: number
    type: string
    confidence: number
    description: string
  }> | null
  estimatedVisitTime: string | null
  confidenceScore: number
  verifiedAt: string | null
  verifiedFields: string[]
  createdAt: string
}

export interface RecordWithPhotos extends FoodRecord {
  photos: RecordPhoto[]
  restaurant: { name: string; address: string | null } | null
}
