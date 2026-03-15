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
  readonly kakaoId: string
  readonly name: string
  readonly address: string
  readonly roadAddress: string
  readonly phone: string
  readonly cuisineCategory: CuisineCategory
  readonly cuisineDetail: string
  readonly latitude: number
  readonly longitude: number
  readonly kakaoMapUrl: string
  readonly naverMapUrl: string | null
  readonly naverDescription: string | null
  readonly imageUrl: string | null
}

/**
 * Search restaurants using Kakao Local API as primary source,
 * enriched with Naver data for additional context.
 */
export async function searchExternalRestaurants(
  params: RestaurantSearchParams,
): Promise<{ results: readonly ExternalRestaurantResult[]; total: number; hasMore: boolean }> {
  const searchQuery = buildSearchQuery(params)

  // Primary search: Kakao Local API
  const kakaoResponse = await searchKakaoPlaces({
    query: searchQuery,
    region: params.region,
    page: params.page ?? 1,
    size: params.limit ?? 15,
  })

  if (kakaoResponse.documents.length === 0) {
    return { results: [], total: 0, hasMore: false }
  }

  // Enrich with Naver data for top results
  const naverDataMap = new Map<string, { description: string; link: string }>()

  // Only enrich first 5 results to avoid rate limits
  const namesToEnrich = kakaoResponse.documents.slice(0, 5)

  try {
    const naverResults = await Promise.allSettled(
      namesToEnrich.map(place =>
        searchNaverPlaces({
          query: `${place.place_name} ${place.road_address_name || place.address_name}`,
          display: 1,
        })
      )
    )

    naverResults.forEach((result, idx) => {
      if (result.status === 'fulfilled' && result.value.items.length > 0) {
        const item = result.value.items[0]
        const cleanName = cleanNaverTitle(item.title)
        // Match by name similarity
        if (cleanName.includes(namesToEnrich[idx].place_name) ||
            namesToEnrich[idx].place_name.includes(cleanName)) {
          naverDataMap.set(namesToEnrich[idx].id, {
            description: item.description,
            link: item.link,
          })
        }
      }
    })
  } catch {
    // Naver enrichment is non-critical; proceed without it
  }

  // Fetch images for top 5 results
  const imageMap = new Map<string, string>()
  try {
    const imageResults = await Promise.allSettled(
      namesToEnrich.map(place =>
        searchNaverImage(place.place_name, params.region)
      )
    )
    imageResults.forEach((result, idx) => {
      if (result.status === 'fulfilled' && result.value) {
        imageMap.set(namesToEnrich[idx].id, result.value)
      }
    })
  } catch {
    // Image fetching is non-critical; proceed without it
  }

  const results: ExternalRestaurantResult[] = kakaoResponse.documents.map(place => {
    const cuisineRaw = extractCuisineCategory(place.category_name)
    const naverData = naverDataMap.get(place.id)

    return {
      kakaoId: place.id,
      name: place.place_name,
      address: place.address_name,
      roadAddress: place.road_address_name,
      phone: place.phone,
      cuisineCategory: mapKakaoCuisineCategory(cuisineRaw) as CuisineCategory,
      cuisineDetail: cuisineRaw,
      latitude: parseFloat(place.y),
      longitude: parseFloat(place.x),
      kakaoMapUrl: place.place_url,
      naverMapUrl: naverData?.link ?? null,
      naverDescription: naverData?.description ?? null,
      imageUrl: imageMap.get(place.id) ?? null,
    }
  })

  return {
    results,
    total: kakaoResponse.meta.pageable_count,
    hasMore: !kakaoResponse.meta.is_end,
  }
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
    // Check if restaurant already exists by kakao_map_url (unique identifier)
    const { data: existing } = await supabase
      .from('restaurants')
      .select('id')
      .eq('kakao_map_url', result.kakaoMapUrl)
      .single()

    if (existing) {
      restaurantIds.push(existing.id)
      continue
    }

    // Extract short address (구/동 level)
    const shortAddress = extractShortAddress(result.roadAddress || result.address)
    const region = extractRegion(result.address)

    // Insert new restaurant
    const { data: inserted, error } = await supabase
      .from('restaurants')
      .insert({
        name: result.name,
        address: result.roadAddress || result.address,
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
