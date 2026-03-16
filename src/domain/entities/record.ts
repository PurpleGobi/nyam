export type RecordType = 'restaurant' | 'wine' | 'homemade'

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

export interface HomemadeRatings {
  taste: number
  difficulty: number
  timeSpent: number
  reproducibility: number
}

export type RecordRatings = RestaurantRatings | WineRatings | HomemadeRatings

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
}

export interface RecordPhoto {
  id: string
  recordId: string
  photoUrl: string
  thumbnailUrl: string
  orderIndex: number
  aiLabels: string[]
}

export interface RecordJournal {
  id: string
  recordId: string
  companions: string[]
  occasion: string | null
  moodTags: string[]
  memo: string | null
}
