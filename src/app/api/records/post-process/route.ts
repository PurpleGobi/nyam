import { NextResponse } from 'next/server'
import { createClient } from '@/infrastructure/supabase/server'
import type { Database } from '@/infrastructure/supabase/types'

type RecordRow = Database['public']['Tables']['records']['Row']

const FLAVOR_TAG_MAP: Record<string, string> = {
  '매운': 'flavor_spicy',
  '달콤한': 'flavor_sweet',
  '짭짤한': 'flavor_salty',
  '시큼한': 'flavor_sour',
  '감칠맛': 'flavor_umami',
  '담백한': 'flavor_rich', // inverse
  '기름진': 'flavor_rich',
  '고소한': 'flavor_umami',
  '향긋한': 'flavor_sweet',
  '깔끔한': 'flavor_salty', // inverse
}

const TEXTURE_TAG_MAP: Record<string, string> = {
  '바삭한': 'texture_crispy',
  '부드러운': 'texture_tender',
  '쫄깃한': 'texture_chewy',
  '크리미한': 'texture_tender',
  '아삭한': 'texture_crispy',
  '촉촉한': 'texture_tender',
}

const ATMOSPHERE_TAG_MAP: Record<string, string> = {
  '조용한': 'atmosphere_noise_low',
  '활기찬': 'atmosphere_noise_high',
  '캐주얼': 'atmosphere_formality_low',
  '포멀': 'atmosphere_formality_high',
  '아늑한': 'atmosphere_space_low',
  '개방적': 'atmosphere_space_high',
  '감성적': 'atmosphere_formality_high',
  '모던한': 'atmosphere_space_high',
}

const TASTE_TYPES: Array<{ code: string; name: string; check: (scores: Record<string, number>) => boolean }> = [
  { code: 'SP', name: '모험적인 미식가', check: (s) => s.flavor_spicy > 0.6 && s.adventurousness > 0.6 },
  { code: 'SW', name: '달콤한 감성파', check: (s) => s.flavor_sweet > 0.6 },
  { code: 'UM', name: '감칠맛 탐험가', check: (s) => s.flavor_umami > 0.6 },
  { code: 'BL', name: '밸런스 추구자', check: (s) => {
    const vals = [s.flavor_spicy, s.flavor_sweet, s.flavor_salty, s.flavor_sour, s.flavor_umami, s.flavor_rich]
    const avg = vals.reduce((a, b) => a + b, 0) / vals.length
    return vals.every(v => Math.abs(v - avg) < 0.15)
  }},
  { code: 'DF', name: '기본에 충실한 미식가', check: () => true },
]

// XP per record, level thresholds
const XP_PER_RECORD = 12
const LEVEL_THRESHOLDS = [0, 30, 80, 160, 300, 500, 800, 1200, 1800, 2600, 3600]

function calculateLevel(xp: number): { level: number; xpToNext: number } {
  let level = 1
  for (let i = 1; i < LEVEL_THRESHOLDS.length; i++) {
    if (xp >= LEVEL_THRESHOLDS[i]) {
      level = i + 1
    } else {
      break
    }
  }
  const nextThreshold = LEVEL_THRESHOLDS[level] ?? LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1] + 1000
  return { level, xpToNext: nextThreshold - xp }
}

export async function POST() {
  const supabase = await createClient()

  // Extract userId from authenticated session (not from request body)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const userId = user.id

  // Fetch recent 100 records
  const { data: records, error: recordsError } = await supabase
    .from('records')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(100)

  if (recordsError) throw new Error(recordsError.message)

  if (!records || records.length === 0) {
    return NextResponse.json({ ok: true, message: 'No records to process' })
  }

  const typedRecords = records as RecordRow[]

  // === 1. TASTE DNA RECALCULATION (음식/와인/요리 분기) ===
  const restaurantRecords = typedRecords.filter((r) => r.record_type === 'restaurant')
  const wineRecords = typedRecords.filter((r) => r.record_type === 'wine')
  const cookingRecords = typedRecords.filter((r) => r.record_type === 'cooking' || r.record_type === 'homemade')

  if (restaurantRecords.length > 0) {
    await recalculateTasteDna(supabase, userId, restaurantRecords)
  }
  if (wineRecords.length > 0) {
    await recalculateTasteDnaWine(supabase, userId, wineRecords)
  }
  if (cookingRecords.length > 0) {
    await recalculateTasteDnaCooking(supabase, userId, cookingRecords)
  }

  // === 2. STYLE DNA XP ===
  await updateStyleDna(supabase, userId, typedRecords)

  // === 3. USER STATS ===
  await updateUserStats(supabase, userId, typedRecords)

  return NextResponse.json({ ok: true })
}

