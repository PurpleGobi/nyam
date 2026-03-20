import type { FoodRecord, RecordPhoto, PhotoCropData, RecordTasteProfile, RecordAiAnalysis, RecordWithPhotos } from "@/domain/entities/record"
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

export interface UpdateAiAnalysisInput {
  identifiedRestaurant?: RecordAiAnalysis["identifiedRestaurant"]
  orderedItems?: RecordAiAnalysis["orderedItems"]
  extractedMenuItems?: RecordAiAnalysis["extractedMenuItems"]
  wineInfo?: RecordAiAnalysis["wineInfo"]
  wineTastingAi?: RecordAiAnalysis["wineTastingAi"]
}

export interface UpdateTasteProfileInput {
  spicy?: number | null
  sweet?: number | null
  salty?: number | null
  sour?: number | null
  umami?: number | null
  rich?: number | null
  wineAcidity?: number | null
  wineBody?: number | null
  wineTannin?: number | null
  wineSweetness?: number | null
  wineBalance?: number | null
  wineFinish?: number | null
  wineAroma?: number | null
  wineAcidityUser?: number | null
  wineBodyUser?: number | null
  wineTanninUser?: number | null
  wineSweetnessUser?: number | null
  wineBalanceUser?: number | null
  wineFinishUser?: number | null
  wineAromaUser?: number | null
}

export interface UpdateJournalInput {
  blogTitle?: string | null
  blogContent?: string | null
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
  updateAiAnalysis(recordId: string, data: UpdateAiAnalysisInput): Promise<void>
  updateTasteProfile(recordId: string, data: UpdateTasteProfileInput): Promise<void>
  updateJournal(recordId: string, data: UpdateJournalInput): Promise<void>
  updatePhotoCrop(photoId: string, cropData: PhotoCropData | null): Promise<void>
}
