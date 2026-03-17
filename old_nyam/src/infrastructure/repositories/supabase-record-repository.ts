import { createClient } from '@/infrastructure/supabase/client'
import { sanitizeLikePattern } from '@/shared/utils/sanitize'
import type { FoodRecord, RecordPhoto, RecordRatings } from '@/domain/entities/record'
import type {
  RecordRepository,
  PaginationParams,
  PaginatedResult,
} from '@/domain/repositories/record-repository'
import type { Database } from '@/infrastructure/supabase/types'

type RecordRow = Database['public']['Tables']['records']['Row']
type RecordPhotoRow = Database['public']['Tables']['record_photos']['Row']
type RecordInsert = Database['public']['Tables']['records']['Insert']

function toPhoto(row: RecordPhotoRow): RecordPhoto {
  return {
    id: row.id,
    recordId: row.record_id,
    photoUrl: row.photo_url,
    thumbnailUrl: row.thumbnail_url ?? '',
    orderIndex: row.order_index,
    aiLabels: row.ai_labels ?? [],
    photoType: (row as Record<string, unknown>).photo_type as RecordPhoto['photoType'] ?? 'food',
    aiDescription: (row as Record<string, unknown>).ai_description as string | null ?? null,
  }
}

function buildRatings(row: RecordRow): RecordRatings {
  if (row.record_type === 'wine') {
    return {
      aroma: row.rating_aroma ?? 0,
      body: row.rating_body ?? 0,
      acidity: row.rating_acidity ?? 0,
      finish: row.rating_finish ?? 0,
      balance: row.rating_balance ?? 0,
      value: row.rating_value ?? 0,
    }
  }
  if (row.record_type === 'cooking' || row.record_type === 'homemade') {
    return {
      taste: row.rating_taste ?? 0,
      difficulty: row.rating_difficulty ?? 0,
      timeSpent: row.rating_time_spent ?? 0,
      reproducibility: row.rating_reproducibility ?? 0,
      plating: (row as Record<string, unknown>).rating_plating as number ?? 0,
      value: row.rating_value ?? 0,
    }
  }
  return {
    taste: row.rating_taste ?? 0,
    value: row.rating_value ?? 0,
    service: row.rating_service ?? 0,
    atmosphere: row.rating_atmosphere ?? 0,
    cleanliness: row.rating_cleanliness ?? 0,
    portion: row.rating_portion ?? 0,
  }
}

function toRecord(
  row: RecordRow,
  photos?: RecordPhotoRow[],
): FoodRecord {
  return {
    id: row.id,
    userId: row.user_id,
    restaurantId: row.restaurant_id,
    recordType: row.record_type === 'homemade' ? 'cooking' : row.record_type,
    createdAt: row.created_at,
    menuName: row.menu_name ?? '',
    category: row.category ?? '',
    subCategory: row.sub_category,
    pricePerPerson: row.price_per_person,
    ratings: buildRatings(row),
    ratingOverall: row.rating_overall ?? 0,
    comment: row.comment,
    tags: row.tags ?? [],
    flavorTags: row.flavor_tags ?? [],
    textureTags: row.texture_tags ?? [],
    atmosphereTags: row.atmosphere_tags ?? [],
    visibility: row.visibility,
    aiRecognized: row.ai_recognized,
    completenessScore: row.completeness_score,
    locationAtRecord:
      row.location_lat != null && row.location_lng != null
        ? { lat: row.location_lat, lng: row.location_lng }
        : null,
    phaseStatus: ((row as Record<string, unknown>).phase_status as number ?? 1) as 1 | 2 | 3,
    phase1CompletedAt: (row as Record<string, unknown>).phase1_completed_at as string | null ?? null,
    phase2CompletedAt: (row as Record<string, unknown>).phase2_completed_at as string | null ?? null,
    phase3CompletedAt: (row as Record<string, unknown>).phase3_completed_at as string | null ?? null,
    scaledRating: (row as Record<string, unknown>).scaled_rating as number | null ?? null,
    comparisonCount: (row as Record<string, unknown>).comparison_count as number ?? 0,
    visitTime: (row as Record<string, unknown>).visit_time as string | null ?? null,
    companionCount: (row as Record<string, unknown>).companion_count as number | null ?? null,
    totalCost: (row as Record<string, unknown>).total_cost as number | null ?? null,
    photos: photos ? photos.map(toPhoto) : [],
  }
}