async function recalculateTasteDna(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  records: RecordRow[],
) {
  const sampleCount = records.length

  // Weighted scores — newer records weight more
  const scores: Record<string, number> = {
    flavor_spicy: 0, flavor_sweet: 0, flavor_salty: 0,
    flavor_sour: 0, flavor_umami: 0, flavor_rich: 0,
    texture_crispy: 0, texture_tender: 0, texture_chewy: 0,
    atmosphere_noise: 0.5, atmosphere_formality: 0.5, atmosphere_space: 0.5,
    price_sensitivity: 0.5, adventurousness: 0,
  }

  const counts: Record<string, number> = {}
  const categoryHits: Record<string, number> = {}
  const dayHits: Record<number, number> = {}
  const hourHits: Record<number, number> = {}
  const prices: number[] = []

  for (let i = 0; i < records.length; i++) {
    const r = records[i]
    const weight = 1 - (i / records.length) * 0.5 // newer records: 1.0, oldest: 0.5

    // Flavor tags
    for (const tag of (r.flavor_tags ?? [])) {
      const col = FLAVOR_TAG_MAP[tag]
      if (col) {
        scores[col] = (scores[col] ?? 0) + weight
        counts[col] = (counts[col] ?? 0) + 1
      }
    }

    // Texture tags
    for (const tag of (r.texture_tags ?? [])) {
      const col = TEXTURE_TAG_MAP[tag]
      if (col) {
        scores[col] = (scores[col] ?? 0) + weight
        counts[col] = (counts[col] ?? 0) + 1
      }
    }

    // Atmosphere tags
    for (const tag of (r.atmosphere_tags ?? [])) {
      const mapped = ATMOSPHERE_TAG_MAP[tag]
      if (mapped) {
        if (mapped.endsWith('_high')) {
          const base = mapped.replace('_high', '')
          scores[base] = (scores[base] ?? 0) + weight * 0.1
          counts[base] = (counts[base] ?? 0) + 1
        } else if (mapped.endsWith('_low')) {
          const base = mapped.replace('_low', '')
          scores[base] = (scores[base] ?? 0) - weight * 0.1
          counts[base] = (counts[base] ?? 0) + 1
        }
      }
    }

    // Category
    if (r.category) {
      categoryHits[r.category] = (categoryHits[r.category] ?? 0) + 1
    }

    // Price
    if (r.price_per_person != null) {
      prices.push(r.price_per_person)
    }

    // Time patterns
    const date = new Date(r.created_at)
    const day = date.getDay()
    const hour = date.getHours()
    dayHits[day] = (dayHits[day] ?? 0) + 1
    hourHits[hour] = (hourHits[hour] ?? 0) + 1
  }

  // Normalize flavor/texture scores to 0-1
  const normalized: Record<string, number> = {}
  for (const key of Object.keys(scores)) {
    const c = counts[key] ?? 0
    if (c > 0) {
      normalized[key] = Math.min(scores[key] / c, 1)
    } else {
      normalized[key] = key.startsWith('atmosphere') ? 0.5 : 0
    }
  }

  // Category preferences (percentage)
  const totalCatRecords = Object.values(categoryHits).reduce((a, b) => a + b, 0) || 1
  const categoryPreferences: Record<string, number> = {}
  for (const [cat, count] of Object.entries(categoryHits)) {
    categoryPreferences[cat] = Math.round((count / totalCatRecords) * 100)
  }

  // Unique categories ratio -> adventurousness
  const uniqueCategories = Object.keys(categoryHits).length
  const adventurousness = Math.min(uniqueCategories / 8, 1) // 8+ categories = max

  // Peak day/hour
  const peakDay = Object.entries(dayHits).sort(([, a], [, b]) => b - a)[0]?.[0] ?? '0'
  const peakHour = Object.entries(hourHits).sort(([, a], [, b]) => b - a)[0]?.[0] ?? '12'

  // Price
  const priceAvg = prices.length > 0
    ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length)
    : 0
  const priceMin = prices.length > 0 ? Math.min(...prices) : 0
  const priceMax = prices.length > 0 ? Math.max(...prices) : 0
  const priceSensitivity = prices.length > 0
    ? Math.min((priceMax - priceMin) / (priceAvg || 1), 1)
    : 0.5

  // Taste type
  const scoreForType: Record<string, number> = {
    ...normalized,
    adventurousness,
  }
  const tasteType = TASTE_TYPES.find(t => t.check(scoreForType)) ?? TASTE_TYPES[TASTE_TYPES.length - 1]

  await supabase
    .from('taste_dna')
    .update({
      flavor_spicy: normalized.flavor_spicy ?? 0,
      flavor_sweet: normalized.flavor_sweet ?? 0,
      flavor_salty: normalized.flavor_salty ?? 0,
      flavor_sour: normalized.flavor_sour ?? 0,
      flavor_umami: normalized.flavor_umami ?? 0,
      flavor_rich: normalized.flavor_rich ?? 0,
      texture_crispy: normalized.texture_crispy ?? 0,
      texture_tender: normalized.texture_tender ?? 0,
      texture_chewy: normalized.texture_chewy ?? 0,
      atmosphere_noise: normalized.atmosphere_noise ?? 0.5,
      atmosphere_formality: normalized.atmosphere_formality ?? 0.5,
      atmosphere_space: normalized.atmosphere_space ?? 0.5,
      price_sensitivity: priceSensitivity,
      price_avg: priceAvg,
      price_range_min: priceMin,
      price_range_max: priceMax,
      category_preferences: categoryPreferences,
      peak_day: Number(peakDay),
      peak_hour: Number(peakHour),
      adventurousness,
      taste_type_code: tasteType.code,
      taste_type_name: tasteType.name,
      sample_count: sampleCount,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
}

async function recalculateTasteDnaWine(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  records: RecordRow[],
) {
  const sampleCount = records.length
  if (sampleCount === 0) return

  // 와인 평가 축: 향(aroma), 바디(body), 산미(acidity), 여운(finish), 밸런스(balance), 가성비(value)
  // 이를 TasteDnaWine의 pref_* 와 aroma_* 값으로 변환
  let totalBody = 0, totalAcidity = 0, totalFinish = 0, totalBalance = 0
  let ratedCount = 0

  // 향 태그 카운트 (flavor_tags를 와인 아로마로 매핑)
  const aromaHits: Record<string, number> = {
    fruit: 0, floral: 0, spice: 0, oak: 0, mineral: 0, herbal: 0,
  }
  const WINE_AROMA_MAP: Record<string, string> = {
    '과일향': 'fruit', '베리': 'fruit', '체리': 'fruit', '블랙베리': 'fruit',
    '사과': 'fruit', '배': 'fruit', '레몬': 'fruit', '자몽': 'fruit',
    '꽃향': 'floral', '장미': 'floral', '바이올렛': 'floral',
    '후추': 'spice', '계피': 'spice', '정향': 'spice', '스파이시': 'spice',
    '오크': 'oak', '바닐라': 'oak', '토스트': 'oak', '나무': 'oak',
    '미네랄': 'mineral', '돌': 'mineral', '석회': 'mineral',
    '허브': 'herbal', '민트': 'herbal', '풀': 'herbal', '유칼립투스': 'herbal',
  }

  const varietyHits: Record<string, number> = {}
  const originHits: Record<string, number> = {}
  const prices: number[] = []

  for (let i = 0; i < records.length; i++) {
    const r = records[i]
    const weight = 1 - (i / records.length) * 0.5

    // 평가 점수에서 선호도 산출 (1~5점 → 0~1 정규화)
    if (r.rating_body != null && r.rating_body > 0) {
      totalBody += (r.rating_body / 5) * weight
      totalAcidity += ((r.rating_acidity ?? 3) / 5) * weight
      totalFinish += ((r.rating_finish ?? 3) / 5) * weight
      totalBalance += ((r.rating_balance ?? 3) / 5) * weight
      ratedCount += weight
    }

    // 맛 태그 → 아로마 매핑
    for (const tag of (r.flavor_tags ?? [])) {
      const aroma = WINE_AROMA_MAP[tag]
      if (aroma) aromaHits[aroma] += weight
    }

    // 카테고리/서브카테고리에서 품종/산지 추출
    if (r.sub_category) {
      varietyHits[r.sub_category] = (varietyHits[r.sub_category] ?? 0) + 1
    }
    if (r.category && r.category !== '와인') {
      originHits[r.category] = (originHits[r.category] ?? 0) + 1
    }

    if (r.price_per_person != null) prices.push(r.price_per_person)
  }

  // 정규화
  const normBody = ratedCount > 0 ? Math.min(totalBody / ratedCount, 1) : 0.5
  const normAcidity = ratedCount > 0 ? Math.min(totalAcidity / ratedCount, 1) : 0.5
  const normTannin = ratedCount > 0 ? Math.min(totalFinish / ratedCount, 1) : 0.5 // finish ≈ tannin intensity
  const normSweetness = ratedCount > 0 ? Math.max(1 - normAcidity, 0) : 0.5 // inverse of acidity

  // 아로마 정규화
  const maxAroma = Math.max(...Object.values(aromaHits), 1)
  const normAromas = {
    fruit: aromaHits.fruit / maxAroma,
    floral: aromaHits.floral / maxAroma,
    spice: aromaHits.spice / maxAroma,
    oak: aromaHits.oak / maxAroma,
    mineral: aromaHits.mineral / maxAroma,
    herbal: aromaHits.herbal / maxAroma,
  }

  // 선호 품종/산지 top 5
  const preferredVarieties = Object.entries(varietyHits)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([name]) => name)
  const preferredOrigins = Object.entries(originHits)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([name]) => name)

  const priceMin = prices.length > 0 ? Math.min(...prices) : 0
  const priceMax = prices.length > 0 ? Math.max(...prices) : 0

  await supabase
    .from('taste_dna_wine')
    .upsert({
      user_id: userId,
      pref_body: normBody,
      pref_acidity: normAcidity,
      pref_tannin: normTannin,
      pref_sweetness: normSweetness,
      aroma_fruit: normAromas.fruit,
      aroma_floral: normAromas.floral,
      aroma_spice: normAromas.spice,
      aroma_oak: normAromas.oak,
      aroma_mineral: normAromas.mineral,
      aroma_herbal: normAromas.herbal,
      preferred_varieties: preferredVarieties,
      preferred_origins: preferredOrigins,
      price_range_min: priceMin,
      price_range_max: priceMax,
      sample_count: sampleCount,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })
}

