import { createClient } from "@/infrastructure/supabase/client"
import type { FoodRecord, RecordPhoto, RecordTasteProfile, RecordAiAnalysis, RecordWithPhotos } from "@/domain/entities/record"
import type { RecordRepository, CreateRecordInput, RecordFilters, UpdateAiAnalysisInput, UpdateTasteProfileInput, UpdateJournalInput } from "@/domain/repositories/record-repository"

function calculateOverallRating(input: CreateRecordInput): number | null {
  if (input.recordType === "restaurant") {
    const ratings = [input.ratingTaste, input.ratingValue, input.ratingService, input.ratingAtmosphere, input.ratingCleanliness, input.ratingPortion]
    const valid = ratings.filter((r): r is number => r != null)
    return valid.length > 0 ? valid.reduce((a, b) => a + b, 0) / valid.length : null
  }
  if (input.recordType === "wine") {
    const ratings = [input.ratingTaste, input.ratingValue]
    const valid = ratings.filter((r): r is number => r != null)
    return valid.length > 0 ? valid.reduce((a, b) => a + b, 0) / valid.length : null
  }
  if (input.recordType === "cooking") {
    const ratings = [input.ratingBalance, input.ratingTaste]
    const valid = ratings.filter((r): r is number => r != null)
    return valid.length > 0 ? valid.reduce((a, b) => a + b, 0) / valid.length : null
  }
  return null
}

function mapDbRecord(data: Record<string, unknown>): FoodRecord {
  return {
    id: data.id as string,
    userId: data.user_id as string,
    restaurantId: data.restaurant_id as string | null,
    recordType: data.record_type as FoodRecord["recordType"],
    menuName: data.menu_name as string | null,
    genre: data.genre as string | null,
    subGenre: data.sub_genre as string | null,
    ratingOverall: data.rating_overall as number | null,
    ratingTaste: data.rating_taste as number | null,
    ratingValue: data.rating_value as number | null,
    ratingService: data.rating_service as number | null,
    ratingAtmosphere: data.rating_atmosphere as number | null,
    ratingCleanliness: data.rating_cleanliness as number | null,
    ratingPortion: data.rating_portion as number | null,
    ratingBalance: data.rating_balance as number | null,
    ratingDifficulty: data.rating_difficulty as number | null,
    ratingTimeSpent: data.rating_time_spent as number | null,
    ratingReproducibility: data.rating_reproducibility as number | null,
    ratingPlating: data.rating_plating as number | null,
    ratingMaterialCost: data.rating_material_cost as number | null,
    comment: data.comment as string | null,
    tags: (data.tags as string[]) ?? [],
    flavorTags: (data.flavor_tags as string[]) ?? [],
    textureTags: (data.texture_tags as string[]) ?? [],
    atmosphereTags: (data.atmosphere_tags as string[]) ?? [],
    visibility: data.visibility as FoodRecord["visibility"],
    aiRecognized: data.ai_recognized as boolean,
    completenessScore: data.completeness_score as number,
    locationLat: data.location_lat as number | null,
    locationLng: data.location_lng as number | null,
    pricePerPerson: data.price_per_person as number | null,
    phaseStatus: data.phase_status as number,
    phase1CompletedAt: data.phase1_completed_at as string | null,
    phase2CompletedAt: data.phase2_completed_at as string | null,
    phase3CompletedAt: data.phase3_completed_at as string | null,
    scaledRating: data.scaled_rating as number | null,
    comparisonCount: data.comparison_count as number,
    scene: data.scene as string | null,
    pairingFood: data.pairing_food as string | null,
    purchasePrice: data.purchase_price as number | null,
    visitTime: data.visit_time as string | null,
    companionCount: data.companion_count as number | null,
    totalCost: data.total_cost as number | null,
    createdAt: data.created_at as string,
  }
}

function mapDbPhoto(data: Record<string, unknown>): RecordPhoto {
  return {
    id: data.id as string,
    recordId: data.record_id as string,
    photoUrl: data.photo_url as string,
    thumbnailUrl: data.thumbnail_url as string | null,
    orderIndex: data.order_index as number,
    aiLabels: (data.ai_labels as string[]) ?? [],
  }
}

export class SupabaseRecordRepository implements RecordRepository {
  private supabase = createClient()

