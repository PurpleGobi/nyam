import type { FoodRecord, RecordPhoto, RecordTasteProfile, RecordAiAnalysis, RecordWithPhotos } from "@/domain/entities/record"
import type { RecordType, Visibility } from "@/infrastructure/supabase/types"

export interface CreateRecordInput {
  userId: string
  recordType: RecordType
  restaurantId?: string
  menuName?: string
  genre?: string
  subGenre?: string
  ratingTaste?: number
  ratingValue?: number
  ratingService?: number
  ratingAtmosphere?: number
  ratingCleanliness?: number
  ratingPortion?: number
  ratingBalance?: number
  ratingDifficulty?: number
  ratingTimeSpent?: number
  ratingReproducibility?: number
  ratingPlating?: number
  ratingMaterialCost?: number
  comment?: string
  tags?: string[]
  flavorTags?: string[]
  textureTags?: string[]
  atmosphereTags?: string[]
  visibility?: Visibility
  scene?: string
  locationLat?: number
  locationLng?: number
  pricePerPerson?: number
  pairingFood?: string
  purchasePrice?: number
  visitTime?: string
  companionCount?: number
  totalCost?: number
}

export interface RecordFilters {
  userId?: string
  recordType?: RecordType
  genre?: string
  fromDate?: string
  toDate?: string
  limit?: number
  offset?: number
}

export interface RecordRepository {
  create(input: CreateRecordInput): Promise<FoodRecord>
  getById(id: string): Promise<RecordWithPhotos | null>
  update(id: string, data: Partial<CreateRecordInput>): Promise<FoodRecord>
  delete(id: string): Promise<void>
  list(filters: RecordFilters): Promise<RecordWithPhotos[]>
  getPhotos(recordId: string): Promise<RecordPhoto[]>
  addPhotos(recordId: string, photos: Array<{ photoUrl: string; thumbnailUrl?: string; orderIndex: number }>): Promise<RecordPhoto[]>
  getTasteProfile(recordId: string): Promise<RecordTasteProfile | null>
  getAiAnalysis(recordId: string): Promise<RecordAiAnalysis | null>
  getByMonth(userId: string, year: number, month: number): Promise<RecordWithPhotos[]>
}