async function recalculateTasteDnaCooking(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  records: RecordRow[],
) {
  const sampleCount = records.length
  if (sampleCount === 0) return

  let totalDifficulty = 0
  let totalTimeSpent = 0
  let ratedCount = 0

  const methodHits: Record<string, number> = {}
  const cuisineHits: Record<string, number> = {}

  for (let i = 0; i < records.length; i++) {
    const r = records[i]
    const weight = 1 - (i / records.length) * 0.5

    // 난이도, 소요시간 (1~5점 → 0~1 정규화)
    if (r.rating_difficulty != null && r.rating_difficulty > 0) {
      totalDifficulty += (r.rating_difficulty / 5) * weight
      totalTimeSpent += ((r.rating_time_spent ?? 3) / 5) * weight
      ratedCount += weight
    }

    // 카테고리 → 요리 장르
    if (r.category) {
      cuisineHits[r.category] = (cuisineHits[r.category] ?? 0) + 1
    }

    // 태그에서 조리법 추출
    for (const tag of (r.tags ?? [])) {
      const METHODS = ['구이', '볶음', '찜', '튀김', '생식', '베이킹', '발효', '끓이기', '무침']
      if (METHODS.includes(tag)) {
        methodHits[tag] = (methodHits[tag] ?? 0) + weight
      }
    }
  }

  const normDifficulty = ratedCount > 0 ? Math.min(totalDifficulty / ratedCount, 1) : 0.5
  const normTimeInvestment = ratedCount > 0 ? Math.min(totalTimeSpent / ratedCount, 1) : 0.5

  // 조리법 선호도 정규화
  const maxMethod = Math.max(...Object.values(methodHits), 1)
  const methodPreferences: Record<string, number> = {}
  for (const [method, count] of Object.entries(methodHits)) {
    methodPreferences[method] = Math.round((count / maxMethod) * 100) / 100
  }

  const preferredCuisines = Object.entries(cuisineHits)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([name]) => name)

  await supabase
    .from('taste_dna_homecook')
    .upsert({
      user_id: userId,
      pref_difficulty: normDifficulty,
      pref_time_investment: normTimeInvestment,
      method_preferences: methodPreferences,
      preferred_cuisines: preferredCuisines,
      sample_count: sampleCount,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })
}