  async create(input: CreateRecordInput): Promise<FoodRecord> {
    const ratingOverall = calculateOverallRating(input)

    const { data, error } = await this.supabase
      .from("records")
      .insert({
        user_id: input.userId,
        record_type: input.recordType,
        restaurant_id: input.restaurantId ?? null,
        menu_name: input.menuName ?? null,
        genre: input.genre ?? null,
        sub_genre: input.subGenre ?? null,
        rating_overall: ratingOverall,
        rating_taste: input.ratingTaste ?? null,
        rating_value: input.ratingValue ?? null,
        rating_service: input.ratingService ?? null,
        rating_atmosphere: input.ratingAtmosphere ?? null,
        rating_cleanliness: input.ratingCleanliness ?? null,
        rating_portion: input.ratingPortion ?? null,
        rating_balance: input.ratingBalance ?? null,
        rating_difficulty: input.ratingDifficulty ?? null,
        rating_time_spent: input.ratingTimeSpent ?? null,
        rating_reproducibility: input.ratingReproducibility ?? null,
        rating_plating: input.ratingPlating ?? null,
        rating_material_cost: input.ratingMaterialCost ?? null,
        comment: input.comment ?? null,
        tags: input.tags ?? [],
        flavor_tags: input.flavorTags ?? [],
        texture_tags: input.textureTags ?? [],
        atmosphere_tags: input.atmosphereTags ?? [],
        visibility: input.visibility ?? "private",
        scene: input.scene ?? null,
        location_lat: input.locationLat ?? null,
        location_lng: input.locationLng ?? null,
        price_per_person: input.pricePerPerson ?? null,
        pairing_food: input.pairingFood ?? null,
        purchase_price: input.purchasePrice ?? null,
        visit_time: input.visitTime ?? null,
        companion_count: input.companionCount ?? null,
        total_cost: input.totalCost ?? null,
        phase1_completed_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) throw new Error(`Failed to create record: ${error.message}`)
    return mapDbRecord(data)
  }

  async getById(id: string): Promise<RecordWithPhotos | null> {
    const { data, error } = await this.supabase
      .from("records")
      .select("*, record_photos(*), restaurants(name, address)")
      .eq("id", id)
      .single()

    if (error || !data) return null

    const photos = ((data.record_photos as Record<string, unknown>[]) ?? [])
      .map(mapDbPhoto)
      .sort((a, b) => a.orderIndex - b.orderIndex)

    const restaurant = data.restaurants
      ? { name: (data.restaurants as Record<string, unknown>).name as string, address: (data.restaurants as Record<string, unknown>).address as string | null }
      : null

    return { ...mapDbRecord(data), photos, restaurant }
  }

  async update(id: string, data: Partial<CreateRecordInput>): Promise<FoodRecord> {
    const updateData: Record<string, unknown> = {}
    if (data.menuName !== undefined) updateData.menu_name = data.menuName
    if (data.genre !== undefined) updateData.genre = data.genre
    if (data.subGenre !== undefined) updateData.sub_genre = data.subGenre
    if (data.ratingTaste !== undefined) updateData.rating_taste = data.ratingTaste
    if (data.ratingValue !== undefined) updateData.rating_value = data.ratingValue
    if (data.ratingService !== undefined) updateData.rating_service = data.ratingService
    if (data.ratingAtmosphere !== undefined) updateData.rating_atmosphere = data.ratingAtmosphere
    if (data.ratingCleanliness !== undefined) updateData.rating_cleanliness = data.ratingCleanliness
    if (data.ratingPortion !== undefined) updateData.rating_portion = data.ratingPortion
    if (data.ratingBalance !== undefined) updateData.rating_balance = data.ratingBalance
    if (data.ratingDifficulty !== undefined) updateData.rating_difficulty = data.ratingDifficulty
    if (data.ratingTimeSpent !== undefined) updateData.rating_time_spent = data.ratingTimeSpent
    if (data.ratingReproducibility !== undefined) updateData.rating_reproducibility = data.ratingReproducibility
    if (data.ratingPlating !== undefined) updateData.rating_plating = data.ratingPlating
    if (data.ratingMaterialCost !== undefined) updateData.rating_material_cost = data.ratingMaterialCost
    if (data.comment !== undefined) updateData.comment = data.comment
    if (data.tags !== undefined) updateData.tags = data.tags
    if (data.flavorTags !== undefined) updateData.flavor_tags = data.flavorTags
    if (data.textureTags !== undefined) updateData.texture_tags = data.textureTags
    if (data.atmosphereTags !== undefined) updateData.atmosphere_tags = data.atmosphereTags
    if (data.visibility !== undefined) updateData.visibility = data.visibility
    if (data.scene !== undefined) updateData.scene = data.scene
    if (data.companionCount !== undefined) updateData.companion_count = data.companionCount
    if (data.totalCost !== undefined) updateData.total_cost = data.totalCost
    if (data.pairingFood !== undefined) updateData.pairing_food = data.pairingFood
    if (data.purchasePrice !== undefined) updateData.purchase_price = data.purchasePrice

    // Recalculate overall rating if any rating field changed
    const ratingFields = [
      "ratingTaste", "ratingValue", "ratingService", "ratingAtmosphere",
      "ratingCleanliness", "ratingPortion", "ratingBalance", "ratingDifficulty",
      "ratingTimeSpent", "ratingReproducibility", "ratingPlating", "ratingMaterialCost",
    ] as const
    const hasRatingChange = ratingFields.some((f) => data[f] !== undefined)
    if (hasRatingChange) {
      const overall = calculateOverallRating({ ...data, recordType: data.recordType ?? "restaurant" } as CreateRecordInput)
      if (overall !== null) updateData.rating_overall = overall
    }

    const { data: result, error } = await this.supabase
      .from("records")
      .update(updateData)
      .eq("id", id)
      .select()
      .single()

    if (error) throw new Error(`Failed to update record: ${error.message}`)
    return mapDbRecord(result)
  }

  async delete(id: string): Promise<void> {
    const { error } = await this.supabase.from("records").delete().eq("id", id)
    if (error) throw new Error(`Failed to delete record: ${error.message}`)
  }

  async list(filters: RecordFilters): Promise<RecordWithPhotos[]> {
    let query = this.supabase
      .from("records")
      .select("*, record_photos(*), restaurants(name, address)")
      .order("created_at", { ascending: false })

    if (filters.userId) query = query.eq("user_id", filters.userId)
    if (filters.recordType) query = query.eq("record_type", filters.recordType)
    if (filters.genre) query = query.eq("genre", filters.genre)
    if (filters.fromDate) query = query.gte("created_at", filters.fromDate)
    if (filters.toDate) query = query.lte("created_at", filters.toDate)
    if (filters.limit) query = query.limit(filters.limit)
    if (filters.offset) query = query.range(filters.offset, filters.offset + (filters.limit ?? 20) - 1)

    const { data, error } = await query
    if (error) throw new Error(`Failed to list records: ${error.message}`)

    return (data ?? []).map((item) => {
      const photos = ((item.record_photos as Record<string, unknown>[]) ?? [])
        .map(mapDbPhoto)
        .sort((a, b) => a.orderIndex - b.orderIndex)
      const restaurant = item.restaurants
        ? { name: (item.restaurants as Record<string, unknown>).name as string, address: (item.restaurants as Record<string, unknown>).address as string | null }
        : null
      return { ...mapDbRecord(item), photos, restaurant }
    })
  }

  async getPhotos(recordId: string): Promise<RecordPhoto[]> {
    const { data, error } = await this.supabase
      .from("record_photos")
      .select("*")
      .eq("record_id", recordId)
      .order("order_index")

    if (error) throw new Error(`Failed to get photos: ${error.message}`)
    return (data ?? []).map(mapDbPhoto)
  }

  async addPhotos(recordId: string, photos: Array<{ photoUrl: string; thumbnailUrl?: string; orderIndex: number }>): Promise<RecordPhoto[]> {
    const { data, error } = await this.supabase
      .from("record_photos")
      .insert(photos.map((p) => ({
        record_id: recordId,
        photo_url: p.photoUrl,
        thumbnail_url: p.thumbnailUrl ?? null,
        order_index: p.orderIndex,
      })))
      .select()

    if (error) throw new Error(`Failed to add photos: ${error.message}`)
    return (data ?? []).map(mapDbPhoto)
  }

  async getTasteProfile(recordId: string): Promise<RecordTasteProfile | null> {
    const { data, error } = await this.supabase
      .from("record_taste_profiles")
      .select("*")
      .eq("record_id", recordId)
      .single()

    if (error || !data) return null
    return {
      id: data.id,
      recordId: data.record_id,
      spicy: data.spicy, sweet: data.sweet, salty: data.salty,
      sour: data.sour, umami: data.umami, rich: data.rich,
      wineAcidity: data.wine_acidity, wineBody: data.wine_body,
      wineTannin: data.wine_tannin, wineSweetness: data.wine_sweetness,
      wineBalance: data.wine_balance, wineFinish: data.wine_finish,
      wineAroma: data.wine_aroma,
      wineAcidityUser: data.wine_acidity_user, wineBodyUser: data.wine_body_user,
      wineTanninUser: data.wine_tannin_user, wineSweetnessUser: data.wine_sweetness_user,
      wineBalanceUser: data.wine_balance_user, wineFinishUser: data.wine_finish_user,
      wineAromaUser: data.wine_aroma_user,
      source: data.source, confidence: data.confidence,
      reviewCount: data.review_count, summary: data.summary,
      createdAt: data.created_at,
    }
  }

  async getAiAnalysis(recordId: string): Promise<RecordAiAnalysis | null> {
    const { data, error } = await this.supabase
      .from("record_ai_analyses")
      .select("*")
      .eq("record_id", recordId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single()

    if (error || !data) return null
    return {
      id: data.id,
      recordId: data.record_id,
      rawResponse: data.raw_response,
      identifiedRestaurant: data.identified_restaurant,
      extractedMenuItems: data.extracted_menu_items,
      orderedItems: data.ordered_items,
      receiptData: data.receipt_data,
      companionData: data.companion_data,
      wineInfo: data.wine_info,
      pairingFood: data.pairing_food,
      wineTastingAi: data.wine_tasting_ai,
      photoClassifications: data.photo_classifications,
      estimatedVisitTime: data.estimated_visit_time,
      confidenceScore: data.confidence_score,
      createdAt: data.created_at,
    }
  }

  async getByMonth(userId: string, year: number, month: number): Promise<RecordWithPhotos[]> {
    const startDate = new Date(year, month - 1, 1).toISOString()
    const endDate = new Date(year, month, 0, 23, 59, 59).toISOString()
    return this.list({ userId, fromDate: startDate, toDate: endDate })
  }

  async updateAiAnalysis(recordId: string, data: UpdateAiAnalysisInput): Promise<void> {
    const updateData: Record<string, unknown> = {}
    if (data.identifiedRestaurant !== undefined) updateData.identified_restaurant = data.identifiedRestaurant
    if (data.orderedItems !== undefined) updateData.ordered_items = data.orderedItems
    if (data.extractedMenuItems !== undefined) updateData.extracted_menu_items = data.extractedMenuItems
    if (data.wineInfo !== undefined) updateData.wine_info = data.wineInfo
    if (data.wineTastingAi !== undefined) updateData.wine_tasting_ai = data.wineTastingAi

    // Update the latest AI analysis row
    const { error } = await this.supabase
      .from("record_ai_analyses")
      .update(updateData)
      .eq("record_id", recordId)
      .order("created_at", { ascending: false })
      .limit(1)

    if (error) throw new Error(`Failed to update AI analysis: ${error.message}`)
  }

  async updateTasteProfile(recordId: string, data: UpdateTasteProfileInput): Promise<void> {
    const updateData: Record<string, unknown> = { source: "manual" }
    if (data.spicy !== undefined) updateData.spicy = data.spicy
    if (data.sweet !== undefined) updateData.sweet = data.sweet
    if (data.salty !== undefined) updateData.salty = data.salty
    if (data.sour !== undefined) updateData.sour = data.sour
    if (data.umami !== undefined) updateData.umami = data.umami
    if (data.rich !== undefined) updateData.rich = data.rich
    if (data.wineAcidity !== undefined) updateData.wine_acidity = data.wineAcidity
    if (data.wineBody !== undefined) updateData.wine_body = data.wineBody
    if (data.wineTannin !== undefined) updateData.wine_tannin = data.wineTannin
    if (data.wineSweetness !== undefined) updateData.wine_sweetness = data.wineSweetness
    if (data.wineBalance !== undefined) updateData.wine_balance = data.wineBalance
    if (data.wineFinish !== undefined) updateData.wine_finish = data.wineFinish
    if (data.wineAroma !== undefined) updateData.wine_aroma = data.wineAroma
    if (data.wineAcidityUser !== undefined) updateData.wine_acidity_user = data.wineAcidityUser
    if (data.wineBodyUser !== undefined) updateData.wine_body_user = data.wineBodyUser
    if (data.wineTanninUser !== undefined) updateData.wine_tannin_user = data.wineTanninUser
    if (data.wineSweetnessUser !== undefined) updateData.wine_sweetness_user = data.wineSweetnessUser
    if (data.wineBalanceUser !== undefined) updateData.wine_balance_user = data.wineBalanceUser
    if (data.wineFinishUser !== undefined) updateData.wine_finish_user = data.wineFinishUser
    if (data.wineAromaUser !== undefined) updateData.wine_aroma_user = data.wineAromaUser

    // Upsert: update existing or create new
    const { data: existing } = await this.supabase
      .from("record_taste_profiles")
      .select("id")
      .eq("record_id", recordId)
      .single()

    if (existing) {
      const { error } = await this.supabase
        .from("record_taste_profiles")
        .update(updateData)
        .eq("record_id", recordId)

      if (error) throw new Error(`Failed to update taste profile: ${error.message}`)
    } else {
      const { error } = await this.supabase
        .from("record_taste_profiles")
        .insert({ record_id: recordId, ...updateData })

      if (error) throw new Error(`Failed to create taste profile: ${error.message}`)
    }
  }

  async updateJournal(recordId: string, data: UpdateJournalInput): Promise<void> {
    const updateData: Record<string, unknown> = {}
    if (data.blogTitle !== undefined) updateData.blog_title = data.blogTitle
    if (data.blogContent !== undefined) updateData.blog_content = data.blogContent

    const { error } = await this.supabase
      .from("record_journals")
      .update(updateData)
      .eq("record_id", recordId)

    if (error) throw new Error(`Failed to update journal: ${error.message}`)
  }
}
