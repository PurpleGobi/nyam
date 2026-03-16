export type RecordType = 'restaurant' | 'wine' | 'cooking'

export type RecordVisibility = 'private' | 'group' | 'public'

export interface RecordLocation {
  lat: number
  lng: number
}

export interface RestaurantRatings {
  taste: number
  value: number
  service: number
  atmosphere: number
  cleanliness: number
  portion: number
}

export interface WineRatings {
  aroma: number
  body: number
  acidity: number
  finish: number
  balance: number
  value: number
}

export interface CookingRatings {
  taste: number
  difficulty: number
  timeSpent: number
  reproducibility: number
  plating: number
  value: number
}


export type RecordRatings = RestaurantRatings | WineRatings | CookingRatings

export interface FoodRecord {
  id: string
  userId: string
  restaurantId: string | null
  recordType: RecordType
  createdAt: string

  menuName: string
  category: string
  subCategory: string | null
  pricePerPerson: number | null

  ratings: RecordRatings
  ratingOverall: number

  comment: string | null
  tags: string[]
  flavorTags: string[]
  textureTags: string[]
  atmosphereTags: string[]

  visibility: RecordVisibility

  aiRecognized: boolean
  completenessScore: number
  locationAtRecord: RecordLocation | null

  phaseStatus: 1 | 2 | 3
  phase1CompletedAt: string | null
  phase2CompletedAt: string | null
  phase3CompletedAt: string | null
  scaledRating: number | null
  comparisonCount: number
  visitTime: string | null
  companionCount: number | null
  totalCost: number | null
}

export type PhotoType = 'signboard' | 'menu' | 'companion' | 'receipt' | 'food' | 'other'

export interface RecordPhoto {
  id: string
  recordId: string
  photoUrl: string
  thumbnailUrl: string
  orderIndex: number
  aiLabels: string[]
  photoType: PhotoType
  aiDescription: string | null
}

export interface BlogSection {
  type: 'text' | 'photo'
  content: string
  photoIndex?: number
  caption?: string
}

export interface AiQuestion {
  id: string
  question: string
  options: string[]
  type: 'select' | 'freetext'
}

export interface RecordJournal {
  id: string
  recordId: string
  companions: string[]
  occasion: string | null
  moodTags: string[]
  memo: string | null
  blogTitle: string | null
  blogContent: string | null
  blogSections: BlogSection[] | null
  aiQuestions: AiQuestion[] | null
  userAnswers: Record<string, string> | null
  published: boolean
  publishedAt: string | null
}