async function updateStyleDna(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  records: RecordRow[],
) {
  // --- GENRES (categories) ---
  const genreMap = new Map<string, {
    count: number
    subCategories: Set<string>
    totalRating: number
    ratedCount: number
    firstAt: string
    lastAt: string
  }>()

  for (const r of records) {
    if (!r.category) continue
    const existing = genreMap.get(r.category)
    if (existing) {
      existing.count++
      if (r.sub_category) existing.subCategories.add(r.sub_category)
      if (r.rating_overall) {
        existing.totalRating += r.rating_overall
        existing.ratedCount++
      }
      if (r.created_at < existing.firstAt) existing.firstAt = r.created_at
      if (r.created_at > existing.lastAt) existing.lastAt = r.created_at
    } else {
      genreMap.set(r.category, {
        count: 1,
        subCategories: new Set(r.sub_category ? [r.sub_category] : []),
        totalRating: r.rating_overall ?? 0,
        ratedCount: r.rating_overall ? 1 : 0,
        firstAt: r.created_at,
        lastAt: r.created_at,
      })
    }
  }

  const totalRecords = records.length || 1
  for (const [category, data] of genreMap) {
    const xp = data.count * XP_PER_RECORD
    const { level, xpToNext } = calculateLevel(xp)
    const avgRating = data.ratedCount > 0 ? data.totalRating / data.ratedCount : 0
    const percentage = Math.round((data.count / totalRecords) * 100)

    await supabase
      .from('experience_atlas_genres')
      .upsert({
        user_id: userId,
        category,
        record_count: data.count,
        sub_category_count: data.subCategories.size,
        sub_categories: Array.from(data.subCategories),
        avg_rating: Math.round(avgRating),
        percentage,
        level,
        xp,
        xp_to_next: xpToNext,
        volume_score: Math.min(data.count / 20, 1),
        diversity_score: Math.min(data.subCategories.size / 5, 1),
        recency_score: getRecencyScore(data.lastAt),
        consistency_score: getConsistencyScore(data.firstAt, data.lastAt, data.count),
        first_record_at: data.firstAt,
        last_record_at: data.lastAt,
      }, { onConflict: 'user_id,category' })
  }

  // --- SCENES (situation tags) ---
  const sceneMap = new Map<string, {
    count: number
    restaurants: Set<string>
    categories: Set<string>
    firstAt: string
    lastAt: string
  }>()

  for (const r of records) {
    for (const tag of (r.tags ?? [])) {
      const existing = sceneMap.get(tag)
      if (existing) {
        existing.count++
        if (r.restaurant_id) existing.restaurants.add(r.restaurant_id)
        if (r.category) existing.categories.add(r.category)
        if (r.created_at < existing.firstAt) existing.firstAt = r.created_at
        if (r.created_at > existing.lastAt) existing.lastAt = r.created_at
      } else {
        sceneMap.set(tag, {
          count: 1,
          restaurants: new Set(r.restaurant_id ? [r.restaurant_id] : []),
          categories: new Set(r.category ? [r.category] : []),
          firstAt: r.created_at,
          lastAt: r.created_at,
        })
      }
    }
  }

  for (const [scene, data] of sceneMap) {
    const xp = data.count * XP_PER_RECORD
    const { level, xpToNext } = calculateLevel(xp)

    await supabase
      .from('experience_atlas_scenes')
      .upsert({
        user_id: userId,
        scene,
        record_count: data.count,
        unique_restaurants: data.restaurants.size,
        category_diversity: data.categories.size,
        level,
        xp,
        xp_to_next: xpToNext,
        volume_score: Math.min(data.count / 15, 1),
        diversity_score: Math.min(data.categories.size / 5, 1),
        recency_score: getRecencyScore(data.lastAt),
        consistency_score: getConsistencyScore(data.firstAt, data.lastAt, data.count),
        first_record_at: data.firstAt,
        last_record_at: data.lastAt,
      }, { onConflict: 'user_id,scene' })
  }

  // --- REGIONS ---
  // Region from restaurant address (extract city/district)
  const regionMap = new Map<string, {
    count: number
    restaurants: Set<string>
    firstAt: string
    lastAt: string
  }>()

  // Fetch restaurants for records that have restaurant_id
  const restaurantIds = [...new Set(records.filter(r => r.restaurant_id).map(r => r.restaurant_id!))]
  let restaurantRegions: Record<string, string> = {}

  if (restaurantIds.length > 0) {
    const { data: restaurants } = await supabase
      .from('restaurants')
      .select('id, region')
      .in('id', restaurantIds)

    if (restaurants) {
      restaurantRegions = Object.fromEntries(
        restaurants.map(r => [r.id, r.region ?? ''])
      )
    }
  }

  for (const r of records) {
    const region = r.restaurant_id ? (restaurantRegions[r.restaurant_id] || '') : ''
    if (!region) continue

    const existing = regionMap.get(region)
    if (existing) {
      existing.count++
      if (r.restaurant_id) existing.restaurants.add(r.restaurant_id)
      if (r.created_at < existing.firstAt) existing.firstAt = r.created_at
      if (r.created_at > existing.lastAt) existing.lastAt = r.created_at
    } else {
      regionMap.set(region, {
        count: 1,
        restaurants: new Set(r.restaurant_id ? [r.restaurant_id] : []),
        firstAt: r.created_at,
        lastAt: r.created_at,
      })
    }
  }

  for (const [region, data] of regionMap) {
    const xp = data.count * XP_PER_RECORD
    const { level, xpToNext } = calculateLevel(xp)

    await supabase
      .from('experience_atlas_regions')
      .upsert({
        user_id: userId,
        region,
        record_count: data.count,
        unique_restaurants: data.restaurants.size,
        sub_region_count: 0,
        level,
        xp,
        xp_to_next: xpToNext,
        volume_score: Math.min(data.count / 20, 1),
        diversity_score: Math.min(data.restaurants.size / 10, 1),
        recency_score: getRecencyScore(data.lastAt),
        consistency_score: getConsistencyScore(data.firstAt, data.lastAt, data.count),
        first_record_at: data.firstAt,
        last_record_at: data.lastAt,
      }, { onConflict: 'user_id,region' })
  }
}

