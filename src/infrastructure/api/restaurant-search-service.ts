import 'server-only'

import { searchKakaoPlaces, extractCuisineCategory, mapKakaoCuisineCategory } from './kakao-local'
import { searchNaverPlaces, cleanNaverTitle, searchNaverImage } from './naver-search'
import { createAdminClient } from '../supabase/admin'
import type { CuisineCategory } from '@/domain/entities/restaurant'

/** Search params for the combined restaurant search */
export interface RestaurantSearchParams {
  readonly query?: string
  readonly region?: string
  readonly cuisineCategory?: string
  readonly page?: number
  readonly limit?: number
}

/** A normalized restaurant result from external APIs */
export interface ExternalRestaurantResult {
  readonly externalId: string
  readonly source: 'kakao' | 'naver' | 'merged'
  readonly name: string
  readonly address: string
  readonly roadAddress: string
  readonly phone: string
  readonly cuisineCategory: CuisineCategory
  readonly cuisineDetail: string
  readonly latitude: number
  readonly longitude: number
  readonly kakaoMapUrl: string | null
  readonly naverMapUrl: string | null
  readonly naverDescription: string | null
  readonly imageUrl: string | null
}

/**
 * Search restaurants from Kakao + Naver in parallel.
 * Merges results, deduplicates by name+address similarity,
 * and enriches with images.
 */
export async function searchExternalRestaurants(
  params: RestaurantSearchParams,
): Promise<{ results: readonly ExternalRestaurantResult[]; total: number; hasMore: boolean }> {
  const searchQuery = buildSearchQuery(params)
  const naverQuery = params.region
    ? `${params.region} ${searchQuery}`
    : searchQuery

  // Search both APIs in parallel
  const [kakaoResult, naverResult] = await Promise.allSettled([
    searchKakaoPlaces({
      query: searchQuery,
      region: params.region,
      page: params.page ?? 1,
      size: params.limit ?? 15,
    }),
    searchNaverPlaces({
      query: naverQuery,
      display: params.limit ?? 15,
      start: ((params.page ?? 1) - 1) * (params.limit ?? 15) + 1,
    }),
  ])

  const kakaoPlaces = kakaoResult.status === 'fulfilled' ? kakaoResult.value.documents : []
  const naverPlaces = naverResult.status === 'fulfilled' ? naverResult.value.items : []

  if (kakaoPlaces.length === 0 && naverPlaces.length === 0) {
    return { results: [], total: 0, hasMore: false }
  }

  // Build results from Kakao
  const merged: ExternalRestaurantResult[] = kakaoPlaces.map(place => {
    const cuisineRaw = extractCuisineCategory(place.category_name)
    return {
      externalId: `kakao_${place.id}`,
      source: 'kakao' as const,
      name: place.place_name,
      address: place.address_name,
      roadAddress: place.road_address_name,
      phone: place.phone,
      cuisineCategory: mapKakaoCuisineCategory(cuisineRaw) as CuisineCategory,
      cuisineDetail: cuisineRaw,
      latitude: parseFloat(place.y),
      longitude: parseFloat(place.x),
      kakaoMapUrl: place.place_url,
      naverMapUrl: null,
      naverDescription: null,
      imageUrl: null,
    }
  })

  // Merge Naver results — skip duplicates by name similarity
  for (const naverPlace of naverPlaces) {
    const cleanName = cleanNaverTitle(naverPlace.title)
    const duplicate = merged.find(m =>
      m.name === cleanName ||
      m.name.includes(cleanName) ||
      cleanName.includes(m.name)
    )

    if (duplicate) {
      // Enrich existing Kakao entry with Naver data
      const idx = merged.indexOf(duplicate)
      merged[idx] = {
        ...duplicate,
        source: 'merged',
        naverMapUrl: naverPlace.link || null,
        naverDescription: naverPlace.description || null,
      }
    } else {
      // Naver-only result — extract cuisine from category
      const naverCuisine = extractNaverCuisineCategory(naverPlace.category)
      merged.push({
        externalId: `naver_${naverPlace.mapx}_${naverPlace.mapy}`,
        source: 'naver',
        name: cleanName,
        address: naverPlace.address,
        roadAddress: naverPlace.roadAddress,
        phone: naverPlace.telephone,
        cuisineCategory: naverCuisine as CuisineCategory,
        cuisineDetail: naverPlace.category,
        latitude: parseFloat(naverPlace.mapy) / 1e7,
        longitude: parseFloat(naverPlace.mapx) / 1e7,
        kakaoMapUrl: null,
        naverMapUrl: naverPlace.link || null,
        naverDescription: naverPlace.description || null,
        imageUrl: null,
      })
    }
  }

  // Fetch images for top results (limit to avoid rate limits)
  const toFetchImages = merged.slice(0, 8)
  try {
    const imageResults = await Promise.allSettled(
      toFetchImages.map(r => searchNaverImage(r.name, params.region))
    )
    imageResults.forEach((result, idx) => {
      if (result.status === 'fulfilled' && result.value) {
        toFetchImages[idx] = { ...toFetchImages[idx], imageUrl: result.value }
        merged[idx] = toFetchImages[idx]
      }
    })
  } catch {
    // Image fetching is non-critical
  }

  const limit = params.limit ?? 15
  const kakaoTotal = kakaoResult.status === 'fulfilled' ? kakaoResult.value.meta.pageable_count : 0
  const naverTotal = naverResult.status === 'fulfilled' ? naverResult.value.total : 0

  return {
    results: merged.slice(0, limit),
    total: Math.max(kakaoTotal, naverTotal),
    hasMore: merged.length > limit ||
      (kakaoResult.status === 'fulfilled' && !kakaoResult.value.meta.is_end),
  }
}