function ratingsToColumns(ratings: RecordRatings): Record<string, number | null> {
  const cols: Record<string, number | null> = {
    rating_taste: null,
    rating_value: null,
    rating_service: null,
    rating_atmosphere: null,
    rating_cleanliness: null,
    rating_portion: null,
    rating_aroma: null,
    rating_body: null,
    rating_acidity: null,
    rating_finish: null,
    rating_balance: null,
    rating_difficulty: null,
    rating_time_spent: null,
    rating_reproducibility: null,
    rating_plating: null,
  }

  const v = (n: number) => (n > 0 ? n : null)

  if ('service' in ratings) {
    cols.rating_taste = v(ratings.taste)
    cols.rating_value = v(ratings.value)
    cols.rating_service = v(ratings.service)
    cols.rating_atmosphere = v(ratings.atmosphere)
    cols.rating_cleanliness = v(ratings.cleanliness)
    cols.rating_portion = v(ratings.portion)
  } else if ('aroma' in ratings) {
    cols.rating_aroma = v(ratings.aroma)
    cols.rating_body = v(ratings.body)
    cols.rating_acidity = v(ratings.acidity)
    cols.rating_finish = v(ratings.finish)
    cols.rating_balance = v(ratings.balance)
    cols.rating_value = v(ratings.value)
  } else if ('difficulty' in ratings) {
    cols.rating_taste = v(ratings.taste)
    cols.rating_difficulty = v(ratings.difficulty)
    cols.rating_time_spent = v(ratings.timeSpent)
    cols.rating_reproducibility = v(ratings.reproducibility)
    cols.rating_plating = v((ratings as unknown as Record<string, number>).plating ?? 0)
    cols.rating_value = v((ratings as unknown as Record<string, number>).value ?? 0)
  }

  return cols
}

function toInsert(data: Omit<FoodRecord, 'id' | 'createdAt'> | Partial<FoodRecord>): RecordInsert {
  const insert: Record<string, unknown> = {}

  if ('userId' in data && data.userId !== undefined) insert.user_id = data.userId
  if ('restaurantId' in data && data.restaurantId !== undefined) insert.restaurant_id = data.restaurantId
  if ('recordType' in data && data.recordType !== undefined) insert.record_type = data.recordType
  if ('menuName' in data && data.menuName !== undefined) insert.menu_name = data.menuName
  if ('category' in data && data.category !== undefined) insert.category = data.category
  if ('subCategory' in data && data.subCategory !== undefined) insert.sub_category = data.subCategory
  if ('pricePerPerson' in data && data.pricePerPerson !== undefined) insert.price_per_person = data.pricePerPerson
  if ('ratingOverall' in data && data.ratingOverall !== undefined) insert.rating_overall = data.ratingOverall
  if ('comment' in data && data.comment !== undefined) insert.comment = data.comment
  if ('tags' in data && data.tags !== undefined) insert.tags = data.tags
  if ('flavorTags' in data && data.flavorTags !== undefined) insert.flavor_tags = data.flavorTags
  if ('textureTags' in data && data.textureTags !== undefined) insert.texture_tags = data.textureTags
  if ('atmosphereTags' in data && data.atmosphereTags !== undefined) insert.atmosphere_tags = data.atmosphereTags
  if ('visibility' in data && data.visibility !== undefined) insert.visibility = data.visibility
  if ('aiRecognized' in data && data.aiRecognized !== undefined) insert.ai_recognized = data.aiRecognized
  if ('completenessScore' in data && data.completenessScore !== undefined) insert.completeness_score = data.completenessScore

  if ('locationAtRecord' in data && data.locationAtRecord !== undefined) {
    if (data.locationAtRecord) {
      insert.location_lat = data.locationAtRecord.lat
      insert.location_lng = data.locationAtRecord.lng
    } else {
      insert.location_lat = null
      insert.location_lng = null
    }
  }

  if ('ratings' in data && data.ratings !== undefined) {
    Object.assign(insert, ratingsToColumns(data.ratings))
  }

  if ('phaseStatus' in data && data.phaseStatus !== undefined) insert.phase_status = data.phaseStatus
  if ('phase1CompletedAt' in data && data.phase1CompletedAt !== undefined) insert.phase1_completed_at = data.phase1CompletedAt
  if ('phase2CompletedAt' in data && data.phase2CompletedAt !== undefined) insert.phase2_completed_at = data.phase2CompletedAt
  if ('phase3CompletedAt' in data && data.phase3CompletedAt !== undefined) insert.phase3_completed_at = data.phase3CompletedAt
  if ('scaledRating' in data && data.scaledRating !== undefined) insert.scaled_rating = data.scaledRating
  if ('comparisonCount' in data && data.comparisonCount !== undefined) insert.comparison_count = data.comparisonCount
  if ('visitTime' in data && data.visitTime !== undefined) insert.visit_time = data.visitTime
  if ('companionCount' in data && data.companionCount !== undefined) insert.companion_count = data.companionCount
  if ('totalCost' in data && data.totalCost !== undefined) insert.total_cost = data.totalCost

  return insert as RecordInsert
}