async function updateUserStats(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  records: RecordRow[],
) {
  const now = new Date()
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

  const recordsThisWeek = records.filter(r => new Date(r.created_at) >= weekAgo).length
  const recordsThisMonth = records.filter(r => new Date(r.created_at) >= monthAgo).length

  // Completeness average
  const completenessValues = records.map(r => r.completeness_score).filter(v => v > 0)
  const avgCompleteness = completenessValues.length > 0
    ? Math.round(completenessValues.reduce((a, b) => a + b, 0) / completenessValues.length)
    : 0

  // Streak calculation
  const dates = [...new Set(records.map(r =>
    new Date(r.created_at).toISOString().split('T')[0]
  ))].sort().reverse()

  let currentStreak = 0
  const today = now.toISOString().split('T')[0]
  let checkDate = today

  for (const date of dates) {
    if (date === checkDate) {
      currentStreak++
      const prev = new Date(checkDate)
      prev.setDate(prev.getDate() - 1)
      checkDate = prev.toISOString().split('T')[0]
    } else if (date < checkDate) {
      break
    }
  }

  // Level: 1 per 10 records, max 99
  const nyamLevel = Math.min(Math.floor(records.length / 10) + 1, 99)
  const points = records.length * 5

  // Count photos
  const { count: photoCount } = await supabase
    .from('record_photos')
    .select('id', { count: 'exact', head: true })
    .in('record_id', records.map(r => r.id))

  await supabase
    .from('user_stats')
    .update({
      total_records: records.length,
      total_photos: photoCount ?? 0,
      records_this_week: recordsThisWeek,
      records_this_month: recordsThisMonth,
      avg_weekly_frequency: Math.round((recordsThisMonth / 4) * 10) / 10,
      current_streak_days: currentStreak,
      longest_streak_days: currentStreak, // simplified - would need historical data
      avg_completeness: avgCompleteness,
      nyam_level: nyamLevel,
      points,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
}

function getRecencyScore(lastAt: string): number {
  const daysSince = (Date.now() - new Date(lastAt).getTime()) / (1000 * 60 * 60 * 24)
  if (daysSince <= 7) return 1
  if (daysSince <= 30) return 0.7
  if (daysSince <= 90) return 0.4
  return 0.1
}

function getConsistencyScore(firstAt: string, lastAt: string, count: number): number {
  const spanDays = Math.max(
    (new Date(lastAt).getTime() - new Date(firstAt).getTime()) / (1000 * 60 * 60 * 24),
    1
  )
  const frequency = count / (spanDays / 7) // records per week
  if (frequency >= 3) return 1
  if (frequency >= 1) return 0.7
  if (frequency >= 0.5) return 0.4
  return 0.2
}