/** Map Naver category string (e.g., "음식점>한식") to our cuisine type */
function extractNaverCuisineCategory(category: string): string {
  const parts = category.split('>')
  const cuisine = parts.length >= 2 ? parts[1].trim() : '기타'
  return mapKakaoCuisineCategory(cuisine)
}

/**
 * Search and upsert restaurants into Supabase.
 * Returns the restaurant IDs for the upserted records.
 */
export async function searchAndCacheRestaurants(
  params: RestaurantSearchParams,
): Promise<{ restaurantIds: string[]; total: number; hasMore: boolean }> {
  const { results, total, hasMore } = await searchExternalRestaurants(params)

  if (results.length === 0) {
    return { restaurantIds: [], total: 0, hasMore: false }
  }

  const supabase = createAdminClient()
  const restaurantIds: string[] = []

  for (const result of results) {
    // Check if restaurant already exists by name + address (cross-source dedup)
    const address = result.roadAddress || result.address
    const { data: existing } = await supabase
      .from('restaurants')
      .select('id')
      .eq('name', result.name)
      .eq('address', address)
      .maybeSingle()

    if (existing) {
      // Update with any new data from the other source
      await supabase.from('restaurants').update({
        ...(result.kakaoMapUrl && { kakao_map_url: result.kakaoMapUrl }),
        ...(result.naverMapUrl && { naver_map_url: result.naverMapUrl }),
        ...(result.imageUrl && { image_url: result.imageUrl }),
      }).eq('id', existing.id)

      restaurantIds.push(existing.id)
      continue
    }

    // Also check by kakao_map_url if available
    if (result.kakaoMapUrl) {
      const { data: kakaoExisting } = await supabase
        .from('restaurants')
        .select('id')
        .eq('kakao_map_url', result.kakaoMapUrl)
        .maybeSingle()

      if (kakaoExisting) {
        restaurantIds.push(kakaoExisting.id)
        continue
      }
    }

    // Extract short address (구/동 level)
    const shortAddress = extractShortAddress(address)
    const region = extractRegion(result.address)

    // Insert new restaurant
    const { data: inserted, error } = await supabase
      .from('restaurants')
      .insert({
        name: result.name,
        address,
        short_address: shortAddress,
        phone: result.phone || null,
        cuisine: result.cuisineDetail,
        cuisine_category: result.cuisineCategory,
        kakao_map_url: result.kakaoMapUrl,
        naver_map_url: result.naverMapUrl,
        latitude: result.latitude,
        longitude: result.longitude,
        region,
        image_url: result.imageUrl,
        is_active: true,
      })
      .select('id')
      .single()

    if (error) {
      console.error(`Failed to insert restaurant ${result.name}:`, error.message)
      continue
    }

    if (inserted) {
      restaurantIds.push(inserted.id)
    }
  }

  return { restaurantIds, total, hasMore }
}

function buildSearchQuery(params: RestaurantSearchParams): string {
  const parts: string[] = []
  if (params.cuisineCategory) parts.push(params.cuisineCategory)
  if (params.query) parts.push(params.query)
  if (parts.length === 0) parts.push('맛집')
  return parts.join(' ')
}

function extractShortAddress(address: string): string {
  // Extract "구 동" from full address
  const match = address.match(/(\S+[구시군])\s*(\S+[동읍면리로길])/)
  if (match) return `${match[1]} ${match[2]}`
  return address.split(' ').slice(0, 3).join(' ')
}

function extractRegion(address: string): string | null {
  // Map Seoul districts to region names
  const regionMap: Record<string, string> = {
    '강남구': '강남',
    '서초구': '강남',
    '송파구': '잠실',
    '마포구': '홍대',
    '용산구': '이태원',
    '종로구': '종로',
    '중구': '을지로',
    '성동구': '성수',
    '영등포구': '여의도',
    '서대문구': '신촌',
    '강서구': '마곡',
    '관악구': '관악',
  }
  for (const [district, region] of Object.entries(regionMap)) {
    if (address.includes(district)) return region
  }
  return null
}