export class SupabaseRecordRepository implements RecordRepository {
  async getById(id: string): Promise<FoodRecord | null> {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('records')
      .select('*, record_photos(*)')
      .eq('id', id)
      .single()

    if (error || !data) return null

    const { record_photos, ...row } = data as RecordRow & { record_photos: RecordPhotoRow[] }
    return toRecord(row, record_photos)
  }

  async getByUserId(
    userId: string,
    pagination: PaginationParams,
  ): Promise<PaginatedResult<FoodRecord>> {
    const supabase = createClient()
    const { offset, limit } = pagination

    const { count } = await supabase
      .from('records')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)

    const total = count ?? 0

    const { data, error } = await supabase
      .from('records')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error || !data) {
      return { data: [], total, hasMore: false }
    }

    return {
      data: (data as RecordRow[]).map((row) => toRecord(row)),
      total,
      hasMore: offset + limit < total,
    }
  }

  async create(
    record: Omit<FoodRecord, 'id' | 'createdAt'>,
  ): Promise<FoodRecord> {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('records')
      .insert(toInsert(record))
      .select()
      .single()

    if (error || !data) {
      throw new Error(error?.message ?? 'Failed to create record')
    }

    return toRecord(data as RecordRow)
  }

  async update(
    id: string,
    record: Partial<FoodRecord>,
  ): Promise<FoodRecord> {
    const supabase = createClient()
    const updateData = toInsert(record)

    let query = supabase
      .from('records')
      .update(updateData)
      .eq('id', id)

    if (record.userId) {
      query = query.eq('user_id', record.userId)
    }

    const { data, error } = await query.select().single()

    if (error || !data) {
      throw new Error(error?.message ?? 'Failed to update record')
    }

    return toRecord(data as RecordRow)
  }

  async delete(id: string): Promise<void> {
    const supabase = createClient()
    const { error } = await supabase
      .from('records')
      .delete()
      .eq('id', id)

    if (error) {
      throw new Error(error.message)
    }
  }

  async getByUserIdForMonth(
    userId: string,
    year: number,
    month: number,
  ): Promise<FoodRecord[]> {
    const supabase = createClient()
    // Use local timezone boundaries (KST) converted to UTC ISO strings
    const startDate = new Date(year, month - 1, 1).toISOString()
    const endDate = new Date(year, month, 1).toISOString()

    const { data, error } = await supabase
      .from('records')
      .select('*, record_photos(*)')
      .eq('user_id', userId)
      .gte('created_at', startDate)
      .lt('created_at', endDate)
      .order('created_at', { ascending: true })

    if (error || !data) return []

    return (data as (RecordRow & { record_photos: RecordPhotoRow[] })[]).map(
      ({ record_photos, ...row }) => toRecord(row, record_photos),
    )
  }

  async search(query: string): Promise<FoodRecord[]> {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('records')
      .select('*')
      .or(`menu_name.ilike.%${sanitizeLikePattern(query)}%,comment.ilike.%${sanitizeLikePattern(query)}%`)

    if (error || !data) return []

    return (data as RecordRow[]).map((row) => toRecord(row))
  }
}
